import { describe, expect, it } from "vitest";
import {
  acceptBatchResults,
  chunk,
  chunkByNamespace,
  collectWork,
  createModelPool,
  extractPlaceholders,
  flatten,
  formatGlossaryForPrompt,
  glossaryTermsPresent,
  isHardQuotaError,
  isQuotaOrRateLimitError,
  isSoftRateLimitError,
  namespaceContextLine,
  namespaceOfKey,
  parseTranslateModels,
  placeholdersMatch,
  shouldSkipValue,
  splitBatchForRetry,
  unflatten,
  validateTranslation,
} from "./i18n-translate-helpers.mjs";

describe("shouldSkipValue", () => {
  it("skips empty, placeholder-only, URLs, and pure symbols", () => {
    expect(shouldSkipValue("")).toBe(true);
    expect(shouldSkipValue("{count}")).toBe(true);
    expect(shouldSkipValue("https://nebutra.com")).toBe(true);
    expect(shouldSkipValue("—")).toBe(true);
  });

  it("keeps normal product UI copy including short labels", () => {
    expect(shouldSkipValue("Search")).toBe(false);
    expect(shouldSkipValue("钱包")).toBe(false);
    expect(shouldSkipValue("API Keys")).toBe(false);
  });

  /**
   * `collectWork` retranslates any leaf still identical to English, so a leaf
   * that is *deliberately* untranslated gets picked up on every ordinary run —
   * no `--force` needed. Licence identifiers are the dangerous case: they are
   * legal facts, and the pricing table renders one as a cell value.
   */
  it("skips strings that are nothing but licence identifiers", () => {
    expect(shouldSkipValue("MIT + FSL-1.1-ALv2")).toBe(true);
    expect(shouldSkipValue("Apache-2.0")).toBe(true);
    expect(shouldSkipValue("MIT")).toBe(true);
    // Prose that merely mentions a licence still gets translated.
    expect(shouldSkipValue("Licensed under MIT, converting to Apache-2.0")).toBe(false);
  });
});

describe("licence identifiers survive translation", () => {
  const social = "MIT on npm · FSL-1.1-ALv2 on the repo, converting to Apache-2.0 after two years.";

  it("rejects a translation that mangles a licence identifier", () => {
    const mangled = "MIT auf npm · FSL-1.1 ALv2 im Repo, wechselt nach zwei Jahren zu Apache-2.0.";
    expect(validateTranslation(social, mangled).ok).toBe(false);
  });

  it("accepts a translation that preserves them verbatim", () => {
    const good = "MIT auf npm · FSL-1.1-ALv2 im Repo, wechselt nach zwei Jahren zu Apache-2.0.";
    expect(validateTranslation(social, good).ok).toBe(true);
  });

  it("does not false-positive on words containing a licence acronym", () => {
    // Bare "MIT" is intentionally absent from the glossary: `includes` is a
    // case-sensitive substring test and would fire on "SUBMIT".
    expect(validateTranslation("SUBMIT", "ABSENDEN").ok).toBe(true);
  });
});

describe("flatten / unflatten", () => {
  it("round-trips nested catalogs", () => {
    const src = { chrome: { search: "Search" }, admin: { title: "Admin" } };
    const map = flatten(src);
    expect(map.get("chrome.search")).toBe("Search");
    expect(unflatten(map)).toEqual(src);
  });
});

describe("collectWork", () => {
  it("queues missing and identical-to-English leaves including short labels", () => {
    const en = flatten({ a: "Hello world here", b: "Search", c: "Done" });
    const target = new Map([
      ["a", "Hello world here"],
      ["b", "Search"],
      // c missing
    ]);
    const work = collectWork(en, target, { force: false });
    const keys = work.map(([k]) => k).sort();
    expect(keys).toEqual(["a", "b", "c"]);
  });

  it("skips already-translated leaves when not forced", () => {
    const en = flatten({ a: "Search tools" });
    const target = new Map([["a", "検索ツール"]]);
    expect(collectWork(en, target, { force: false })).toEqual([]);
    expect(collectWork(en, target, { force: true })).toEqual([["a", "Search tools"]]);
  });
});

describe("chunk", () => {
  it("splits into fixed batch sizes", () => {
    expect(chunk([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
  });
});

describe("parseTranslateModels", () => {
  it("parses csv / pipe / whitespace pools", () => {
    expect(
      parseTranslateModels({
        modelsCsv: "sensenova-u1-fast, deepseek-v4-flash | sensenova-6.7-flash-lite",
      }),
    ).toEqual(["sensenova-u1-fast", "deepseek-v4-flash", "sensenova-6.7-flash-lite"]);
  });

  it("falls back to single model then defaults", () => {
    expect(parseTranslateModels({ singleModel: "sensenova-u1-fast" })).toEqual([
      "sensenova-u1-fast",
    ]);
    expect(parseTranslateModels({})).toContain("deepseek-v4-flash");
    expect(parseTranslateModels({})).toContain("sensenova-u1-fast");
  });
});

describe("quota / rate-limit classification", () => {
  it("splits hard quota vs soft 429", () => {
    expect(isHardQuotaError(429, '{"code":"insufficient_quota"}')).toBe(true);
    expect(isSoftRateLimitError(429, '{"code":"insufficient_quota"}')).toBe(false);
    expect(isSoftRateLimitError(429, "too many requests")).toBe(true);
    expect(isQuotaOrRateLimitError(429, "")).toBe(true);
    expect(isQuotaOrRateLimitError(500, "boom")).toBe(false);
  });
});

describe("createModelPool", () => {
  it("round-robins and skips exhausted models", () => {
    const pool = createModelPool(["a", "b", "c"]);
    expect([pool.pick(), pool.pick(), pool.pick()]).toEqual(["a", "b", "c"]);
    pool.markExhausted("b");
    expect(pool.remaining()).toEqual(["a", "c"]);
    // rr continues; after 3 picks, next alive index maps onto [a,c]
    const next = [pool.pick(), pool.pick(), pool.pick()];
    expect(new Set(next)).toEqual(new Set(["a", "c"]));
    expect(next).toHaveLength(3);
    pool.markExhausted("a");
    pool.markExhausted("c");
    expect(pool.pick()).toBeNull();
  });
});

describe("placeholders", () => {
  it("extracts simple ICU and mustache", () => {
    // Sorted lexicographically: "{name}" < "{{url}}"
    expect(extractPlaceholders("Hello {name}, see {{url}}")).toEqual(["{name}", "{{url}}"]);
  });

  it("normalizes nested ICU plural to arg+type signature", () => {
    const src = "{count, plural, one {# item} other {# items}}";
    expect(extractPlaceholders(src)).toEqual(["icu:count:plural"]);
    // Translated branch text is OK as long as count/plural stay
    const zh = "{count, plural, other {# 项}}";
    expect(placeholdersMatch(src, zh)).toBe(true);
  });

  it("matches placeholders multiset-equal", () => {
    expect(placeholdersMatch("Hi {name}", "你好 {name}")).toBe(true);
    expect(placeholdersMatch("Hi {name}", "你好 {user}")).toBe(false);
    expect(placeholdersMatch("a {x} {y}", "b {y} {x}")).toBe(true);
  });
});

describe("glossary + validateTranslation", () => {
  it("requires glossary terms that appear in source", () => {
    expect(glossaryTermsPresent("Use Nebutra API", "使用 Nebutra API")).toBe(true);
    expect(glossaryTermsPresent("Use Nebutra API", "使用云毓接口")).toBe(false);
  });

  it("rejects empty, bad placeholders, dropped glossary", () => {
    expect(validateTranslation("Hi {n}", "").ok).toBe(false);
    expect(validateTranslation("Hi {n}", "你好 {x}").ok).toBe(false);
    expect(validateTranslation("Open Stripe", "打开支付").ok).toBe(false);
    expect(validateTranslation("Open Stripe", "打开 Stripe").ok).toBe(true);
  });
});

describe("acceptBatchResults", () => {
  it("keeps valid leaves and lists rejects", () => {
    const entries = [
      ["nav.title", "Home"],
      ["nav.user", "Hello {name}"],
      ["nav.brand", "Nebutra cloud"],
    ];
    const parsed = {
      "nav.title": "首页",
      "nav.user": "你好 {user}",
      "nav.brand": "云平台",
    };
    const { accepted, rejected } = acceptBatchResults(entries, parsed);
    expect([...accepted.keys()]).toEqual(["nav.title"]);
    expect(rejected.map(([k]) => k).sort()).toEqual(["nav.brand", "nav.user"]);
  });
});

describe("namespace batching", () => {
  it("namespaceOfKey takes first segment", () => {
    expect(namespaceOfKey("nav.title")).toBe("nav");
    expect(namespaceOfKey("solo")).toBe("solo");
  });

  it("chunkByNamespace groups then sizes", () => {
    const work = [
      ["nav.a", "A"],
      ["nav.b", "B"],
      ["nav.c", "C"],
      ["billing.x", "X"],
      ["billing.y", "Y"],
    ];
    const batches = chunkByNamespace(work, 2);
    // billing first alphabetically, then nav
    expect(batches).toEqual([
      [
        ["billing.x", "X"],
        ["billing.y", "Y"],
      ],
      [
        ["nav.a", "A"],
        ["nav.b", "B"],
      ],
      [["nav.c", "C"]],
    ]);
  });

  it("splitBatchForRetry halves until empty for size 1", () => {
    expect(splitBatchForRetry([["a", "1"]])).toEqual([]);
    expect(
      splitBatchForRetry([
        ["a", "1"],
        ["b", "2"],
        ["c", "3"],
      ]),
    ).toEqual([
      [
        ["a", "1"],
        ["b", "2"],
      ],
      [["c", "3"]],
    ]);
  });

  it("namespaceContextLine is stable", () => {
    expect(namespaceContextLine([["nav.a", "x"]])).toContain('namespace "nav"');
    expect(
      namespaceContextLine([
        ["nav.a", "x"],
        ["billing.b", "y"],
      ]),
    ).toContain("billing");
  });

  it("formatGlossaryForPrompt includes core brands", () => {
    expect(formatGlossaryForPrompt()).toContain("Nebutra");
    expect(formatGlossaryForPrompt()).toContain("Stripe");
  });
});
