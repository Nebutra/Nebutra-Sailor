/**
 * Localized content primitive for marketing data files.
 *
 * Two-tier i18n:
 *   - Shell UI → next-intl catalogs (global PRODUCT_LANGUAGES wheel,
 *     Chinese = zh-Hans + zh-Hant per CLDR)
 *   - Marketing CONTENT decks → LocalizedCopy { en, zh } via pick()
 */

export type LocalizedCopy = { en: string; zh: string };

/**
 * True for any Chinese UI locale tag:
 * - product keys: zh-Hans (简体), zh-Hant (繁體)
 * - legacy bare zh / region tags (zh-CN, zh-TW, …)
 */
export function isZhUiLocale(locale: string): boolean {
  return locale === "zh" || locale.startsWith("zh-") || locale.startsWith("zh_");
}

/** Pick a locale-specific string. Chinese uses the zh deck; others → en. */
export function pick(copy: LocalizedCopy, locale: string): string {
  return isZhUiLocale(locale) ? copy.zh : copy.en;
}
