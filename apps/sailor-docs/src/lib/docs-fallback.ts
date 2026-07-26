import { i18n } from "./i18n";

/**
 * Translation-fallback resolution for the docs origin.
 *
 * This origin owns the docs tree, so it is the only place that can answer
 * "does this page exist in language L" without duplicating the tree somewhere
 * else (a generated slug manifest in another app would be a second snapshot to
 * rot). Landing's `/docs/*` 308 therefore stays dumb: it forwards the path and
 * lets this origin decide between "serve", "redirect to the default language"
 * and "404".
 *
 * Every function here takes the page source by parameter rather than importing
 * `@/lib/source`, so the rules are unit-testable without the MDX build output.
 */

/** The subset of the Fumadocs loader these rules need. */
export interface PageLookup {
  getPage(slugs: string[] | undefined, language?: string): unknown;
}

/**
 * The docs tree has no `index.mdx`, so `/<lang>` (host root) has to land on an
 * authored page. Which language serves it is derived — see `rootRedirectFor`.
 */
export const DOCS_ROOT_SLUGS = ["getting-started", "installation"] as const;

export function pathFor(language: string, slugs: readonly string[]): string {
  return slugs.length > 0 ? `/${language}/${slugs.join("/")}` : `/${language}`;
}

/** Languages, in `i18n.languages` order, that actually have this page. */
export function languagesWithPage(source: PageLookup, slugs: readonly string[]): string[] {
  return i18n.languages.filter((language) => Boolean(source.getPage([...slugs], language)));
}

/**
 * The single language an hreflang cluster's `x-default` should point at: the
 * default language when it has the page, otherwise the first language that
 * does. Never an unconditional default-language URL — that publishes a 404 as
 * the x-default for any page the default language happens not to carry.
 */
export function xDefaultLanguage(source: PageLookup, slugs: readonly string[]): string | undefined {
  const available = languagesWithPage(source, slugs);
  if (available.includes(i18n.defaultLanguage)) return i18n.defaultLanguage;
  return available[0];
}

/**
 * Where `/<lang>` (empty slug) should go. Prefers the requested language's own
 * copy of the entry page and falls back to the default language's, because the
 * entry page is one of the pages the zh tree does not carry yet — the old
 * unconditional `/${lang}/getting-started/installation` made the Chinese docs
 * root a 404.
 */
export function rootRedirectFor(source: PageLookup, lang: string): string | undefined {
  const slugs = [...DOCS_ROOT_SLUGS];
  if (source.getPage(slugs, lang)) return pathFor(lang, slugs);
  if (source.getPage(slugs, i18n.defaultLanguage)) return pathFor(i18n.defaultLanguage, slugs);
  return undefined;
}

/**
 * Where a `(lang, slug)` miss should go, or `undefined` when no language has
 * the page and 404 is the honest answer.
 *
 * A missing translation is temporary (the zh tree is a strict subset of en and
 * fills in over time), so callers must use a temporary redirect, never a
 * permanent one.
 */
export function translationFallbackFor(
  source: PageLookup,
  slugs: readonly string[] | undefined,
  lang: string,
): string | undefined {
  if (!slugs || slugs.length === 0) return rootRedirectFor(source, lang);
  if (lang === i18n.defaultLanguage) return undefined;
  if (!source.getPage([...slugs], i18n.defaultLanguage)) return undefined;
  return pathFor(i18n.defaultLanguage, slugs);
}
