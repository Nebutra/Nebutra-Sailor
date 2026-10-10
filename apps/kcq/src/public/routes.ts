/**
 * Public, indexed KCQ pages (Sailor ADR 2026-10-09-kcq-product-surface, fork ADRs 0002/0003).
 * Every other path belongs to the authenticated app. Prerender, sitemap, robots and the
 * dev server all read this table; nginx and the architecture test pin the same paths.
 */
import { brand } from "@nebutra/brand/metadata";

export const PUBLIC_PAGES = ["home", "benchmark", "investors"] as const;
export type PublicPage = (typeof PUBLIC_PAGES)[number];

/** `prefix` is the URL segment; `hreflang` and `htmlLang` use the script subtag Google documents. */
export const PUBLIC_LOCALES = {
  en: { prefix: "", htmlLang: "en", hreflang: "en", ogLocale: "en_US", label: "English" },
  zh: { prefix: "zh", htmlLang: "zh-Hans", hreflang: "zh-Hans", ogLocale: "zh_CN", label: "简体中文" },
} as const;
export type PublicLocale = keyof typeof PUBLIC_LOCALES;
export const PUBLIC_LOCALE_IDS = Object.keys(PUBLIC_LOCALES) as PublicLocale[];
/** English is the default URL and `x-default` (fork ADR 0003). */
export const DEFAULT_PUBLIC_LOCALE: PublicLocale = "en";

export const KCQ_ORIGIN = `https://${brand.domains.kcq}`;
export { APP_PATH } from "../main-route";

/**
 * Documentation roots per locale (apps/kcq-docs, a separate static app on the same origin). They
 * are not public routes of this app: robots.txt allows them by prefix and they ship their own sitemap.
 */
export const DOCS_PATHS = { en: "/docs", zh: "/zh/docs" } as const satisfies Record<PublicLocale, string>;

export interface PublicRoute {
  path: string;
  page: PublicPage;
  locale: PublicLocale;
}

export function publicPath(page: PublicPage, locale: PublicLocale): string {
  const { prefix } = PUBLIC_LOCALES[locale];
  return prefix ? `/${prefix}/${page}` : `/${page}`;
}

export const PUBLIC_ROUTES: readonly PublicRoute[] = PUBLIC_PAGES.flatMap((page) =>
  PUBLIC_LOCALE_IDS.map((locale) => ({ path: publicPath(page, locale), page, locale })),
);

/**
 * Real 404 bodies, one per locale (nginx `error_page 404`, picked by path prefix). They are
 * prerendered like the public pages but are not public routes: never in the sitemap, robots
 * allowlist or hreflang set, and marked noindex.
 */
export const NOT_FOUND_ROUTES: readonly { path: string; locale: PublicLocale }[] = PUBLIC_LOCALE_IDS.map(
  (locale) => ({ path: PUBLIC_LOCALES[locale].prefix ? `/${PUBLIC_LOCALES[locale].prefix}/404` : "/404", locale }),
);

export function matchPublicRoute(pathname: string): PublicRoute | undefined {
  const normalized = pathname.replace(/\/+$/, "") || "/";
  return PUBLIC_ROUTES.find((route) => route.path === normalized);
}

export interface PublicAlternate {
  hreflang: string;
  href: string;
}

/** Self-referencing and reciprocal: every variant lists all variants plus `x-default`. */
export function publicAlternates(page: PublicPage): PublicAlternate[] {
  return [
    ...PUBLIC_LOCALE_IDS.map((locale) => ({
      hreflang: PUBLIC_LOCALES[locale].hreflang,
      href: KCQ_ORIGIN + publicPath(page, locale),
    })),
    { hreflang: "x-default", href: KCQ_ORIGIN + publicPath(page, DEFAULT_PUBLIC_LOCALE) },
  ];
}
