export const DEFAULT_CANONICAL_LOCALE = "en-US" as const;
export const DEFAULT_ROUTE_LOCALE = "en" as const;
export const DEFAULT_LOCALE = DEFAULT_CANONICAL_LOCALE;

export const CANONICAL_LOCALES = [
  "en-US",
  "zh-Hans-CN",
  "de-DE",
  "es-ES",
  "fr-FR",
  "ja-JP",
  "ko-KR",
] as const;

export type CanonicalLocale = (typeof CANONICAL_LOCALES)[number];

export const ROUTE_LOCALES = ["en", "zh", "de", "es", "fr", "ja", "ko"] as const;

export type RouteLocale = (typeof ROUTE_LOCALES)[number];

export type ContentLocale = "en" | "zh";

const CANONICAL_LOCALE_SET = new Set<string>(CANONICAL_LOCALES);

export const LOCALE_ALIASES = {
  en: "en-US",
  "en-US": "en-US",
  en_US: "en-US",
  zh: "zh-Hans-CN",
  "zh-CN": "zh-Hans-CN",
  "zh-Hans": "zh-Hans-CN",
  zh_Hans: "zh-Hans-CN",
  zh_CN: "zh-Hans-CN",
  zh_Hans_CN: "zh-Hans-CN",
  de: "de-DE",
  "de-DE": "de-DE",
  de_DE: "de-DE",
  es: "es-ES",
  "es-ES": "es-ES",
  es_ES: "es-ES",
  fr: "fr-FR",
  "fr-FR": "fr-FR",
  fr_FR: "fr-FR",
  ja: "ja-JP",
  "ja-JP": "ja-JP",
  ja_JP: "ja-JP",
  ko: "ko-KR",
  "ko-KR": "ko-KR",
  ko_KR: "ko-KR",
} as const satisfies Record<string, CanonicalLocale>;

export const MESSAGE_LOCALE_BY_CANONICAL = {
  "en-US": "en",
  "zh-Hans-CN": "zh",
  "de-DE": "de",
  "es-ES": "es",
  "fr-FR": "fr",
  "ja-JP": "ja",
  "ko-KR": "ko",
} as const satisfies Record<CanonicalLocale, RouteLocale>;

export const ROUTE_LOCALE_BY_CANONICAL = {
  "en-US": "en",
  "zh-Hans-CN": "zh",
  "de-DE": "de",
  "es-ES": "es",
  "fr-FR": "fr",
  "ja-JP": "ja",
  "ko-KR": "ko",
} as const satisfies Record<CanonicalLocale, RouteLocale>;

export const HREFLANG_BY_CANONICAL = {
  "en-US": "en-US",
  "zh-Hans-CN": "zh-Hans-CN",
  "de-DE": "de-DE",
  "es-ES": "es-ES",
  "fr-FR": "fr-FR",
  "ja-JP": "ja-JP",
  "ko-KR": "ko-KR",
} as const satisfies Record<CanonicalLocale, string>;

export const OPEN_GRAPH_LOCALE_BY_CANONICAL = {
  "en-US": "en_US",
  "zh-Hans-CN": "zh_Hans_CN",
  "de-DE": "de_DE",
  "es-ES": "es_ES",
  "fr-FR": "fr_FR",
  "ja-JP": "ja_JP",
  "ko-KR": "ko_KR",
} as const satisfies Record<CanonicalLocale, string>;

export function isCanonicalLocale(locale: string): locale is CanonicalLocale {
  return CANONICAL_LOCALE_SET.has(locale);
}

export function canonicalizeLocale(locale: null | string | undefined): CanonicalLocale | undefined {
  if (!locale) {
    return undefined;
  }

  if (isCanonicalLocale(locale)) {
    return locale;
  }

  return LOCALE_ALIASES[locale as keyof typeof LOCALE_ALIASES];
}

export function canonicalizeLocaleOrDefault(
  locale: null | string | undefined,
  fallback: CanonicalLocale = DEFAULT_LOCALE,
): CanonicalLocale {
  return canonicalizeLocale(locale) ?? fallback;
}

export function isSupportedLocale(locale: null | string | undefined): boolean {
  return canonicalizeLocale(locale) !== undefined;
}

export function toMessageLocale(locale: null | string | undefined): RouteLocale {
  return MESSAGE_LOCALE_BY_CANONICAL[canonicalizeLocaleOrDefault(locale)];
}

export function toRouteLocale(locale: null | string | undefined): RouteLocale {
  return ROUTE_LOCALE_BY_CANONICAL[canonicalizeLocaleOrDefault(locale)];
}

export function toHreflang(locale: null | string | undefined): string {
  return HREFLANG_BY_CANONICAL[canonicalizeLocaleOrDefault(locale)];
}

export function toHtmlLang(locale: null | string | undefined): string {
  return HREFLANG_BY_CANONICAL[canonicalizeLocaleOrDefault(locale)];
}

export function toOpenGraphLocale(locale: null | string | undefined): string {
  return OPEN_GRAPH_LOCALE_BY_CANONICAL[canonicalizeLocaleOrDefault(locale)];
}

export function isChineseLocale(locale: null | string | undefined): boolean {
  return canonicalizeLocale(locale) === "zh-Hans-CN";
}

export function toContentLocale(locale: null | string | undefined): ContentLocale {
  return isChineseLocale(locale) ? "zh" : "en";
}

export function toLocaleLabelKey(locale: null | string | undefined): RouteLocale {
  return toRouteLocale(locale);
}
