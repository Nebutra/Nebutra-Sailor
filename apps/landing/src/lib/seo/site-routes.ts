import { brand } from "@nebutra/brand/metadata";
import { getBrandOrigin } from "@nebutra/brand/metadata-helpers";
import { toHreflang, toRouteLocale } from "@nebutra/i18n/locales";
import { type Locale, routing } from "@/i18n/routing";
import { localesForPath, SEO_ROUTE_REGISTRY } from "./route-registry";

// DEFAULT_SITE_URL is derived from the brand SSOT so a single `pnpm brand:apply`
// propagates the domain change to all SEO surfaces.
// Note: no `as const` — the type is `string` because brand.domains.landing
// is not a compile-time string literal from TypeScript's perspective.
export const DEFAULT_SITE_URL = `https://${brand.domains.landing}`;

/** hreflang map for every product locale (incl. zh-Hans / zh-Hant). */
export const HREFLANG_BY_LOCALE = Object.fromEntries(
  routing.locales.map((locale) => [locale, toHreflang(locale)]),
) as Record<Locale, string>;

export type PublicSeoRoute = {
  readonly path: `/${string}`;
  readonly changeFrequency: "always" | "daily" | "weekly" | "monthly" | "yearly";
  readonly priority: number;
  readonly sitelinkCandidate?: {
    readonly label: string;
  };
};

export type PublicSitelinkCandidateRoute = PublicSeoRoute & {
  readonly sitelinkCandidate: {
    readonly label: string;
  };
};

/**
 * UI-scoped public routes — derived from the SEO route registry so there is
 * exactly one place where a public path and its scope are declared.
 */
export const PUBLIC_SEO_ROUTES: ReadonlyArray<PublicSeoRoute> = SEO_ROUTE_REGISTRY.filter(
  (entry) => entry.localization === "ui",
).map((entry) => ({
  path: entry.pattern,
  changeFrequency: entry.changeFrequency,
  priority: entry.priority,
  ...(entry.sitelinkCandidate ? { sitelinkCandidate: entry.sitelinkCandidate } : {}),
}));

export function getSiteUrl(): string {
  return normalizeBaseUrl(process.env.NEXT_PUBLIC_SITE_URL || DEFAULT_SITE_URL);
}

export function normalizeBaseUrl(baseUrl: string): string {
  return baseUrl.trim().replace(/\/+$/, "") || DEFAULT_SITE_URL;
}

export function normalizeRoutePath(path: string): `/${string}` {
  const withLeadingSlash = path.startsWith("/") ? path : `/${path}`;
  const withoutTrailingSlash = withLeadingSlash.replace(/\/+$/, "");
  return (withoutTrailingSlash || "/") as `/${string}`;
}

export function localizedPathForLocale(locale: Locale | string, path: string): string {
  const normalizedPath = normalizeRoutePath(path);
  const routeLocale = toRouteLocale(locale);
  const prefix = routeLocale === routing.defaultLocale ? "" : `/${routeLocale}`;
  return normalizedPath === "/" ? prefix || "/" : `${prefix}${normalizedPath}`;
}

export function canonicalUrlForLocale(
  baseUrl: string,
  locale: Locale | string,
  path: string,
): string {
  const localizedPath = localizedPathForLocale(locale, path);
  return localizedPath === "/"
    ? normalizeBaseUrl(baseUrl)
    : `${normalizeBaseUrl(baseUrl)}${localizedPath}`;
}

/**
 * The set of documents a URL belongs to — the single value every SEO decision
 * (cluster membership, canonical target, robots, sitemap inclusion) is derived
 * from, so those four can no longer disagree with one another.
 *
 * `locales` is the authoritative membership list. Empty means the path is
 * served but published nowhere (`none` scope, or a thin auto-generated detail
 * page): no cluster, no sitemap entry, `noindex, follow` everywhere.
 *
 * `pathByLocale` exists because a translated document does not always live at
 * the same path: a Chinese blog post has a Chinese slug. A cluster keyed on one
 * path string can only ever fabricate the sibling URL — which is why it must
 * not be the primitive.
 */
export type PublicationSet = {
  /** Unprefixed path used for any member locale without an explicit override. */
  readonly path: `/${string}`;
  /** Route locales this document is published in, in registry order. */
  readonly locales: readonly string[];
  /** Per-route-locale unprefixed path, for families with localized slugs. */
  readonly pathByLocale?: Readonly<Record<string, `/${string}`>>;
};

/** Publication set implied by the route registry alone. */
export function defaultPublicationSet(path: string): PublicationSet {
  const normalized = normalizeRoutePath(path);
  return { path: normalized, locales: localesForPath(normalized) };
}

/** A served-but-never-canonical URL: no cluster, no sitemap, noindex everywhere. */
export function unpublishedSet(path: string): PublicationSet {
  return { path: normalizeRoutePath(path), locales: [] };
}

export function pathInLocale(set: PublicationSet, locale: string): `/${string}` {
  return set.pathByLocale?.[locale] ?? set.path;
}

export function isPublishedIn(set: PublicationSet, routeLocale: string): boolean {
  return set.locales.includes(routeLocale);
}

/**
 * The member locale whose document a request in `routeLocale` should point at.
 * `undefined` when the set has no members — there is nothing to point at, so
 * the caller must stay self-canonical.
 */
export function primaryLocaleFor(set: PublicationSet, routeLocale?: string): string | undefined {
  if (routeLocale && isPublishedIn(set, routeLocale)) return routeLocale;
  if (isPublishedIn(set, routing.defaultLocale)) return routing.defaultLocale;
  return set.locales[0];
}

/**
 * hreflang cluster for a publication set.
 *
 * Only members appear, each at its own localized path, and `x-default` is
 * emitted only when the default locale is itself a member — an x-default at a
 * URL that does not exist is a 404 annotation exactly like a fabricated
 * cluster member.
 *
 * A non-member must not call this: a cluster that omits the page advertising it
 * is non-reciprocal, and Google discards a non-reciprocal cluster for *every*
 * member, so one surrogate locale would unpair the two real documents.
 */
export function buildHreflangAlternates(
  baseUrl: string,
  target: PublicationSet | string,
): Record<string, string> {
  const set = typeof target === "string" ? defaultPublicationSet(target) : target;
  const languages: Record<string, string> = {};

  for (const locale of set.locales) {
    const hreflang = HREFLANG_BY_LOCALE[locale as Locale] ?? toHreflang(locale);
    languages[hreflang] = canonicalUrlForLocale(baseUrl, locale, pathInLocale(set, locale));
  }

  if (isPublishedIn(set, routing.defaultLocale)) {
    languages["x-default"] = canonicalUrlForLocale(
      baseUrl,
      routing.defaultLocale,
      pathInLocale(set, routing.defaultLocale),
    );
  }
  return languages;
}

/**
 * Sitelink candidacy is a navigation claim, not a localization scope, so this
 * reads the registry directly. Filtering `PUBLIC_SEO_ROUTES` would silently
 * drop a nav destination the moment its body stops being UI-translatable —
 * which is exactly what `/blog` is.
 */
export function getSitelinkCandidateRoutes(): ReadonlyArray<PublicSitelinkCandidateRoute> {
  return SEO_ROUTE_REGISTRY.filter(
    (entry) => entry.localization !== "none" && Boolean(entry.sitelinkCandidate),
  ).map((entry) => ({
    path: entry.pattern,
    changeFrequency: entry.changeFrequency,
    priority: entry.priority,
    sitelinkCandidate: entry.sitelinkCandidate as { readonly label: string },
  }));
}

/** Same-origin sitelinks plus the public Forge station (follow discovery). */
export function getPublicNavigationItems(): ReadonlyArray<{
  readonly name: string;
  readonly url: string;
}> {
  return [
    ...getSitelinkCandidateRoutes().map((route) => ({
      name: route.sitelinkCandidate.label,
      url: canonicalUrlForLocale(getSiteUrl(), routing.defaultLocale, route.path),
    })),
    { name: "Forge", url: getBrandOrigin("forge") },
  ];
}
