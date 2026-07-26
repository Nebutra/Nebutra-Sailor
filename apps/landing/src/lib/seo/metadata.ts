import { brand } from "@nebutra/brand/metadata";
import { toOpenGraphLocale, toRouteLocale } from "@nebutra/i18n/locales";
import type { Metadata } from "next";
import type { routing } from "@/i18n/routing";
import {
  buildHreflangAlternates,
  canonicalUrlForLocale,
  DEFAULT_SITE_URL,
  defaultPublicationSet,
  getSiteUrl,
  isPublishedIn,
  type PublicationSet,
  pathInLocale,
  primaryLocaleFor,
} from "./site-routes";

export { DEFAULT_SITE_URL };

export type SupportedLocale = (typeof routing.locales)[number];

export type OgType = "website" | "article" | "profile";

export interface BuildPageMetadataOptions {
  readonly title: string;
  readonly description: string;
  /** Path beginning with `/`, without locale prefix. */
  readonly path: string;
  readonly locale: SupportedLocale | string;
  /** Absolute URL of the OG image. Defaults to dynamic `/api/og?title=...`. */
  readonly image?: string;
  readonly type?: OgType;
  /** Optional site name override (defaults to "Nebutra"). */
  readonly siteName?: string;
  /** Twitter handle without leading "@" (e.g. "nebutra"). */
  readonly twitterHandle?: string;
  /**
   * Documents this URL is a member of. Defaults to what the route registry
   * implies for `path`. Pass an explicit set when membership is per-item rather
   * than per-pattern: a blog post that exists in one language only, a post pair
   * whose two slugs differ, or an auto-generated detail page that is served but
   * never canonical (`unpublishedSet`).
   */
  readonly publishedIn?: PublicationSet;
  /** ISO timestamp for `og:article:published_time`. Only meaningful with `type: "article"`. */
  readonly publishedTime?: string;
}

function defaultOgImageUrl(baseUrl: string, title: string, subtitle?: string): string {
  const params = new URLSearchParams({ title });
  if (subtitle) params.set("subtitle", subtitle);
  return `${baseUrl}/api/og?${params.toString()}`;
}

/**
 * Build a fully-populated Next.js `Metadata` object for a page.
 *
 * One decision drives everything: is the request locale a **member** of this
 * URL's publication set? Membership is read from the set, never re-derived, so
 * the cluster, the canonical, `og:locale` and `robots` cannot contradict each
 * other the way four independent code paths could.
 *
 * - **member** — self-canonical at its own localized path, full reciprocal
 *   hreflang cluster, indexable.
 * - **non-member of a published set** (a surrogate locale rendering translated
 *   chrome around someone else's body) — `noindex, follow`, canonical at the
 *   primary member, and **no cluster at all**. Emitting a cluster it is not in
 *   would be non-reciprocal, and Google discards a non-reciprocal cluster for
 *   every member, unpairing the real documents too.
 * - **empty set** (served but never canonical) — `noindex, follow`,
 *   self-canonical, no cluster.
 *
 * `og:locale` follows the canonical target rather than the request, so the
 * og:url / og:locale pair always names a document that exists.
 */
export function buildPageMetadata(opts: BuildPageMetadataOptions): Metadata {
  const baseUrl = getSiteUrl();
  const imageUrl = opts.image ?? defaultOgImageUrl(baseUrl, opts.title, opts.description);
  const ogType: OgType = opts.type ?? "website";
  const siteName = opts.siteName ?? brand.name;

  const set = opts.publishedIn ?? defaultPublicationSet(opts.path);
  const routeLocale = toRouteLocale(opts.locale);
  const isMember = isPublishedIn(set, routeLocale);
  const canonicalLocale = primaryLocaleFor(set, routeLocale) ?? routeLocale;

  const canonical = canonicalUrlForLocale(
    baseUrl,
    canonicalLocale,
    pathInLocale(set, canonicalLocale),
  );

  const alternateLocale = isMember
    ? set.locales.filter((locale) => locale !== routeLocale).map(toOpenGraphLocale)
    : [];

  return {
    title: opts.title,
    description: opts.description,
    ...(isMember ? {} : { robots: { index: false, follow: true } }),
    alternates: {
      canonical,
      // A cluster is a claim of mutual membership — only a member may make it.
      ...(isMember ? { languages: buildHreflangAlternates(baseUrl, set) } : {}),
    },
    openGraph: {
      type: ogType,
      title: opts.title,
      description: opts.description,
      url: canonical,
      siteName,
      locale: toOpenGraphLocale(canonicalLocale),
      alternateLocale,
      images: [{ url: imageUrl, width: 1200, height: 630, alt: opts.title }],
      ...(ogType === "article" && opts.publishedTime ? { publishedTime: opts.publishedTime } : {}),
    },
    twitter: {
      card: "summary_large_image",
      title: opts.title,
      description: opts.description,
      images: [imageUrl],
      ...(opts.twitterHandle ? { creator: `@${opts.twitterHandle}` } : {}),
    },
    metadataBase: new URL(baseUrl),
  };
}
