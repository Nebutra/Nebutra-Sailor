import { describe, expect, it } from "vitest";
import {
  CONTENT_PRIMARY_ROUTE_LOCALES,
  canonicalizeLocale,
  canonicalizeLocaleOrDefault,
  isContentPrimaryRouteLocale,
  isRtlLocale,
  isSimplifiedChineseLocale,
  isSupportedLocale,
  isTraditionalChineseLocale,
  LEGACY_LOCALE_PREFIXES,
  legacyLocalePathRedirect,
  ROUTE_LOCALES,
  toContentLocale,
  toHreflang,
  toHtmlLang,
  toMessageLocale,
  toOpenGraphLocale,
  toRouteLocale,
  toTextDir,
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

  it("marks Arabic / Hebrew / Persian / Urdu as RTL", () => {
    expect(isRtlLocale("ar")).toBe(true);
    expect(isRtlLocale("he-IL")).toBe(true);
    expect(isRtlLocale("fa")).toBe(true);
    expect(isRtlLocale("ur")).toBe(true);
    expect(isRtlLocale("en")).toBe(false);
    expect(toTextDir("ar")).toBe("rtl");
    expect(toTextDir("zh-Hans")).toBe("ltr");
  });
});

describe("content-primary route locales", () => {
  it("derives the route locales whose body content actually exists", () => {
    // Derived from ContentLocale ("en" | "zh") — not a hand list.
    expect([...CONTENT_PRIMARY_ROUTE_LOCALES]).toEqual(["en", "zh-Hans"]);
    expect(isContentPrimaryRouteLocale("en")).toBe(true);
    expect(isContentPrimaryRouteLocale("zh-Hans")).toBe(true);
    expect(isContentPrimaryRouteLocale("zh-Hant")).toBe(false);
    expect(isContentPrimaryRouteLocale("de")).toBe(false);
    expect(isContentPrimaryRouteLocale(undefined)).toBe(false);
  });

  it("is a subset of the route locale wheel", () => {
    for (const locale of CONTENT_PRIMARY_ROUTE_LOCALES) {
      expect(ROUTE_LOCALES).toContain(locale);
    }
  });
});

describe("legacy locale path redirects", () => {
  it("never lists a real route locale as a legacy prefix", () => {
    for (const locale of ROUTE_LOCALES) {
      expect(LEGACY_LOCALE_PREFIXES).not.toContain(locale);
    }
    expect(LEGACY_LOCALE_PREFIXES).toContain("zh");
    expect(LEGACY_LOCALE_PREFIXES).toContain("zh-CN");
    expect(LEGACY_LOCALE_PREFIXES).toContain("zh_TW");
  });

  it("folds legacy prefixes onto their route locale equivalent", () => {
    expect(legacyLocalePathRedirect("/zh")).toBe("/zh-Hans");
    expect(legacyLocalePathRedirect("/zh/docs/cli")).toBe("/zh-Hans/docs/cli");
    expect(legacyLocalePathRedirect("/zh-Hant-HK/pricing")).toBe("/zh-Hant/pricing");
    expect(legacyLocalePathRedirect("/en-US")).toBe("/");
    expect(legacyLocalePathRedirect("/en-US/pricing")).toBe("/pricing");
  });

  it("folds locale prefixes regardless of casing", () => {
    // BCP-47 tags are case-insensitive by specification and arrive from the
    // wild in every casing. An exact-match lookup 404s them instead of
    // redirecting, which is indistinguishable from the page not existing.
    expect(legacyLocalePathRedirect("/ZH-CN/pricing")).toBe("/zh-Hans/pricing");
    expect(legacyLocalePathRedirect("/EN-us")).toBe("/");
    expect(legacyLocalePathRedirect("/Zh-Hant-hk/pricing")).toBe("/zh-Hant/pricing");
    // A route locale in non-canonical casing is not the canonical URL either.
    expect(legacyLocalePathRedirect("/zh-hans/pricing")).toBe("/zh-Hans/pricing");
    expect(legacyLocalePathRedirect("/JA")).toBe("/ja");
    // Still not a locale in any casing.
    expect(legacyLocalePathRedirect("/FEATURES")).toBeNull();
  });

  it("returns null for already-canonical and non-locale paths", () => {
    expect(legacyLocalePathRedirect("/zh-Hans/pricing")).toBeNull();
    expect(legacyLocalePathRedirect("/zh-Hant")).toBeNull();
    expect(legacyLocalePathRedirect("/features")).toBeNull();
    expect(legacyLocalePathRedirect("/")).toBeNull();
  });
});
