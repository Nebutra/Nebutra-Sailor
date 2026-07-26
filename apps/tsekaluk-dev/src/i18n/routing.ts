import { DEFAULT_ROUTE_LOCALE, ROUTE_LOCALES } from "@nebutra/i18n/locales";
import { defineRouting } from "next-intl/routing";

/**
 * Product language wheel (URL path tags) — SSOT from @nebutra/i18n.
 *
 * The array used to be hand-copied here, which let src/app/sitemap.ts publish a
 * `/zh/*` cluster the router could never resolve. Importing ROUTE_LOCALES makes
 * that drift unrepresentable: router and sitemap read one array.
 * Chinese is CLDR multi-script: zh-Hans (简体) + zh-Hant (繁體). Never bare `zh`.
 *
 * `localePrefix` stays at next-intl's default ("always"), so every canonical URL
 * carries a locale prefix and the unprefixed form is a redirect.
 */
export const routing = defineRouting({
  locales: ROUTE_LOCALES as unknown as [string, ...string[]],
  defaultLocale: DEFAULT_ROUTE_LOCALE,
});

export type Locale = (typeof routing.locales)[number];
