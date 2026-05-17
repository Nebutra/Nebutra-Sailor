import { type Locale, routing } from "@/i18n/routing";

export const DEFAULT_SITE_URL = "https://nebutra.com" as const;

export const HREFLANG_BY_LOCALE = {
  en: "en",
  zh: "zh-Hans",
  ja: "ja",
  ko: "ko",
  es: "es",
  fr: "fr",
  de: "de",
} as const satisfies Record<Locale, string>;

export type PublicSeoRoute = {
  readonly path: `/${string}`;
  readonly changeFrequency: "always" | "daily" | "weekly" | "monthly" | "yearly";
  readonly priority: number;
  readonly sitelinkCandidate?: true;
};

export const PUBLIC_SEO_ROUTES: ReadonlyArray<PublicSeoRoute> = [
  { path: "/", changeFrequency: "weekly", priority: 1.0, sitelinkCandidate: true },
  { path: "/features", changeFrequency: "weekly", priority: 0.9, sitelinkCandidate: true },
  { path: "/pricing", changeFrequency: "weekly", priority: 0.9, sitelinkCandidate: true },
  { path: "/get-license", changeFrequency: "weekly", priority: 0.9, sitelinkCandidate: true },
  { path: "/licensing", changeFrequency: "monthly", priority: 0.8, sitelinkCandidate: true },
  { path: "/ai/models", changeFrequency: "monthly", priority: 0.8, sitelinkCandidate: true },
  { path: "/blog", changeFrequency: "weekly", priority: 0.8, sitelinkCandidate: true },
  { path: "/changelog", changeFrequency: "weekly", priority: 0.7, sitelinkCandidate: true },
  { path: "/roadmap", changeFrequency: "monthly", priority: 0.6, sitelinkCandidate: true },
  { path: "/status", changeFrequency: "always", priority: 0.6, sitelinkCandidate: true },
  { path: "/security", changeFrequency: "monthly", priority: 0.7, sitelinkCandidate: true },
  { path: "/about", changeFrequency: "monthly", priority: 0.7, sitelinkCandidate: true },
  { path: "/careers", changeFrequency: "weekly", priority: 0.6 },
  { path: "/ideas", changeFrequency: "weekly", priority: 0.6 },
  { path: "/about/products", changeFrequency: "monthly", priority: 0.6 },
  { path: "/contact", changeFrequency: "monthly", priority: 0.5, sitelinkCandidate: true },
  { path: "/faq", changeFrequency: "monthly", priority: 0.5 },
  { path: "/privacy", changeFrequency: "monthly", priority: 0.2 },
  { path: "/terms", changeFrequency: "monthly", priority: 0.2 },
  { path: "/cookies", changeFrequency: "monthly", priority: 0.2 },
  { path: "/refund", changeFrequency: "monthly", priority: 0.2 },
  { path: "/dpa", changeFrequency: "monthly", priority: 0.2 },
] as const;

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
  const prefix = locale === routing.defaultLocale ? "" : `/${locale}`;
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

  for (const locale of routing.locales) {
    languages[HREFLANG_BY_LOCALE[locale]] = canonicalUrlForLocale(baseUrl, locale, path);
  }

  languages["x-default"] = canonicalUrlForLocale(baseUrl, routing.defaultLocale, path);
  return languages;
}

export function getSitelinkCandidateRoutes(): ReadonlyArray<PublicSeoRoute> {
  return PUBLIC_SEO_ROUTES.filter((route) => "sitelinkCandidate" in route);
}
