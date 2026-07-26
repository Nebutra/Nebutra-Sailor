import { DEFAULT_ROUTE_LOCALE, toHreflang } from "@nebutra/i18n/locales";
import { routing } from "@/i18n/routing";

/**
 * Canonical origin for this site. Personal domain, not part of brand.domains,
 * so a literal is correct — but it lives in exactly one place and sitemap.ts,
 * robots.ts and json-ld.ts all read it from here, so they cannot drift.
 */
export const BASE_URL = "https://tsekaluk.dev";

/**
 * Publication scope for one URL family on this origin.
 *
 * - `ui`      — the page's chrome and body come from the message catalogs, so
 *               it is a genuine canonical URL in every route locale.
 * - `content` — the page's BODY is authored in one language. Publishing one
 *               variant per route locale of the same English essay is
 *               duplicate content: the others are not canonical URLs and must
 *               not be advertised.
 *
 * `content` resolves to a single-locale publication set here (not
 * CONTENT_PRIMARY_ROUTE_LOCALES) because this origin's long-form content lives
 * in `content/thinking/*.mdx` with no locale directories at all — English only.
 */
export type Scope = "ui" | "content";

const CONTENT_LOCALES: readonly string[] = [DEFAULT_ROUTE_LOCALE];

/** Route locales a path is published in, in `routing.locales` order. */
export function localesForScope(scope: Scope): readonly string[] {
  return scope === "ui" ? routing.locales : CONTENT_LOCALES;
}

export function isPublishedLocale(locale: string, scope: Scope): boolean {
  return localesForScope(scope).includes(locale);
}

/**
 * `localePrefix` is next-intl's default ("always", src/i18n/routing.ts), so the
 * prefix is never dropped — the unprefixed form is a redirect, and a redirect
 * URL must never be published as a canonical or an alternate.
 */
export function urlFor(locale: string, path: string): string {
  return `${BASE_URL}/${locale}${path}`;
}

/**
 * Reciprocal hreflang cluster over the publication set, plus exactly one
 * x-default at the default locale when it is a member (otherwise the first
 * member). Tags come from `toHreflang`, never hand-written strings — the
 * homepage used to emit a bare `zh`, which is not a route locale (CLDR
 * multi-script: zh-Hans / zh-Hant) and which the router cannot resolve.
 *
 * Returns undefined when `locale` is not a member: a cluster the requesting
 * page is not part of is non-reciprocal, and Google discards the annotations
 * for every member of a non-reciprocal cluster.
 */
export function alternatesFor(
  path: string,
  locale: string,
  scope: Scope,
): { languages: Record<string, string> } | undefined {
  const published = localesForScope(scope);
  if (!published.includes(locale)) return undefined;

  const languages: Record<string, string> = {};
  for (const member of published) languages[toHreflang(member)] = urlFor(member, path);

  const xDefault = published.includes(DEFAULT_ROUTE_LOCALE) ? DEFAULT_ROUTE_LOCALE : published[0];
  if (xDefault) languages["x-default"] = urlFor(xDefault, path);

  return { languages };
}

/**
 * Canonical URL: self for a member, the primary member's URL for a non-member
 * (an English-only essay served under another locale canonicalizes to /en/).
 */
export function canonicalFor(path: string, locale: string, scope: Scope): string {
  const published = localesForScope(scope);
  if (published.includes(locale)) return urlFor(locale, path);
  const primary = published.includes(DEFAULT_ROUTE_LOCALE) ? DEFAULT_ROUTE_LOCALE : published[0];
  return urlFor(primary ?? locale, path);
}

/** schema.org `inLanguage` — derived from the publication set, never a literal array. */
export function inLanguageTags(scope: Scope): string[] {
  return localesForScope(scope).map(toHreflang);
}

/**
 * The whole SEO decision for one URL, as a spreadable `Metadata` fragment.
 *
 * Pages spread this instead of hand-writing `alternates`, so canonical, cluster
 * and robots are decided together from the publication set and cannot drift
 * apart. A non-member is `noindex, follow` — without that, rescoping a family
 * to `content` only removes its 33 duplicates from the sitemap while leaving
 * them indexable, self-canonical and internally linked.
 */
export function seoFor(
  path: string,
  locale: string,
  scope: Scope,
): {
  alternates: { canonical: string; languages?: Record<string, string> };
  robots?: { index: false; follow: true };
} {
  const alternates = alternatesFor(path, locale, scope);
  return {
    alternates: { canonical: canonicalFor(path, locale, scope), ...(alternates ?? {}) },
    ...(isPublishedLocale(locale, scope)
      ? {}
      : { robots: { index: false, follow: true } as const }),
  };
}
