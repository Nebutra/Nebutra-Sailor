import { describe, expect, it } from "vitest";
import {
  canonicalizeLocale,
  canonicalizeLocaleOrDefault,
  isSimplifiedChineseLocale,
  isSupportedLocale,
  isTraditionalChineseLocale,
  toContentLocale,
  toHreflang,
  toHtmlLang,
  toMessageLocale,
  toOpenGraphLocale,
  toRouteLocale,
} from "./locales";

describe("locale contract", () => {
  it("normalizes compact aliases to canonical BCP-47 locales", () => {
    expect(canonicalizeLocale("en")).toBe("en-US");
    expect(canonicalizeLocale("de")).toBe("de-DE");
    expect(canonicalizeLocale("es")).toBe("es-ES");
    expect(canonicalizeLocale("fr")).toBe("fr-FR");
    expect(canonicalizeLocale("ja")).toBe("ja-JP");
    expect(canonicalizeLocale("ko")).toBe("ko-KR");
    expect(canonicalizeLocale("pt")).toBe("pt-BR");
    expect(canonicalizeLocale("pt-BR")).toBe("pt-BR");
  });

  it("splits Chinese into Hans / Hant per CLDR multi-script rules", () => {
    // Simplified
    expect(canonicalizeLocale("zh")).toBe("zh-Hans-CN");
    expect(canonicalizeLocale("zh-CN")).toBe("zh-Hans-CN");
    expect(canonicalizeLocale("zh-Hans")).toBe("zh-Hans-CN");
    expect(canonicalizeLocale("zh-Hans-CN")).toBe("zh-Hans-CN");
    expect(toMessageLocale("zh")).toBe("zh-Hans");
    expect(toMessageLocale("zh-Hans-CN")).toBe("zh-Hans");
    expect(isSimplifiedChineseLocale("zh-CN")).toBe(true);
    // Traditional
    expect(canonicalizeLocale("zh-TW")).toBe("zh-Hant-TW");
    expect(canonicalizeLocale("zh-HK")).toBe("zh-Hant-TW");
    expect(canonicalizeLocale("zh-Hant")).toBe("zh-Hant-TW");
    expect(toMessageLocale("zh-TW")).toBe("zh-Hant");
    expect(toMessageLocale("zh-Hant-TW")).toBe("zh-Hant");
    expect(isTraditionalChineseLocale("zh-TW")).toBe(true);
  });

  it("keeps route and message storage keys as product language ids", () => {
    expect(toRouteLocale("en-US")).toBe("en");
    expect(toMessageLocale("en-US")).toBe("en");
    expect(toRouteLocale("zh-Hans-CN")).toBe("zh-Hans");
    expect(toMessageLocale("zh-Hans-CN")).toBe("zh-Hans");
    expect(toRouteLocale("zh-Hant-TW")).toBe("zh-Hant");
    expect(toMessageLocale("zh-Hant-TW")).toBe("zh-Hant");
    expect(toRouteLocale("de-DE")).toBe("de");
    expect(toMessageLocale("de-DE")).toBe("de");
  });

  it("uses canonical tags for browser and SEO metadata", () => {
    expect(toHtmlLang("en")).toBe("en-US");
    expect(toHreflang("en")).toBe("en-US");
    expect(toOpenGraphLocale("en")).toBe("en_US");
    expect(toHtmlLang("zh")).toBe("zh-Hans-CN");
    expect(toHreflang("zh")).toBe("zh-Hans-CN");
    expect(toOpenGraphLocale("zh")).toBe("zh_Hans_CN");
    expect(toHtmlLang("zh-TW")).toBe("zh-Hant-TW");
    expect(toOpenGraphLocale("zh-Hant")).toBe("zh_Hant_TW");
    expect(toHtmlLang("ja")).toBe("ja-JP");
    expect(toHreflang("ja")).toBe("ja-JP");
    expect(toOpenGraphLocale("ja")).toBe("ja_JP");
  });

  it("keeps bilingual content APIs on their legacy language keys", () => {
    expect(toContentLocale("zh-Hans-CN")).toBe("zh");
    expect(toContentLocale("zh-Hant-TW")).toBe("zh");
    expect(toContentLocale("de")).toBe("en");
  });

  it("falls back unknown locale inputs to English", () => {
    expect(canonicalizeLocale("xx-YY")).toBeUndefined();
    expect(isSupportedLocale("xx-YY")).toBe(false);
    expect(canonicalizeLocaleOrDefault("xx-YY")).toBe("en-US");
    expect(toRouteLocale("xx-YY")).toBe("en");
  });
});
