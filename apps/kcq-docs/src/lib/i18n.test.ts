import { describe, expect, it } from "vitest";
import { PUBLIC_LOCALES } from "../../../kcq/src/public/routes";
import { docsPath, LOCALES, switchLanguage } from "./i18n";

describe("docs locales", () => {
  it("use the public pages' prefixes and hreflang values", () => {
    for (const lang of ["en", "zh"] as const) {
      expect(LOCALES[lang].prefix).toBe(PUBLIC_LOCALES[lang].prefix);
      expect(LOCALES[lang].hreflang).toBe(PUBLIC_LOCALES[lang].hreflang);
      expect(LOCALES[lang].htmlLang).toBe(PUBLIC_LOCALES[lang].htmlLang);
    }
  });

  it("map a page to its twin in the other language", () => {
    expect(docsPath("en")).toBe("/docs");
    expect(docsPath("zh", ["guides", "themes"])).toBe("/zh/docs/guides/themes");
    expect(switchLanguage("/docs/guides/themes", "zh")).toBe("/zh/docs/guides/themes");
    expect(switchLanguage("/zh/docs", "en")).toBe("/docs");
  });
});
