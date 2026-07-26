import { brand } from "@nebutra/brand/metadata";
import {
  isContentPrimaryRouteLocale,
  toContentLocale,
  toOpenGraphLocale,
  toRouteLocale,
} from "@nebutra/i18n/locales";
import type { Metadata } from "next";
import type { routing } from "@/i18n/routing";
import { localesForPath, localizationFor } from "./route-registry";
import {
  buildHreflangAlternates,
  canonicalUrlForLocale,
  DEFAULT_SITE_URL,
  getSiteUrl,
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
}

function defaultOgImageUrl(baseUrl: string, title: string, subtitle?: string): string {
  const params = new URLSearchParams({ title });
  if (subtitle) params.set("subtitle", subtitle);
  return `${baseUrl}/api/og?${params.toString()}`;
}

/**
 * Build a fully-populated Next.js `Metadata` object for a page. Four
 * guarantees, all derived from `opts.path` via the SEO route registry so no
 * call site has to know (or can get wrong) the indexing policy:
 *
 * 1. **canonical** — self-canonical for a `ui` path; for a `content` path in a
 *    non-content-primary locale it points at the content-primary URL, because
 *    that locale renders translated chrome around the same body.
 * 2. **hreflang alternates** — one per locale the path may appear in (scope
 *    aware) plus exactly one `x-default` at the default route locale.
 * 3. **openGraph** — `locale` plus `alternateLocale` for every other locale the
 *    path is published in, always via `toOpenGraphLocale` (never hand-built
 *    underscore tags).
 * 4. **robots** — indexability is derived from the route registry, never passed
 *    in: content-scoped pages outside the content-primary locales are
 *    `noindex, follow`.
 */
export function buildPageMetadata(opts: BuildPageMetadataOptions): Metadata {
  const baseUrl = getSiteUrl();
  const languages = buildHreflangAlternates(baseUrl, opts.path);
  const imageUrl = opts.image ?? defaultOgImageUrl(baseUrl, opts.title, opts.description);
  const ogType: OgType = opts.type ?? "website";
  const siteName = opts.siteName ?? brand.name;

  const routeLocale = toRouteLocale(opts.locale);
  const isDuplicateContentLocale =
    localizationFor(opts.path) === "content" && !isContentPrimaryRouteLocale(routeLocale);

  const canonical = isDuplicateContentLocale
    ? canonicalUrlForLocale(baseUrl, toRouteLocale(toContentLocale(opts.locale)), opts.path)
    : canonicalUrlForLocale(baseUrl, opts.locale, opts.path);

  const alternateLocale = localesForPath(opts.path)
    .filter((locale) => locale !== routeLocale)
    .map(toOpenGraphLocale);

  return {
    title: opts.title,
    description: opts.description,
    ...(isDuplicateContentLocale ? { robots: { index: false, follow: true } } : {}),
    alternates: {
      canonical,
      languages,
    },
    openGraph: {
      type: ogType,
      title: opts.title,
      description: opts.description,
      url: canonical,
      siteName,
      locale: toOpenGraphLocale(opts.locale),
      alternateLocale,
      images: [{ url: imageUrl, width: 1200, height: 630, alt: opts.title }],
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
