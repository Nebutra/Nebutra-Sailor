/**
 * Tests for the fuzzy-match primitive.
 *
 * Pure, deterministic subsequence fuzzy matcher with smart-case behaviour,
 * a case-insensitive variant, an ignore-spaces variant, a glob-style wildcard
 * matcher, and a generic ranking helper. No external deps, no I/O, no state.
 *
 * Scoring is asserted by ORDERING (boundary/contiguous > scattered), never by
 * exact magnitudes — the heuristic is documented in fuzzy-match.ts and only its
 * ordering contract is part of the public surface.
 */

import { describe, expect, it } from "vitest";
import {
  matchIndices,
  matchIndicesCaseInsensitive,
  matchIndicesCaseInsensitiveIgnoreSpaces,
  matchWildcardPattern,
  matchWildcardPatternCaseInsensitive,
  rankByFuzzy,
} from "./fuzzy-match.js";

describe("matchIndices — subsequence fuzzy match", () => {
  it("returns ordered indices for a subsequence hit", () => {
    // "foobar": f=0 o=1 o=2 b=3 a=4 r=5 → f@0, b@3, r@5
    const result = matchIndices("foobar", "fbr");
    expect(result).not.toBeNull();
    expect(result?.indices).toEqual([0, 3, 5]);
    // indices must be strictly increasing and point at the matched chars
    expect(result?.indices).toEqual([...(result?.indices ?? [])].sort((a, b) => a - b));
    for (const i of result?.indices ?? []) {
      expect(i).toBeGreaterThanOrEqual(0);
      expect(i).toBeLessThan("foobar".length);
    }
  });

  it("returns null when query is not a subsequence", () => {
    expect(matchIndices("foobar", "xyz")).toBeNull();
    expect(matchIndices("abc", "abcd")).toBeNull();
    // out-of-order chars are not a subsequence
    expect(matchIndices("abc", "ba")).toBeNull();
  });

  it("matches a full exact string", () => {
    const result = matchIndices("hello", "hello");
    expect(result?.indices).toEqual([0, 1, 2, 3, 4]);
  });

  it("treats empty query as matching everything with score 0 and empty indices", () => {
    const result = matchIndices("anything", "");
    expect(result).not.toBeNull();
    expect(result?.indices).toEqual([]);
    expect(result?.score).toBe(0);
  });

  it("empty query matches even empty text", () => {
    const result = matchIndices("", "");
    expect(result?.indices).toEqual([]);
    expect(result?.score).toBe(0);
  });

  it("non-empty query against empty text is null", () => {
    expect(matchIndices("", "a")).toBeNull();
  });

  describe("smart-case", () => {
    it("all-lowercase query matches case-insensitively", () => {
      const result = matchIndices("FooBar", "fb");
      expect(result).not.toBeNull();
      expect(result?.indices).toEqual([0, 3]);
    });

    it("query with an uppercase char matches case-sensitively", () => {
      // 'B' must match an uppercase B; 'foobar' has none → null
      expect(matchIndices("foobar", "B")).toBeNull();
      // but it matches against a real uppercase B
      const result = matchIndices("fooBar", "B");
      expect(result?.indices).toEqual([3]);
    });

    it("mixed-case query: lowercase letters still match insensitively per char? (case-sensitive whole query)", () => {
      // Spec: presence of ANY uppercase makes the WHOLE query case-sensitive.
      // 'Fb' → 'F' needs uppercase F, 'b' needs lowercase b (case-sensitive).
      expect(matchIndices("foobar", "Fb")).toBeNull();
      const result = matchIndices("Foobar", "Fb");
      expect(result?.indices).toEqual([0, 3]);
    });
  });

  describe("boundary / contiguity scoring (ordering only)", () => {
    it("contiguous run outranks a scattered match", () => {
      const contiguous = matchIndices("foobar", "foo");
      const scattered = matchIndices("fxoxox foo", "foo");
      expect(contiguous).not.toBeNull();
      expect(scattered).not.toBeNull();
      expect((contiguous?.score ?? 0) > (scattered?.score ?? 0)).toBe(true);
    });

    it("word-boundary match outranks a mid-word match", () => {
      // "ab" right after a separator vs "ab" buried mid-token
      const boundary = matchIndices("foo/abc", "abc");
      const midword = matchIndices("xabcyyyabc", "abc");
      expect(boundary).not.toBeNull();
      expect(midword).not.toBeNull();
      expect((boundary?.score ?? 0) > (midword?.score ?? 0)).toBe(true);
    });

    it("match at string start outranks a later contiguous match", () => {
      const atStart = matchIndices("abcxxxx", "abc");
      const later = matchIndices("zzzzabc", "abc");
      expect((atStart?.score ?? 0) > (later?.score ?? 0)).toBe(true);
    });

    it("prefers the boundary subsequence when several exist", () => {
      // "fb" can match index 0/1 (mid 'foo bar' f..) or the boundary 'f' of
      // 'foo' + boundary 'b' of 'bar'. Boundary-preferring heuristic should pick
      // the word-start 'f' (0) and word-start 'b' (4).
      const result = matchIndices("foo bar", "fb");
      expect(result?.indices).toEqual([0, 4]);
    });
  });
});

describe("matchIndicesCaseInsensitive", () => {
  it("always ignores case even with uppercase in query", () => {
    // "foobar": f@0, b@3, r@5 — uppercase query, but ci variant folds it.
    const result = matchIndicesCaseInsensitive("foobar", "FBR");
    expect(result?.indices).toEqual([0, 3, 5]);
  });

  it("still returns null for non-subsequence", () => {
    expect(matchIndicesCaseInsensitive("foobar", "zzz")).toBeNull();
  });

  it("empty query → score 0, empty indices", () => {
    const result = matchIndicesCaseInsensitive("abc", "");
    expect(result?.score).toBe(0);
    expect(result?.indices).toEqual([]);
  });
});

describe("matchIndicesCaseInsensitiveIgnoreSpaces", () => {
  it("ignores spaces in query and text but returns original-text indices", () => {
    // text "foo bar" with query "f b" → spaces ignored on both sides.
    const result = matchIndicesCaseInsensitiveIgnoreSpaces("foo bar", "f b");
    expect(result).not.toBeNull();
    // indices must point at original positions of 'f' (0) and 'b' (4),
    // never at the space at index 3.
    expect(result?.indices).toEqual([0, 4]);
    expect(result?.indices).not.toContain(3);
  });

  it("is case-insensitive", () => {
    const result = matchIndicesCaseInsensitiveIgnoreSpaces("Foo Bar", "FB");
    expect(result?.indices).toEqual([0, 4]);
  });

  it("query that is only spaces behaves like empty query", () => {
    const result = matchIndicesCaseInsensitiveIgnoreSpaces("foo bar", "   ");
    expect(result?.score).toBe(0);
    expect(result?.indices).toEqual([]);
  });

  it("returns null when non-space chars are not a subsequence", () => {
    expect(matchIndicesCaseInsensitiveIgnoreSpaces("foo bar", "zq")).toBeNull();
  });

  it("matched index never lands on a skipped space", () => {
    const result = matchIndicesCaseInsensitiveIgnoreSpaces("a b c d", "abcd");
    expect(result?.indices).toEqual([0, 2, 4, 6]);
    for (const i of result?.indices ?? []) {
      expect("a b c d"[i]).not.toBe(" ");
    }
  });
});

describe("matchWildcardPattern — glob-style, anchored full-string", () => {
  it("matches '*' as any run including empty", () => {
    expect(matchWildcardPattern("anything", "*")).toBe(true);
    expect(matchWildcardPattern("", "*")).toBe(true);
    expect(matchWildcardPattern("src/foo.ts", "src/*")).toBe(true);
    expect(matchWildcardPattern("src/", "src/*")).toBe(true);
    expect(matchWildcardPattern("abc", "a*c")).toBe(true);
    expect(matchWildcardPattern("ac", "a*c")).toBe(true);
  });

  it("'?' matches exactly one char", () => {
    expect(matchWildcardPattern("abc", "a?c")).toBe(true);
    expect(matchWildcardPattern("ac", "a?c")).toBe(false);
    expect(matchWildcardPattern("abbc", "a?c")).toBe(false);
  });

  it("char classes [abc] and ranges [a-z]", () => {
    expect(matchWildcardPattern("cat", "[cb]at")).toBe(true);
    expect(matchWildcardPattern("bat", "[cb]at")).toBe(true);
    expect(matchWildcardPattern("rat", "[cb]at")).toBe(false);
    expect(matchWildcardPattern("file9.txt", "file[0-9].txt")).toBe(true);
    expect(matchWildcardPattern("fileA.txt", "file[0-9].txt")).toBe(false);
    expect(matchWildcardPattern("x", "[a-z]")).toBe(true);
    expect(matchWildcardPattern("X", "[a-z]")).toBe(false);
  });

  it("escape with backslash treats metachars literally", () => {
    expect(matchWildcardPattern("a*b", "a\\*b")).toBe(true);
    expect(matchWildcardPattern("axb", "a\\*b")).toBe(false);
    expect(matchWildcardPattern("a?b", "a\\?b")).toBe(true);
    expect(matchWildcardPattern("a[b", "a\\[b")).toBe(true);
  });

  it("is anchored (full-string) — partial does not match", () => {
    expect(matchWildcardPattern("foobar", "foo")).toBe(false);
    expect(matchWildcardPattern("foobar", "foo*")).toBe(true);
    expect(matchWildcardPattern("foobar", "*bar")).toBe(true);
    expect(matchWildcardPattern("foobar", "bar")).toBe(false);
  });

  it("treats '/' as an ordinary char (path-like)", () => {
    expect(matchWildcardPattern("a/b/c", "a/*/c")).toBe(true);
    expect(matchWildcardPattern("a/b/c", "a*c")).toBe(true);
    expect(matchWildcardPattern("a/b/c", "*/*/*")).toBe(true);
  });

  it("is case-sensitive by default; case-insensitive variant ignores case", () => {
    expect(matchWildcardPattern("FOO", "foo")).toBe(false);
    expect(matchWildcardPatternCaseInsensitive("FOO", "foo")).toBe(true);
    expect(matchWildcardPatternCaseInsensitive("FoO.TS", "*.ts")).toBe(true);
    expect(matchWildcardPatternCaseInsensitive("Bat", "[CB]at")).toBe(true);
  });

  it("does not catastrophically backtrack on adversarial '*' input", () => {
    const text = "a".repeat(50);
    const pattern = `${"*".repeat(30)}b`;
    const start = Date.now();
    const matched = matchWildcardPattern(text, pattern);
    expect(matched).toBe(false);
    expect(Date.now() - start).toBeLessThan(1000);
  });
});

describe("rankByFuzzy", () => {
  interface Row {
    id: number;
    label: string;
  }

  const rows: Row[] = [
    { id: 1, label: "foobar" },
    { id: 2, label: "no match here" },
    { id: 3, label: "fxoxoxbar" },
    { id: 4, label: "foo/bar" },
  ];

  it("filters out non-matches", () => {
    const ranked = rankByFuzzy(rows, "fbr", (r) => r.label);
    expect(ranked.every((r) => r.item.id !== 2)).toBe(true);
  });

  it("sorts by score descending", () => {
    const ranked = rankByFuzzy(rows, "fbr", (r) => r.label);
    for (let i = 1; i < ranked.length; i++) {
      expect(ranked[i - 1]!.score).toBeGreaterThanOrEqual(ranked[i]!.score);
    }
  });

  it("returns score + indices alongside the item", () => {
    const ranked = rankByFuzzy(rows, "foo", (r) => r.label);
    const first = ranked[0]!;
    expect(typeof first.score).toBe("number");
    expect(Array.isArray(first.indices)).toBe(true);
    expect(first.indices.length).toBe(3);
  });

  it("is stable for equal scores (preserves input order)", () => {
    const tied: Row[] = [
      { id: 10, label: "abc" },
      { id: 11, label: "abc" },
      { id: 12, label: "abc" },
    ];
    const ranked = rankByFuzzy(tied, "abc", (r) => r.label);
    expect(ranked.map((r) => r.item.id)).toEqual([10, 11, 12]);
  });

  it("does not mutate the input array or its items", () => {
    const input: Row[] = [
      { id: 1, label: "foobar" },
      { id: 2, label: "barbaz" },
    ];
    const snapshot = JSON.parse(JSON.stringify(input));
    rankByFuzzy(input, "bar", (r) => r.label);
    expect(input).toEqual(snapshot);
    expect(input.length).toBe(2);
  });

  it("respects caseInsensitive option", () => {
    const list = [{ id: 1, label: "foobar" }];
    // Query 'fB' has an uppercase → smart-case makes it case-sensitive, so
    // 'B' cannot match lowercase 'b' in 'foobar' → filtered out.
    expect(rankByFuzzy(list, "fB", (r) => r.label).length).toBe(0);
    // With caseInsensitive forced, 'B' folds to 'b' and it matches.
    expect(rankByFuzzy(list, "fB", (r) => r.label, { caseInsensitive: true }).length).toBe(1);
  });

  it("empty query matches all items with score 0", () => {
    const ranked = rankByFuzzy(rows, "", (r) => r.label);
    expect(ranked.length).toBe(rows.length);
    expect(ranked.every((r) => r.score === 0)).toBe(true);
    expect(ranked.every((r) => r.indices.length === 0)).toBe(true);
    // stable order preserved
    expect(ranked.map((r) => r.item.id)).toEqual([1, 2, 3, 4]);
  });
});
