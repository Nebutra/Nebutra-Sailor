import { defineRouting } from "next-intl/routing";

/**
 * Global product locales — aligned with @nebutra/i18n PRODUCT_LANGUAGES.
 * Chinese: zh-Hans (简体) + zh-Hant (繁體) per CLDR multi-script.
 */
export const routing = defineRouting({
  locales: [
    "en",
    "zh-Hans",
    "zh-Hant",
    "de",
    "es",
    "fr",
    "ja",
    "ko",
    "pt",
    "it",
    "nl",
    "sv",
    "da",
    "fi",
    "no",
    "pl",
    "cs",
    "ro",
    "hu",
    "el",
    "ru",
    "uk",
    "tr",
    "ar",
    "he",
    "fa",
    "hi",
    "bn",
    "ur",
    "th",
    "vi",
    "id",
    "ms",
    "sw",
  ],
  defaultLocale: "en",
});
