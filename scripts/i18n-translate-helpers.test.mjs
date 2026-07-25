import { describe, expect, it } from "vitest";
import {
  chunk,
  collectWork,
  flatten,
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
