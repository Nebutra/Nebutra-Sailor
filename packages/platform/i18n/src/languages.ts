/**
 * Product UI languages — global SSOT for message catalogs.
 *
 * Language wheel (not a 7-locale stopgap). Message files:
 *   packages/platform/i18n/locales/<messageKey>.json
 *
 * Chinese follows Unicode CLDR / BCP 47 multi-script rules:
 *   zh-Hans  — Simplified Chinese (CN / SG default)
 *   zh-Hant  — Traditional Chinese (TW / HK / MO default)
 * Bare `zh` is NOT a product message key; it aliases to zh-Hans via locales.ts.
 */

export const PRODUCT_LANGUAGES = [
  "en",
  // Chinese — script-split (CLDR standard); never a single "zh" catalog
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
] as const;

export type ProductLanguage = (typeof PRODUCT_LANGUAGES)[number];

export type CatalogStatus = "shipped" | "planned";

export type ProductLanguageMeta = {
  messageKey: ProductLanguage;
  /** ISO 639 primary language subtag (always "zh" for both Chinese scripts) */
  language: string;
  script?: "Hans" | "Hant";
  /** Default ISO 3166-1 alpha-2 for canonical BCP-47 composition */
  defaultRegion: string;
  endonym: string;
  catalog: CatalogStatus;
  fallbackMessageKey: ProductLanguage;
};

function meta(
  messageKey: ProductLanguage,
  endonym: string,
  defaultRegion: string,
  opts?: {
    language?: string;
    script?: "Hans" | "Hant";
    catalog?: CatalogStatus;
    fallback?: ProductLanguage;
  },
): ProductLanguageMeta {
  const language =
    opts?.language ?? (messageKey.includes("-") ? messageKey.split("-")[0]! : messageKey);
  return {
    messageKey,
    language,
    script: opts?.script,
    defaultRegion,
    endonym,
    catalog: opts?.catalog ?? "shipped",
    fallbackMessageKey: opts?.fallback ?? messageKey,
  };
}

export const PRODUCT_LANGUAGE_META = {
  en: meta("en", "English", "US"),
  "zh-Hans": meta("zh-Hans", "简体中文", "CN", { language: "zh", script: "Hans" }),
  "zh-Hant": meta("zh-Hant", "繁體中文", "TW", { language: "zh", script: "Hant" }),
  de: meta("de", "Deutsch", "DE"),
  es: meta("es", "Español", "ES"),
  fr: meta("fr", "Français", "FR"),
  ja: meta("ja", "日本語", "JP"),
  ko: meta("ko", "한국어", "KR"),
  pt: meta("pt", "Português", "BR"),
  it: meta("it", "Italiano", "IT"),
  nl: meta("nl", "Nederlands", "NL"),
  sv: meta("sv", "Svenska", "SE"),
  da: meta("da", "Dansk", "DK"),
  fi: meta("fi", "Suomi", "FI"),
  no: meta("no", "Norsk", "NO"),
  pl: meta("pl", "Polski", "PL"),
  cs: meta("cs", "Čeština", "CZ"),
  ro: meta("ro", "Română", "RO"),
  hu: meta("hu", "Magyar", "HU"),
  el: meta("el", "Ελληνικά", "GR"),
  ru: meta("ru", "Русский", "RU"),
  uk: meta("uk", "Українська", "UA"),
  tr: meta("tr", "Türkçe", "TR"),
  ar: meta("ar", "العربية", "SA"),
  he: meta("he", "עברית", "IL"),
  fa: meta("fa", "فارسی", "IR"),
  hi: meta("hi", "हिन्दी", "IN"),
  bn: meta("bn", "বাংলা", "BD"),
  ur: meta("ur", "اردو", "PK"),
  th: meta("th", "ไทย", "TH"),
  vi: meta("vi", "Tiếng Việt", "VN"),
  id: meta("id", "Bahasa Indonesia", "ID"),
  ms: meta("ms", "Bahasa Melayu", "MY"),
  sw: meta("sw", "Kiswahili", "KE"),
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

/** Auto-translate targets (everything except English source). */
export function productTranslateTargets(): readonly ProductLanguage[] {
  return PRODUCT_LANGUAGES.filter((id) => id !== "en");
}

/** True for either Chinese script product key. */
export function isChineseProductLanguage(id: null | string | undefined): boolean {
  return id === "zh-Hans" || id === "zh-Hant";
}
