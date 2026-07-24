/**
 * Product UI languages — SSOT for message catalogs.
 */
export const PRODUCT_LANGUAGES = [
  "en",
  "zh",
  "de",
  "es",
  "fr",
  "ja",
  "ko",
  "pt",
  "it",
  "nl",
  "sv",
] as const;
export type ProductLanguage = (typeof PRODUCT_LANGUAGES)[number];
export type CatalogStatus = "shipped" | "planned";
export type ProductLanguageMeta = {
  messageKey: ProductLanguage;
  language: string;
  script?: "Hans" | "Hant";
  endonym: string;
  catalog: CatalogStatus;
  fallbackMessageKey: ProductLanguage;
};
export const PRODUCT_LANGUAGE_META = {
  en: {
    messageKey: "en",
    language: "en",
    endonym: "English",
    catalog: "shipped",
    fallbackMessageKey: "en",
  },
  zh: {
    messageKey: "zh",
    language: "zh",
    script: "Hans",
    endonym: "中文",
    catalog: "shipped",
    fallbackMessageKey: "zh",
  },
  de: {
    messageKey: "de",
    language: "de",
    endonym: "Deutsch",
    catalog: "shipped",
    fallbackMessageKey: "de",
  },
  es: {
    messageKey: "es",
    language: "es",
    endonym: "Español",
    catalog: "shipped",
    fallbackMessageKey: "es",
  },
  fr: {
    messageKey: "fr",
    language: "fr",
    endonym: "Français",
    catalog: "shipped",
    fallbackMessageKey: "fr",
  },
  ja: {
    messageKey: "ja",
    language: "ja",
    endonym: "日本語",
    catalog: "shipped",
    fallbackMessageKey: "ja",
  },
  ko: {
    messageKey: "ko",
    language: "ko",
    endonym: "한국어",
    catalog: "shipped",
    fallbackMessageKey: "ko",
  },
  pt: {
    messageKey: "pt",
    language: "pt",
    endonym: "Português",
    catalog: "planned",
    fallbackMessageKey: "en",
  },
  it: {
    messageKey: "it",
    language: "it",
    endonym: "Italiano",
    catalog: "planned",
    fallbackMessageKey: "en",
  },
  nl: {
    messageKey: "nl",
    language: "nl",
    endonym: "Nederlands",
    catalog: "planned",
    fallbackMessageKey: "en",
  },
  sv: {
    messageKey: "sv",
    language: "sv",
    endonym: "Svenska",
    catalog: "planned",
    fallbackMessageKey: "en",
  },
} as const satisfies Record<ProductLanguage, ProductLanguageMeta>;
export const SHIPPED_MESSAGE_LOCALES = PRODUCT_LANGUAGES.filter(
  (id) => PRODUCT_LANGUAGE_META[id].catalog === "shipped",
) as readonly ProductLanguage[];
const SET = new Set<string>(PRODUCT_LANGUAGES);
export function isProductLanguage(v: null | string | undefined): v is ProductLanguage {
  return Boolean(v && SET.has(v));
}
export function getProductLanguageMeta(id: ProductLanguage) {
  return PRODUCT_LANGUAGE_META[id];
}
export function toShippedMessageKey(language: ProductLanguage): ProductLanguage {
  const m = PRODUCT_LANGUAGE_META[language];
  return m.catalog === "shipped" ? m.messageKey : m.fallbackMessageKey;
}
