import { describe, expect, it } from "vitest";
import {
  chunk,
  collectWork,
  createModelPool,
  flatten,
  isHardQuotaError,
  isQuotaOrRateLimitError,
  isSoftRateLimitError,
  parseTranslateModels,
  shouldSkipValue,
  unflatten,
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
