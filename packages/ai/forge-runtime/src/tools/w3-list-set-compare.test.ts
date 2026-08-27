import { describe, expect, it } from "vitest";
import { toolInputJsonSchema } from "../json-schema";
import {
  CASE_FOLD_NOTE,
  compareLists,
  comparisonKey,
  type ListSetCompareResult,
  listSetCompareTool,
  resolveDelimiter,
  unescapeLiteral,
  w3ListSetCompareTools,
} from "./w3-list-set-compare";

function run(input: unknown): ListSetCompareResult {
  const parsed = listSetCompareTool.inputSchema.parse(input);
  return listSetCompareTool.execute(parsed) as ListSetCompareResult;
}

function lines(...items: string[]): string {
  return items.join("\n");
}

describe("list-set-compare · declaration", () => {
  it("declares the Comparator-root contract the brief fixes", () => {
    expect(listSetCompareTool.id).toBe("text/list-set-compare");
    expect(listSetCompareTool.slug).toBe("list-set-compare");
    expect(listSetCompareTool.meterId).toBe("forge.text.list_set_compare");
    expect(listSetCompareTool.sideEffect).toBe("pure");
    expect(listSetCompareTool.roots).toContain("comparator");
    expect(listSetCompareTool.title.zh).not.toBe(listSetCompareTool.title.en);
    expect(listSetCompareTool.description.zh.length).toBeGreaterThan(0);
    expect(listSetCompareTool.seoKeywords.zh.length).toBeGreaterThan(0);
    expect(listSetCompareTool.seoKeywords.en).toContain("compare two lists");
    // Engine metadata names the specs implemented, not an imaginary library.
    expect(listSetCompareTool.engine.upstream).toContain("UAX #15");
    expect(listSetCompareTool.engine.upstream).toContain("ISO 80000-2");
    expect(w3ListSetCompareTools).toEqual([listSetCompareTool]);
  });

  it("exposes a readable JSON Schema for agents (MCP/OpenAPI surface)", () => {
    const schema = toolInputJsonSchema(listSetCompareTool.inputSchema) as {
      properties?: Record<string, unknown>;
    };
    expect(Object.keys(schema.properties ?? {})).toEqual(
      expect.arrayContaining(["listA", "listB", "delimiter", "customDelimiter", "options"]),
    );
  });

  it("is deterministic: identical inputs yield byte-identical JSON (know-how #7)", () => {
    const input = { listA: lines("b", "a", "b"), listB: lines("a", "c") };
    expect(JSON.stringify(run(input))).toBe(JSON.stringify(run(input)));
  });
});

describe("list-set-compare · set math (know-how #6)", () => {
  const result = run({ listA: lines("a", "b", "c"), listB: lines("b", "c", "d") });

  it("computes the five canonical sets with set-theory-precise names", () => {
    expect(result.onlyInA).toEqual(["a"]);
    expect(result.onlyInB).toEqual(["d"]);
    expect(result.intersection).toEqual(["b", "c"]);
    expect(result.union).toEqual(["a", "b", "c", "d"]);
    expect(result.symmetricDifference).toEqual(["a", "d"]);
  });

  it("never emits a bare ambiguous `diff` field", () => {
    expect(Object.keys(result)).not.toContain("diff");
  });

  it("reports counts consistent with the sets", () => {
    expect(result.counts).toMatchObject({
      totalA: 3,
      totalB: 3,
      uniqueA: 3,
      uniqueB: 3,
      onlyInA: 1,
      onlyInB: 1,
      intersection: 2,
      union: 4,
      symmetricDifference: 2,
    });
    // |A ∪ B| = |A only| + |B only| + |A ∩ B|
    expect(result.counts.union).toBe(
      result.counts.onlyInA + result.counts.onlyInB + result.counts.intersection,
    );
    // A ∆ B = (A ∖ B) ∪ (B ∖ A)
    expect(result.symmetricDifference).toEqual([...result.onlyInA, ...result.onlyInB]);
  });

  it("handles an empty list B as 'everything is only in A'", () => {
    const r = run({ listA: lines("a", "b"), listB: "" });
    expect(r.onlyInA).toEqual(["a", "b"]);
    expect(r.intersection).toEqual([]);
    expect(r.union).toEqual(["a", "b"]);
    expect(r.warningCodes).toContain("empty_b");
  });

  it("drops blank segments instead of comparing empty items", () => {
    const r = run({ listA: "a\n\n\nb\n", listB: "b" });
    expect(r.counts.totalA).toBe(2);
    expect(r.parse.a.blankSkipped).toBe(3);
    expect(r.union).toEqual(["a", "b"]);
  });
});

describe("list-set-compare · multiset semantics (know-how #1)", () => {
  it("reports cross-list occurrence counts, not just presence", () => {
    const r = run({ listA: lines("apple", "apple", "apple", "pear"), listB: lines("apple") });
    expect(r.intersection).toEqual(["apple"]);
    expect(r.multiplicities).toEqual([
      { value: "apple", countInA: 3, countInB: 1 },
      { value: "pear", countInA: 1, countInB: 0 },
    ]);
    expect(r.counts.totalA).toBe(4);
    expect(r.counts.uniqueA).toBe(2);
  });

  it("reports within-list duplicates separately from the cross-list question", () => {
    const r = run({ listA: lines("x", "x", "y"), listB: lines("y", "y", "y") });
    expect(r.duplicates.inA).toEqual([{ value: "x", count: 2 }]);
    expect(r.duplicates.inB).toEqual([{ value: "y", count: 3 }]);
  });

  it("bounds the detail tables and says when it truncated", () => {
    const listA = Array.from({ length: 10 }, (_v, i) => `item-${i}`).join("\n");
    const r = run({ listA, listB: "", options: { maxDetail: 3 } });
    expect(r.multiplicities).toHaveLength(3);
    expect(r.multiplicitiesTruncated).toBe(true);
    expect(r.warningCodes).toContain("detail_truncated");
    // The result sets themselves are never capped.
    expect(r.onlyInA).toHaveLength(10);
  });
});

describe("list-set-compare · case axis (know-how #2)", () => {
  it("keeps Apple and apple distinct by default", () => {
    const r = run({ listA: "Apple", listB: "apple" });
    expect(r.intersection).toEqual([]);
    expect(r.symmetricDifference).toEqual(["Apple", "apple"]);
  });

  it("folds case for matching only — output keeps the original spelling", () => {
    const r = run({
      listA: lines("SKU-042", "Beta"),
      listB: lines("sku-042", "gamma"),
      options: { caseSensitive: false },
    });
    expect(r.intersection).toEqual(["SKU-042"]);
    expect(r.union).toEqual(["SKU-042", "Beta", "gamma"]);
    expect(r.onlyInB).toEqual(["gamma"]);
    expect(r.notes).toContain(CASE_FOLD_NOTE);
  });

  it("flags that more than one spelling collapsed into one key", () => {
    const r = run({
      listA: lines("Beta", "beta"),
      listB: "beta",
      options: { caseSensitive: false },
    });
    expect(r.parse.a.foldedVariants).toBe(1);
    expect(r.warningCodes).toContain("folded_variants");
    expect(r.duplicates.inA).toEqual([{ value: "Beta", count: 2 }]);
  });
});

describe("list-set-compare · whitespace axes (know-how #3)", () => {
  it("trim alone does not collapse internal runs", () => {
    const r = run({ listA: "  New York  ", listB: "New  York" });
    expect(r.intersection).toEqual([]);
    expect(r.onlyInA).toEqual(["New York"]);
    expect(r.onlyInB).toEqual(["New  York"]);
  });

  it("collapse is a separate opt-in switch", () => {
    const r = run({
      listA: "New York",
      listB: "New  York",
      options: { collapseInternalWhitespace: true },
    });
    expect(r.intersection).toEqual(["New York"]);
  });

  it("trim can be disabled for exact matching", () => {
    const r = run({ listA: " a", listB: "a", options: { trimWhitespace: false } });
    expect(r.intersection).toEqual([]);
    expect(r.onlyInA).toEqual([" a"]);
  });
});

describe("list-set-compare · leading zeros (know-how #4)", () => {
  it("is off by default: 007 and 7 stay distinct", () => {
    const r = run({ listA: "007", listB: "7" });
    expect(r.intersection).toEqual([]);
    expect(r.symmetricDifference).toEqual(["007", "7"]);
  });

  it("merges digit-only items when explicitly enabled, keeping the padded original", () => {
    const r = run({ listA: "007", listB: "7", options: { ignoreLeadingZeros: true } });
    expect(r.intersection).toEqual(["007"]);
    expect(r.multiplicities).toEqual([{ value: "007", countInA: 1, countInB: 1 }]);
  });

  it("never applies the heuristic to non-numeric codes", () => {
    const r = run({ listA: "SKU-007", listB: "SKU-7", options: { ignoreLeadingZeros: true } });
    expect(r.intersection).toEqual([]);
    expect(
      comparisonKey("SKU-007", {
        caseSensitive: true,
        trimWhitespace: true,
        collapseInternalWhitespace: false,
        ignoreLeadingZeros: true,
        unicodeNormalize: "nfc",
        sort: "original",
        maxDetail: 1000,
      }),
    ).toBe("SKU-007");
  });

  it("keeps all-zero items meaningful (000 folds to 0, not to empty)", () => {
    const r = run({ listA: "000", listB: "0", options: { ignoreLeadingZeros: true } });
    expect(r.intersection).toEqual(["000"]);
  });
});

describe("list-set-compare · Unicode normalization (know-how #5)", () => {
  // "café": U+0063 U+0061 U+0066 U+00E9 (NFC) vs U+0063 U+0061 U+0066 U+0065 U+0301 (NFD).
  const nfc = "caf\u00e9";
  const nfd = "cafe\u0301";

  it("matches precomposed and decomposed forms by default", () => {
    expect(nfc).not.toBe(nfd);
    const r = run({ listA: nfc, listB: nfd });
    expect(r.intersection).toEqual([nfc]);
    expect(r.onlyInB).toEqual([]);
    expect(r.warningCodes).toContain("nfc_normalized");
    expect(r.parse.b.nfcChanged).toBe(1);
  });

  it("reports them as different when normalization is disabled", () => {
    const r = run({ listA: nfc, listB: nfd, options: { unicodeNormalize: "none" } });
    expect(r.intersection).toEqual([]);
    expect(r.counts.union).toBe(2);
    expect(r.warningCodes).not.toContain("nfc_normalized");
  });
});

describe("list-set-compare · ordering (know-how #7)", () => {
  it("defaults to first-seen order: list A, then list-B-only in B order", () => {
    const r = run({ listA: lines("c", "a"), listB: lines("z", "a", "b") });
    expect(r.union).toEqual(["c", "a", "z", "b"]);
    expect(r.onlyInB).toEqual(["z", "b"]);
  });

  it("sorts by UTF-16 code unit, not locale collation", () => {
    // localeCompare would put "a" before "Z"; code-unit order is Z(0x5A) < a(0x61).
    const r = run({ listA: lines("a", "Z"), listB: "", options: { sort: "asc" } });
    expect(r.onlyInA).toEqual(["Z", "a"]);
    const desc = run({ listA: lines("a", "Z"), listB: "", options: { sort: "desc" } });
    expect(desc.onlyInA).toEqual(["a", "Z"]);
  });

  it("byCount ranks by combined occurrences with a stable first-seen tiebreak", () => {
    const r = run({
      listA: lines("rare", "common", "common", "common"),
      listB: lines("common", "mid", "mid"),
      options: { sort: "byCount" },
    });
    expect(r.union).toEqual(["common", "mid", "rare"]);
  });

  it("applies the chosen sort to every result set", () => {
    const r = run({
      listA: lines("b", "a"),
      listB: lines("d", "c", "a"),
      options: { sort: "asc" },
    });
    expect(r.onlyInA).toEqual(["b"]);
    expect(r.onlyInB).toEqual(["c", "d"]);
    expect(r.intersection).toEqual(["a"]);
    expect(r.union).toEqual(["a", "b", "c", "d"]);
    expect(r.symmetricDifference).toEqual(["b", "c", "d"]);
  });
});

describe("list-set-compare · delimiters (know-how #8)", () => {
  it("auto-detects newline first", () => {
    const r = run({ listA: lines("a", "b"), listB: lines("b") });
    expect(r.parse.a.delimiter).toBe("newline");
    expect(resolveDelimiter("a\nb,c", "auto")).toBe("newline");
  });

  it("auto-falls back to comma only when there is no newline", () => {
    const r = run({ listA: "a,b,c", listB: "b" });
    expect(r.parse.a.delimiter).toBe("comma");
    expect(r.onlyInA).toEqual(["a", "c"]);
  });

  it("warns instead of silently returning zero overlap for a mis-split paste", () => {
    const listA = "alpha,bravo,charlie,delta,echo,foxtrot,golf,hotel";
    const r = run({ listA, listB: lines("bravo", "golf"), delimiter: "newline" });
    expect(r.counts.totalA).toBe(1);
    expect(r.warningCodes).toContain("single_item_a");
    expect(r.warnings.join(" ")).toContain("comma");
  });

  it("warns when auto-detect resolved the two panes differently", () => {
    const r = run({ listA: "a,b", listB: lines("a", "b") });
    expect(r.parse.a.delimiter).toBe("comma");
    expect(r.parse.b.delimiter).toBe("newline");
    expect(r.warningCodes).toContain("delimiter_mismatch");
  });

  it("splits on tab when asked", () => {
    const r = run({ listA: "a\tb\tc", listB: "b", delimiter: "tab" });
    expect(r.onlyInA).toEqual(["a", "c"]);
  });

  it("accepts a literal custom delimiter with escape sequences", () => {
    const r = run({ listA: "a|b|c", listB: "b", delimiter: "custom", customDelimiter: "|" });
    expect(r.onlyInA).toEqual(["a", "c"]);
    expect(unescapeLiteral("\\t")).toBe("\t");
    const escaped = run({
      listA: "a\tb",
      listB: "a",
      delimiter: "custom",
      customDelimiter: "\\t",
    });
    expect(escaped.onlyInA).toEqual(["b"]);
  });

  it("treats a custom delimiter as literal text, never as a regular expression", () => {
    // "." would match every character if this were a regex.
    const r = run({ listA: "a.b.c", listB: "b", delimiter: "custom", customDelimiter: "." });
    expect(r.onlyInA).toEqual(["a", "c"]);
  });
});

describe("list-set-compare · schema rejects bad input", () => {
  it("requires customDelimiter when delimiter is custom", () => {
    expect(() =>
      listSetCompareTool.inputSchema.parse({ listA: "a", listB: "b", delimiter: "custom" }),
    ).toThrow();
    expect(() =>
      listSetCompareTool.inputSchema.parse({
        listA: "a",
        listB: "b",
        delimiter: "custom",
        customDelimiter: "",
      }),
    ).toThrow();
  });

  it("never splits a list into its characters when the engine is called directly", () => {
    // The schema refuses this shape, but `compareLists` is exported and the
    // engine is the contract: "".split("") would make every list a pile of
    // letters and quietly answer a different question.
    const direct = compareLists({
      listA: "alpha\nbeta",
      listB: "beta",
      delimiter: "custom",
      options: {},
    } as never);
    expect(direct.onlyInA).toEqual(["alpha"]);
    expect(direct.intersection).toEqual(["beta"]);
  });

  it("rejects an unknown delimiter mode", () => {
    expect(() =>
      listSetCompareTool.inputSchema.parse({ listA: "a", listB: "b", delimiter: "semicolon" }),
    ).toThrow();
  });

  it("rejects a non-string list", () => {
    expect(() => listSetCompareTool.inputSchema.parse({ listA: ["a", "b"], listB: "b" })).toThrow();
  });

  it("rejects an out-of-range maxDetail and an unknown sort", () => {
    expect(() =>
      listSetCompareTool.inputSchema.parse({ listA: "a", options: { maxDetail: -1 } }),
    ).toThrow();
    expect(() =>
      listSetCompareTool.inputSchema.parse({ listA: "a", options: { sort: "random" } }),
    ).toThrow();
  });

  it("applies the documented defaults when options are omitted", () => {
    const r = run({ listA: "a", listB: "a" });
    expect(r.options).toEqual({
      caseSensitive: true,
      trimWhitespace: true,
      collapseInternalWhitespace: false,
      ignoreLeadingZeros: false,
      unicodeNormalize: "nfc",
      sort: "original",
      maxDetail: 1000,
    });
  });

  it("treats two empty lists as an empty comparison, not an error", () => {
    const r = run({});
    expect(r.union).toEqual([]);
    expect(r.warningCodes).toEqual(expect.arrayContaining(["empty_a", "empty_b"]));
  });
});
