import { createNavigation } from "next-intl/navigation";
import { defineRouting } from "next-intl/routing";
import { DEFAULT_ROUTE_LOCALE, ROUTE_LOCALES } from "./locales";

export const routing = defineRouting({
  locales: ROUTE_LOCALES,
  defaultLocale: DEFAULT_ROUTE_LOCALE,
  // apps/web uses cookie-based i18n (no URL locale prefix) via a cookie-aware
  // getRequestConfig — the NEXT_LOCALE cookie drives locale selection server-side,
  // and LocaleSwitcher writes the cookie + calls router.refresh() for instant
  // in-place switching (no navigation, no URL change).
  //
  // Cookie mode eliminates all next-intl middleware rewrites and redirects.
  // The previous EPROTO ssl3_get_record prod-500 (nginx X-Forwarded-Proto +
  // Next.js 16 standalone internal rewrite → https://localhost:3000/...) is
  // gone entirely: no rewrite ever fires because no middleware runs locale
  // routing for web. localePrefix is irrelevant in cookie mode (no middleware
  // emits locale-prefix redirects) but kept as a valid defineRouting field.
  localePrefix: "never",
});

export const { Link, redirect, usePathname, useRouter } = createNavigation(routing);
