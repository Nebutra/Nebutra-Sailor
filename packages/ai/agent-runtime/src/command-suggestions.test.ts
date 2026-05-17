import { describe, expect, it } from "vitest";
import {
  classifyMatch,
  dedupeByText,
  type FuzzyMatchFn,
  historyCandidates,
  InMemorySuggestionHistoryStore,
  rankSuggestions,
  recordHistory,
  type SuggestionItem,
} from "./command-suggestions.js";

const T = "tenant_a";

/** Deterministic fake matcher: subsequence with fixed score, recorded indices. */
const fakeFuzzy: FuzzyMatchFn = (text, query) => {
  if (query === "") return null;
  const lowerText = text.toLowerCase();
  const lowerQuery = query.toLowerCase();
  const indices: number[] = [];
  let cursor = 0;
  for (const ch of lowerQuery) {
    const found = lowerText.indexOf(ch, cursor);
    if (found === -1) return null;
    indices.push(found);
    cursor = found + 1;
  }
  return { score: 10, indices };
};

/** Matcher that returns a huge score, used to prove exact/prefix banding wins. */
const hugeScoreFuzzy: FuzzyMatchFn = (text, query) => {
  if (query === "") return null;
  if (text.toLowerCase().includes(query.toLowerCase())) {
    return { score: 1_000_000, indices: [0] };
  }
  return null;
};

const neverFuzzy: FuzzyMatchFn = () => null;

function item(id: string, text: string, overrides: Partial<SuggestionItem> = {}): SuggestionItem {
  return {
    id,
    text,
    type: overrides.type ?? "completion",
    isHistory: overrides.isHistory ?? false,
    detail: overrides.detail,
  };
}

describe("classifyMatch", () => {
  it("returns exact for case-insensitive full equality with the highest band", () => {
    const r = classifyMatch("Deploy", "deploy", fakeFuzzy);
    expect(r.matchType).toBe("exact");
    expect(r.score).toBeGreaterThan(0);
    expect(r.indices).toEqual([0, 1, 2, 3, 4, 5]);
  });

  it("returns prefix when text starts with query (ci) but is not equal", () => {
    const r = classifyMatch("deploy-prod", "deploy", fakeFuzzy);
    expect(r.matchType).toBe("prefix");
    expect(r.indices).toEqual([0, 1, 2, 3, 4, 5]);
  });

  it("delegates to injected fuzzy when neither exact nor prefix", () => {
    const r = classifyMatch("git deploy", "dpl", fakeFuzzy);
    expect(r.matchType).toBe("fuzzy");
    expect(r.score).toBe(10);
    expect(r.indices.length).toBe(3);
  });

  it("returns none when fuzzy returns null", () => {
    const r = classifyMatch("git status", "zzz", neverFuzzy);
    expect(r.matchType).toBe("none");
    expect(r.score).toBe(0);
    expect(r.indices).toEqual([]);
  });

  it("bands exact > prefix > fuzzy regardless of fuzzy magnitude", () => {
    const exact = classifyMatch("deploy", "deploy", hugeScoreFuzzy);
    const prefix = classifyMatch("deploy-prod", "deploy", hugeScoreFuzzy);
    const fuzzy = classifyMatch("xx-deploy", "deploy", hugeScoreFuzzy);
    expect(fuzzy.matchType).toBe("fuzzy");
    expect(fuzzy.score).toBe(1_000_000);
    expect(prefix.score).toBeGreaterThan(fuzzy.score);
    expect(exact.score).toBeGreaterThan(prefix.score);
  });

  it("empty query yields none/0/[]", () => {
    const r = classifyMatch("anything", "", fakeFuzzy);
    expect(r.matchType).toBe("none");
    expect(r.score).toBe(0);
    expect(r.indices).toEqual([]);
  });
});

describe("rankSuggestions", () => {
  it("throws on empty tenantId (fail-closed)", () => {
    expect(() => rankSuggestions("", "q", [], fakeFuzzy)).toThrow();
    expect(() => rankSuggestions("   ", "q", [], fakeFuzzy)).toThrow();
  });

  it("drops 'none' matches when query is non-empty", () => {
    const candidates = [item("1", "deploy"), item("2", "totally-unrelated")];
    const out = rankSuggestions(T, "deploy", candidates, neverFuzzy);
    expect(out.results.map((r) => r.item.id)).toEqual(["1"]);
    expect(out.query).toBe("deploy");
  });

  it("keeps all candidates when query is empty", () => {
    const candidates = [item("1", "alpha"), item("2", "beta")];
    const out = rankSuggestions(T, "", candidates, neverFuzzy);
    expect(out.results.length).toBe(2);
    expect(out.results.every((r) => r.matchType === "none")).toBe(true);
  });

  it("applies history boost when scores tie", () => {
    const candidates = [
      item("plain", "deploy app", { isHistory: false }),
      item("hist", "deploy app", { isHistory: true }),
    ];
    const out = rankSuggestions(T, "deploy", candidates, fakeFuzzy);
    expect(out.results[0]?.item.id).toBe("hist");
  });

  it("shorter text wins when score and history tie", () => {
    const candidates = [
      item("long", "deployment longer", { isHistory: true }),
      item("short", "deploy app", { isHistory: true }),
    ];
    const out = rankSuggestions(T, "deploy", candidates, fakeFuzzy);
    expect(out.results[0]?.item.id).toBe("short");
  });

  it("is stable on full ties (input order preserved)", () => {
    const candidates = [
      item("a", "same text", { isHistory: false }),
      item("b", "same text", { isHistory: false }),
      item("c", "same text", { isHistory: false }),
    ];
    const out = rankSuggestions(T, "same text", candidates, fakeFuzzy);
    expect(out.results.map((r) => r.item.id)).toEqual(["a", "b", "c"]);
  });

  it("caps to opts.limit and defaults to 50", () => {
    const many = Array.from({ length: 80 }, (_, i) => item(String(i), `deploy ${i}`));
    const capped = rankSuggestions(T, "deploy", many, fakeFuzzy, { limit: 5 });
    expect(capped.results.length).toBe(5);
    const def = rankSuggestions(T, "deploy", many, fakeFuzzy);
    expect(def.results.length).toBe(50);
  });

  it("orders exact above prefix above fuzzy", () => {
    const candidates = [
      item("fuzzy", "xx-deploy"),
      item("exact", "deploy"),
      item("prefix", "deploy-prod"),
    ];
    const out = rankSuggestions(T, "deploy", candidates, fakeFuzzy);
    expect(out.results.map((r) => r.item.id)).toEqual(["exact", "prefix", "fuzzy"]);
  });

  it("does not mutate the input candidates array", () => {
    const candidates = [item("2", "beta"), item("1", "alpha")];
    const snapshot = candidates.map((c) => ({ ...c }));
    rankSuggestions(T, "a", candidates, fakeFuzzy);
    expect(candidates).toEqual(snapshot);
  });
});

describe("dedupeByText", () => {
  it("keeps first occurrence per normalized text", () => {
    const out = dedupeByText([
      item("1", "Deploy"),
      item("2", "  deploy "),
      item("3", "DEPLOY"),
      item("4", "other"),
    ]);
    expect(out.map((c) => c.id)).toEqual(["1", "4"]);
  });

  it("prefers the history item even if it comes later", () => {
    const out = dedupeByText([
      item("plain", "deploy", { isHistory: false }),
      item("hist", "DEPLOY", { isHistory: true }),
    ]);
    expect(out.map((c) => c.id)).toEqual(["hist"]);
  });

  it("is otherwise stable", () => {
    const out = dedupeByText([item("a", "one"), item("b", "two"), item("c", "three")]);
    expect(out.map((c) => c.id)).toEqual(["a", "b", "c"]);
  });

  it("does not mutate input", () => {
    const input = [item("1", "x"), item("2", "x")];
    const snapshot = input.map((c) => ({ ...c }));
    dedupeByText(input);
    expect(input).toEqual(snapshot);
  });
});

describe("InMemorySuggestionHistoryStore", () => {
  it("records and reads back most-recent-first", () => {
    const store = new InMemorySuggestionHistoryStore();
    recordHistory(store, T, "first cmd");
    recordHistory(store, T, "second cmd");
    const out = historyCandidates(store, T);
    expect(out.map((c) => c.text)).toEqual(["second cmd", "first cmd"]);
    expect(out.every((c) => c.isHistory && c.type === "history")).toBe(true);
  });

  it("dedupes on re-record and moves the entry to the front", () => {
    const store = new InMemorySuggestionHistoryStore();
    recordHistory(store, T, "a");
    recordHistory(store, T, "b");
    recordHistory(store, T, "a");
    expect(historyCandidates(store, T).map((c) => c.text)).toEqual(["a", "b"]);
  });

  it("evicts oldest beyond the ring cap", () => {
    const store = new InMemorySuggestionHistoryStore(3);
    recordHistory(store, T, "1");
    recordHistory(store, T, "2");
    recordHistory(store, T, "3");
    recordHistory(store, T, "4");
    expect(historyCandidates(store, T).map((c) => c.text)).toEqual(["4", "3", "2"]);
  });

  it("isolates tenants (cross-tenant reads impossible)", () => {
    const store = new InMemorySuggestionHistoryStore();
    recordHistory(store, "tenant_x", "x-secret");
    recordHistory(store, "tenant_y", "y-secret");
    expect(historyCandidates(store, "tenant_x").map((c) => c.text)).toEqual(["x-secret"]);
    expect(historyCandidates(store, "tenant_y").map((c) => c.text)).toEqual(["y-secret"]);
  });

  it("throws on empty tenant for record and read (fail-closed)", () => {
    const store = new InMemorySuggestionHistoryStore();
    expect(() => recordHistory(store, "", "x")).toThrow();
    expect(() => recordHistory(store, "  ", "x")).toThrow();
    expect(() => historyCandidates(store, "")).toThrow();
  });

  it("ignores blank text on record", () => {
    const store = new InMemorySuggestionHistoryStore();
    recordHistory(store, T, "   ");
    expect(historyCandidates(store, T)).toEqual([]);
  });
});
