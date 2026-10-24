/**
 * Which language a public page renders in. No locale-prefixed URLs: a status
 * link is pasted into chats and tickets, and it must open in the reader's
 * language without anyone choosing a path.
 *
 *   1. `?lang=` — an explicit override, honoured for any language we ship.
 *   2. The reader's saved choice (the `ns_lang` cookie the language switch sets).
 *   3. The page's own `locales`, in the operator's order, keeping the first
 *      one the browser's Accept-Language also lists.
 *   4. The page's default (its first locale we ship), else English.
 */

export const SUPPORTED_LOCALES = ["zh-CN", "en"] as const;
export type AppLocale = (typeof SUPPORTED_LOCALES)[number];
export const FALLBACK_LOCALE: AppLocale = "en";
export const LOCALE_COOKIE = "ns_lang";

/** Map any BCP 47 tag onto a locale we ship, or null. All Chinese reads zh-CN. */
export function normalizeLocale(tag: string | null | undefined): AppLocale | null {
  if (!tag) return null;
  const lower = tag.trim().toLowerCase();
  if (!lower) return null;
  if (lower === "zh" || lower.startsWith("zh-") || lower.startsWith("zh_")) return "zh-CN";
  if (lower === "en" || lower.startsWith("en-") || lower.startsWith("en_")) return "en";
  return null;
}

/** Accept-Language tags, best first; q=0 entries are refusals and dropped. */
export function parseAcceptLanguage(header: string | null | undefined): string[] {
  if (!header) return [];
  return header
    .split(",")
    .map((part, index) => {
      const [tag = "", ...params] = part.trim().split(";");
      const q = params
        .map((p) => p.trim())
        .find((p) => p.startsWith("q="))
        ?.slice(2);
      const quality = q === undefined ? 1 : Number(q);
      return { tag: tag.trim(), quality: Number.isFinite(quality) ? quality : 0, index };
    })
    .filter((e) => e.tag && e.tag !== "*" && e.quality > 0)
    .sort((a, b) => b.quality - a.quality || a.index - b.index)
    .map((e) => e.tag);
}

/** The page's locales we can render, in its order, without duplicates. */
export function pageLocales(locales: readonly string[] | null | undefined): AppLocale[] {
  const out: AppLocale[] = [];
  for (const tag of locales ?? []) {
    const n = normalizeLocale(tag);
    if (n && !out.includes(n)) out.push(n);
  }
  return out.length > 0 ? out : [FALLBACK_LOCALE];
}

export function resolveLocale(input: {
  lang?: string | null | undefined;
  cookie?: string | null | undefined;
  acceptLanguage?: string | null | undefined;
  locales?: readonly string[] | null | undefined;
}): AppLocale {
  const override = normalizeLocale(input.lang);
  if (override) return override;
  const saved = normalizeLocale(input.cookie);
  if (saved) return saved;
  const candidates = pageLocales(input.locales);
  const accepted = new Set(
    parseAcceptLanguage(input.acceptLanguage)
      .map(normalizeLocale)
      .filter((l): l is AppLocale => l !== null),
  );
  return candidates.find((l) => accepted.has(l)) ?? (candidates[0] as AppLocale);
}

/**
 * Pick a localized string. `i18n` maps locales other than the page default;
 * `base` is written in the page default. Matching is by our normalized locale
 * so `zh`, `zh-CN` and `zh-Hans` keys all serve a Chinese reader.
 */
export function pickI18n(
  base: string,
  i18n: Record<string, string> | null | undefined,
  locale: AppLocale,
): string {
  if (!i18n) return base;
  if (i18n[locale]) return i18n[locale] as string;
  for (const [tag, value] of Object.entries(i18n)) {
    if (value && normalizeLocale(tag) === locale) return value;
  }
  return base;
}

/** Value for `<html lang>`. */
export function htmlLang(locale: AppLocale): string {
  return locale === "zh-CN" ? "zh-CN" : "en";
}
