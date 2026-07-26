/**
 * Canonical BCP-47 + compact route/message keys.
 *
 * Derived from PRODUCT_LANGUAGES (global wheel). Chinese is script-split:
 *   zh-Hans → zh-Hans-CN (default), zh-Hant → zh-Hant-TW (default)
 * Bare `zh` aliases to zh-Hans for legacy callers.
 */

import {
  isChineseProductLanguage,
  PRODUCT_LANGUAGE_META,
  PRODUCT_LANGUAGES,
  type ProductLanguage,
  SHIPPED_MESSAGE_LOCALES,
} from "./languages";

function composeCanonical(id: ProductLanguage): string {
  const m = PRODUCT_LANGUAGE_META[id];
  if (m.script) return `${m.language}-${m.script}-${m.defaultRegion}`;
  return `${m.language}-${m.defaultRegion}`;
}

export const DEFAULT_CANONICAL_LOCALE = "en-US" as const;
export const DEFAULT_ROUTE_LOCALE = "en" as const;
export const DEFAULT_LOCALE = DEFAULT_CANONICAL_LOCALE;

export const CANONICAL_LOCALES = PRODUCT_LANGUAGES.map(composeCanonical) as unknown as readonly [
  string,
  ...string[],
];

export type CanonicalLocale = (typeof CANONICAL_LOCALES)[number];

export const ROUTE_LOCALES = SHIPPED_MESSAGE_LOCALES as unknown as readonly [
  ProductLanguage,
  ...ProductLanguage[],
];

export type RouteLocale = (typeof ROUTE_LOCALES)[number];

/** Bilingual content APIs (docs/blog) — Hans vs Hant not split there yet. */
export type ContentLocale = "en" | "zh";

const CANONICAL_LOCALE_SET = new Set<string>(CANONICAL_LOCALES);

function buildAliases(): Record<string, string> {
  const out: Record<string, string> = {};
  for (const id of PRODUCT_LANGUAGES) {
    const canonical = composeCanonical(id);
    const m = PRODUCT_LANGUAGE_META[id];
    out[id] = canonical;
    out[canonical] = canonical;
    out[canonical.replace(/-/g, "_")] = canonical;
    out[`${m.language}-${m.defaultRegion}`] = canonical;
    out[`${m.language}_${m.defaultRegion}`] = canonical;
    if (m.script) {
      out[`${m.language}-${m.script}`] = canonical;
      out[`${m.language}_${m.script}`] = canonical;
      out[`${m.language}-${m.script}-${m.defaultRegion}`] = canonical;
      out[`${m.language}_${m.script}_${m.defaultRegion}`] = canonical;
    }
  }

  // ── Chinese aliases (CLDR / legacy) ─────────────────────────
  // Simplified
  out.zh = "zh-Hans-CN";
  out["zh-CN"] = "zh-Hans-CN";
  out.zh_CN = "zh-Hans-CN";
  out["zh-SG"] = "zh-Hans-SG"; // region variant still maps Hans catalog
  out.zh_SG = "zh-Hans-CN"; // message key stays zh-Hans
  // Traditional
  out["zh-TW"] = "zh-Hant-TW";
  out.zh_TW = "zh-Hant-TW";
  out["zh-HK"] = "zh-Hant-HK";
  out.zh_HK = "zh-Hant-TW"; // catalog zh-Hant
  out["zh-MO"] = "zh-Hant-MO";
  out.zh_MO = "zh-Hant-TW";
  out["zh-Hant-HK"] = "zh-Hant-HK";
  out["zh-Hant-MO"] = "zh-Hant-MO";
  out["zh-Hans-SG"] = "zh-Hans-SG";

  // Map extra region tags → nearest product canonical for isCanonicalLocale
  // (not in CANONICAL_LOCALES list but resolve via aliases in canonicalizeLocale)
  return out;
}

export const LOCALE_ALIASES = buildAliases() as Record<string, CanonicalLocale | string>;

/** Region-specific Chinese tags that should still load the correct script catalog. */
const CHINESE_REGION_TO_MESSAGE: Record<string, ProductLanguage> = {
  "zh-Hans-CN": "zh-Hans",
  "zh-Hans-SG": "zh-Hans",
  "zh-Hant-TW": "zh-Hant",
  "zh-Hant-HK": "zh-Hant",
  "zh-Hant-MO": "zh-Hant",
};

function mapByCanonical<T>(fn: (id: ProductLanguage, canonical: string) => T): Record<string, T> {
  const out: Record<string, T> = {};
  for (const id of PRODUCT_LANGUAGES) {
    const canonical = composeCanonical(id);
    out[canonical] = fn(id, canonical);
  }
  // Extra Chinese region tags → same message keys
  for (const [canonical, messageKey] of Object.entries(CHINESE_REGION_TO_MESSAGE)) {
    out[canonical] = fn(messageKey, canonical) as T;
  }
  return out;
}

export const MESSAGE_LOCALE_BY_CANONICAL = mapByCanonical((id) => id) as Record<
  string,
  RouteLocale
>;

export const ROUTE_LOCALE_BY_CANONICAL = MESSAGE_LOCALE_BY_CANONICAL;

export const HREFLANG_BY_CANONICAL = mapByCanonical((_id, canonical) => canonical) as Record<
  string,
  string
>;

export const OPEN_GRAPH_LOCALE_BY_CANONICAL = mapByCanonical((_id, canonical) =>
  canonical.replace(/-/g, "_"),
) as Record<string, string>;

export function isCanonicalLocale(locale: string): locale is CanonicalLocale {
  return CANONICAL_LOCALE_SET.has(locale) || locale in CHINESE_REGION_TO_MESSAGE;
}

export function canonicalizeLocale(locale: null | string | undefined): CanonicalLocale | undefined {
  if (!locale) return undefined;
  if (isCanonicalLocale(locale) && CANONICAL_LOCALE_SET.has(locale)) {
    return locale as CanonicalLocale;
  }
  // Region Chinese tags: normalize to product default canonical for that script
  if (locale in CHINESE_REGION_TO_MESSAGE) {
    const key = CHINESE_REGION_TO_MESSAGE[locale]!;
    return composeCanonical(key) as CanonicalLocale;
  }
  const aliased = LOCALE_ALIASES[locale];
  if (!aliased) return undefined;
  // Alias may point at region tag — fold to product default canonical
  if (aliased in CHINESE_REGION_TO_MESSAGE) {
    return composeCanonical(CHINESE_REGION_TO_MESSAGE[aliased]!) as CanonicalLocale;
  }
  if (CANONICAL_LOCALE_SET.has(aliased)) return aliased as CanonicalLocale;
  return undefined;
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
  const c = canonicalizeLocaleOrDefault(locale);
  return MESSAGE_LOCALE_BY_CANONICAL[c] ?? ("en" as RouteLocale);
}

export function toRouteLocale(locale: null | string | undefined): RouteLocale {
  return toMessageLocale(locale);
}

export function toHreflang(locale: null | string | undefined): string {
  return HREFLANG_BY_CANONICAL[canonicalizeLocaleOrDefault(locale)] ?? "en-US";
}

export function toHtmlLang(locale: null | string | undefined): string {
  return toHreflang(locale);
}

export function toOpenGraphLocale(locale: null | string | undefined): string {
  return OPEN_GRAPH_LOCALE_BY_CANONICAL[canonicalizeLocaleOrDefault(locale)] ?? "en_US";
}

export function isChineseLocale(locale: null | string | undefined): boolean {
  const msg = toMessageLocale(locale);
  return isChineseProductLanguage(msg);
}

export function isSimplifiedChineseLocale(locale: null | string | undefined): boolean {
  return toMessageLocale(locale) === "zh-Hans";
}

export function isTraditionalChineseLocale(locale: null | string | undefined): boolean {
  return toMessageLocale(locale) === "zh-Hant";
}

export function toContentLocale(locale: null | string | undefined): ContentLocale {
  return isChineseLocale(locale) ? "zh" : "en";
}

export function toLocaleLabelKey(locale: null | string | undefined): RouteLocale {
  return toRouteLocale(locale);
}

/** Product message keys that require RTL layout (Arabic, Hebrew, Persian, Urdu). */
const RTL_MESSAGE_KEYS = new Set<ProductLanguage>(["ar", "he", "fa", "ur"]);

export function isRtlLocale(locale: null | string | undefined): boolean {
  return RTL_MESSAGE_KEYS.has(toMessageLocale(locale));
}

/** Value for `<html dir>` — pairs with toHtmlLang(). */
export function toTextDir(locale: null | string | undefined): "ltr" | "rtl" {
  return isRtlLocale(locale) ? "rtl" : "ltr";
}
