import { describe, expect, it } from "vitest";
import {
  normalizeLocale,
  pageLocales,
  parseAcceptLanguage,
  pickI18n,
  resolveLocale,
} from "./locale";

describe("normalizeLocale", () => {
  it("maps every Chinese tag to zh-CN and English tags to en", () => {
    expect(normalizeLocale("zh")).toBe("zh-CN");
    expect(normalizeLocale("zh-Hans-CN")).toBe("zh-CN");
    expect(normalizeLocale("ZH_tw")).toBe("zh-CN");
    expect(normalizeLocale("en-GB")).toBe("en");
    expect(normalizeLocale("fr")).toBeNull();
    expect(normalizeLocale("")).toBeNull();
    expect(normalizeLocale(undefined)).toBeNull();
  });
});

describe("parseAcceptLanguage", () => {
  it("orders by quality, keeps header order on ties, drops q=0 and *", () => {
    expect(parseAcceptLanguage("fr;q=0.9, en;q=0.8, zh-CN, *;q=0.1, de;q=0")).toEqual([
      "zh-CN",
      "fr",
      "en",
    ]);
    expect(parseAcceptLanguage(null)).toEqual([]);
  });
});

describe("resolveLocale", () => {
  it("honours ?lang= for any shipped locale, even one the page does not list", () => {
    expect(resolveLocale({ lang: "zh", locales: ["en"], acceptLanguage: "en" })).toBe("zh-CN");
  });

  it("ignores an unknown ?lang= and falls through", () => {
    expect(resolveLocale({ lang: "fr", locales: ["en", "zh-CN"], acceptLanguage: "zh" })).toBe(
      "zh-CN",
    );
  });

  it("takes the first page locale the browser accepts, in the page's order", () => {
    expect(
      resolveLocale({ locales: ["zh-CN", "en"], acceptLanguage: "en-US,en;q=0.9,zh;q=0.5" }),
    ).toBe("zh-CN");
    expect(resolveLocale({ locales: ["zh-CN", "en"], acceptLanguage: "en-US" })).toBe("en");
  });

  it("falls back to the page default, then English", () => {
    expect(resolveLocale({ locales: ["zh-CN", "en"], acceptLanguage: "ja" })).toBe("zh-CN");
    expect(resolveLocale({ locales: ["ja"], acceptLanguage: null })).toBe("en");
  });

  it("dedupes page locales that normalize to the same language", () => {
    expect(pageLocales(["zh", "zh-CN", "en", "ja"])).toEqual(["zh-CN", "en"]);
  });
});

describe("pickI18n", () => {
  it("uses the exact locale, then any tag of the same language, then the base", () => {
    expect(pickI18n("Down", { "zh-CN": "中断" }, "zh-CN")).toBe("中断");
    expect(pickI18n("Down", { zh: "中断" }, "zh-CN")).toBe("中断");
    expect(pickI18n("Down", { zh: "中断" }, "en")).toBe("Down");
    expect(pickI18n("Down", null, "zh-CN")).toBe("Down");
  });
});
