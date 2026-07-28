import { isChineseLocale } from "@nebutra/i18n/locales";

/** Registry / SEO bilingual fields — zh for Chinese locales, en otherwise. */
export type BilingualFields = { readonly zh: string; readonly en: string };

/**
 * Pick display string from forge-runtime `LocalizedString` style pairs.
 * Shell chrome uses next-intl messages; tool titles/descriptions/SEO stay bilingual here
 * so we do not explode 34 locale JSON files per tool.
 */
export function pickBilingual(locale: string, fields: BilingualFields): string {
  return isChineseLocale(locale) ? fields.zh : fields.en;
}
