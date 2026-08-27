import { describe, expect, it } from "vitest";
import {
  isChineseProductLanguage,
  isProductLanguage,
  PRODUCT_LANGUAGE_META,
  PRODUCT_LANGUAGES,
  productTranslateTargets,
  SHIPPED_MESSAGE_LOCALES,
  toShippedMessageKey,
} from "./languages";
import { ROUTE_LOCALES, toMessageLocale } from "./locales";
import { PRODUCT_MESSAGE_LOCALES } from "./product-locales.generated";

describe("PRODUCT_LANGUAGES wheel SSOT", () => {
  it("is a global wheel (not a 7-locale stopgap)", () => {
    expect(PRODUCT_LANGUAGES.length).toBeGreaterThanOrEqual(30);
    expect(PRODUCT_LANGUAGES).toContain("en");
    expect(PRODUCT_LANGUAGES).toContain("ja");
    expect(PRODUCT_LANGUAGES).toContain("ar");
    expect(PRODUCT_LANGUAGES).toContain("sw");
  });

  it("splits Chinese into CLDR script keys only (no bare zh catalog key)", () => {
    expect(PRODUCT_LANGUAGES).toContain("zh-Hans");
    expect(PRODUCT_LANGUAGES).toContain("zh-Hant");
    expect(PRODUCT_LANGUAGES.includes("zh" as never)).toBe(false);
    expect(isProductLanguage("zh")).toBe(false);
    expect(isChineseProductLanguage("zh-Hans")).toBe(true);
    expect(isChineseProductLanguage("zh-Hant")).toBe(true);
    expect(isChineseProductLanguage("zh")).toBe(false);
    expect(PRODUCT_LANGUAGE_META["zh-Hans"].script).toBe("Hans");
    expect(PRODUCT_LANGUAGE_META["zh-Hant"].script).toBe("Hant");
    expect(PRODUCT_LANGUAGE_META["zh-Hans"].endonym).toBe("简体中文");
    expect(PRODUCT_LANGUAGE_META["zh-Hant"].endonym).toBe("繁體中文");
  });

  it("ships every product language as a message catalog key", () => {
    expect([...SHIPPED_MESSAGE_LOCALES].sort()).toEqual([...PRODUCT_LANGUAGES].sort());
    expect([...ROUTE_LOCALES].sort()).toEqual([...PRODUCT_LANGUAGES].sort());
    for (const id of PRODUCT_LANGUAGES) {
      expect(toShippedMessageKey(id)).toBe(id);
      expect(PRODUCT_LANGUAGE_META[id].catalog).toBe("shipped");
    }
  });

  it("aliases bare zh / regional tags to Hans/Hant message keys", () => {
    expect(toMessageLocale("zh")).toBe("zh-Hans");
    expect(toMessageLocale("zh-CN")).toBe("zh-Hans");
    expect(toMessageLocale("zh-SG")).toBe("zh-Hans");
    expect(toMessageLocale("zh-TW")).toBe("zh-Hant");
    expect(toMessageLocale("zh-HK")).toBe("zh-Hant");
  });

  it("lists every non-English language as a translate target", () => {
    const targets = productTranslateTargets();
    expect(targets).not.toContain("en");
    expect(targets).toContain("zh-Hans");
    expect(targets).toContain("zh-Hant");
    expect(targets.length).toBe(PRODUCT_LANGUAGES.length - 1);
  });

  it("keeps generated PRODUCT_MESSAGE_LOCALES free of bare zh", () => {
    expect(PRODUCT_MESSAGE_LOCALES.includes("zh" as never)).toBe(false);
    expect(PRODUCT_MESSAGE_LOCALES).toContain("zh-Hans");
    expect(PRODUCT_MESSAGE_LOCALES).toContain("zh-Hant");
    expect(PRODUCT_MESSAGE_LOCALES).toContain("en");
  });
});
