import { describe, expect, it } from "vitest";
import {
  canonicalizeLocale,
  canonicalizeLocaleOrDefault,
  isSupportedLocale,
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
  });

  it("normalizes Chinese aliases to the canonical BCP-47 locale", () => {
    expect(canonicalizeLocale("zh")).toBe("zh-Hans-CN");
    expect(canonicalizeLocale("zh-CN")).toBe("zh-Hans-CN");
    expect(canonicalizeLocale("zh-Hans")).toBe("zh-Hans-CN");
    expect(canonicalizeLocale("zh-Hans-CN")).toBe("zh-Hans-CN");
  });

  it("keeps route and message storage keys compact for compatibility", () => {
    expect(toRouteLocale("en-US")).toBe("en");
    expect(toMessageLocale("en-US")).toBe("en");
    expect(toRouteLocale("zh-Hans-CN")).toBe("zh");
    expect(toMessageLocale("zh-Hans-CN")).toBe("zh");
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
    expect(toHtmlLang("ja")).toBe("ja-JP");
    expect(toHreflang("ja")).toBe("ja-JP");
    expect(toOpenGraphLocale("ja")).toBe("ja_JP");
  });

  it("keeps bilingual content APIs on their legacy language keys", () => {
    expect(toContentLocale("zh-Hans-CN")).toBe("zh");
    expect(toContentLocale("de")).toBe("en");
  });

  it("falls back unknown locale inputs to English", () => {
    expect(canonicalizeLocale("pt-BR")).toBeUndefined();
    expect(isSupportedLocale("pt-BR")).toBe(false);
    expect(canonicalizeLocaleOrDefault("pt-BR")).toBe("en-US");
    expect(toRouteLocale("pt-BR")).toBe("en");
  });
});
