import { brand } from "@nebutra/brand/metadata";
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

export function buildHreflangAlternates(baseUrl: string, path: string): Record<string, string> {
  const languages: Record<string, string> = {};

  // Scope-aware: a content-scoped path only advertises the locales whose body
  // content actually exists, so the cluster never claims 32 duplicate pages.
  for (const locale of localesForPath(path)) {
    const hreflang = HREFLANG_BY_LOCALE[locale as Locale] ?? toHreflang(locale);
    languages[hreflang] = canonicalUrlForLocale(baseUrl, locale, path);
  }

  languages["x-default"] = canonicalUrlForLocale(baseUrl, routing.defaultLocale, path);
  return languages;
}

export function getSitelinkCandidateRoutes(): ReadonlyArray<PublicSitelinkCandidateRoute> {
  return PUBLIC_SEO_ROUTES.filter((route): route is PublicSitelinkCandidateRoute =>
    Boolean(route.sitelinkCandidate),
  );
}
