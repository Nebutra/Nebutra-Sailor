/**
 * Localized content primitive for marketing data files.
 *
 * The site's i18n architecture is two-tier:
 *   - Persistent shell (nav, footer, forms) → next-intl message catalogs,
 *     fully translated across all 7 routing locales.
 *   - Marketing CONTENT (solutions, packages, capabilities, playbook, …) →
 *     authored inline as `LocalizedCopy` and resolved with `pick()`.
 *
 * Content is authored in English and Chinese only. The other five routing
 * locales (ja, ko, es, fr, de) intentionally fall back to English here until
 * a localized copy deck exists — this keeps the data files authorable by the
 * core team without blocking the 7-locale routing surface. `pick()` is the
 * single place that fallback decision lives, so widening locale coverage later
 * is a one-file change.
 */

export type LocalizedCopy = { en: string; zh: string };

/** Pick a locale-specific string. Only `zh` diverges; every other locale
 *  falls back to English (see module doc). */
export function pick(copy: LocalizedCopy, locale: string): string {
  return locale === "zh" ? copy.zh : copy.en;
}
