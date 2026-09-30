/**
 * A handful of pages still branch their own copy on "is this a Chinese
 * reader" rather than reading a translated string per route locale. `siteLang`
 * gives them that one bit. The site itself speaks the full product locale
 * wheel (apps/landing/messages/*.json, next-intl) — this is not a second i18n
 * system, just the en/zh split those pages still hand-roll.
 */
export type SiteLang = "en" | "zh";

/** Every zh-* route locale reads Chinese; everything else reads English. */
export function siteLang(locale: string | undefined): SiteLang {
  return locale?.toLowerCase().startsWith("zh") ? "zh" : "en";
}

/**
 * `siteMap.pages.<key>.title` / `siteMap.sections.<id>.title` / `.is` keys are
 * built at runtime from site-map.ts data (`SitePage.key`, `SectionId`) —
 * src/types/next-intl.d.ts gives every `useTranslations`/`getTranslations`
 * call a per-literal key union, which a computed dotted path can never satisfy.
 * Callers that read the `siteMap` namespace with a dynamic key narrow their
 * translator to this shape once, at the call site: `t as SiteMapTranslator`.
 */
export type SiteMapTranslator = (key: string) => string;
