import { i18n } from "./i18n";

/**
 * Translation-fallback resolution for the docs origin.
 *
 * This origin owns the docs tree, so it is the only place that can answer
 * "does this page exist in language L" without duplicating the tree somewhere
 * else (a generated slug manifest in another app would be a second snapshot to
 * rot). Landing's `/docs/*` rewrite therefore stays dumb: it forwards the path
 * and lets this origin decide between "serve", "serve the default language's
 * copy instead" and "404".
 *
 * Note "serve instead", not "redirect to". This origin is reached through a
 * rewrite, so the visitor's address bar says <site>/docs/<slug> while the app
 * sees /<lang>/<slug>. A redirect emitted from here carries a Location in the
 * app's own path space — `/en/getting-started/installation` — which the browser
 * resolves against the VISITOR's host, landing them on <site>/en/... outside
 * the documentation entirely. Verified: bare /docs answered 307 with exactly
 * that Location. So a miss is answered with content at the requested URL, never
 * with a redirect the rewrite cannot translate back.
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

/**
 * The PUBLIC path for a page, which is not `pathFor`.
 *
 * `i18n.hideLocale` keeps the default language out of the URL, so the default
 * language's public path carries no locale segment at all. A sitemap built from
 * `pathFor` published `<base>/en/<slug>` — a URL the app answers by redirecting
 * away from at best, and that resolves to nothing once `<base>` already ends in
 * the zone's mount path. Every outward-facing URL must come from here.
 */
export function publicPathFor(language: string, slugs: readonly string[]): string {
  const hidden = i18n.hideLocale === "default-locale" && language === i18n.defaultLanguage;
  const segments = hidden ? [...slugs] : [language, ...slugs];
  return segments.length > 0 ? `/${segments.join("/")}` : "";
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
 * Which page `/<lang>` (empty slug) serves. Prefers the requested language's own
 * copy of the entry page and falls back to the default language's, because the
 * entry page is one of the pages the zh tree does not carry yet — the old
 * unconditional `/${lang}/getting-started/installation` made the Chinese docs
 * root a 404.
 */
export function rootFallbackFor(source: PageLookup, lang: string): FallbackPage | undefined {
  const slugs = [...DOCS_ROOT_SLUGS];
  if (source.getPage(slugs, lang)) return { slugs, language: lang };
  if (source.getPage(slugs, i18n.defaultLanguage)) {
    return { slugs, language: i18n.defaultLanguage };
  }
  return undefined;
}

/** The page to serve in place of a miss: which slugs, in which language. */
export interface FallbackPage {
  readonly slugs: string[];
  readonly language: string;
}

/**
 * Which page to SERVE for a `(lang, slug)` miss, or `undefined` when no
 * language has it and 404 is the honest answer.
 *
 * Two recoverable miss shapes:
 *  - `/<lang>` with no slug: the tree has no `index.mdx`, so serve the entry
 *    page — the requested language's copy when it exists, otherwise the default
 *    language's, since the entry page is one the zh tree does not carry.
 *  - a slug this language lacks but the default language has: the zh tree is a
 *    strict subset of en, so serve the English copy rather than 404.
 *
 * The caller renders the returned page at the URL that was requested. It must
 * not redirect there — see the note at the top of this file.
 */
export function fallbackPageFor(
  source: PageLookup,
  slugs: readonly string[] | undefined,
  lang: string,
): FallbackPage | undefined {
  if (!slugs || slugs.length === 0) return rootFallbackFor(source, lang);
  if (lang === i18n.defaultLanguage) return undefined;
  if (!source.getPage([...slugs], i18n.defaultLanguage)) return undefined;
  return { slugs: [...slugs], language: i18n.defaultLanguage };
}
