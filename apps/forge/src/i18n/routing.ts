import { DEFAULT_ROUTE_LOCALE, ROUTE_LOCALES } from "@nebutra/i18n/locales";
import { createNavigation } from "next-intl/navigation";
import { defineRouting } from "next-intl/routing";

/** Cookie-mode product locales — full global wheel from @nebutra/i18n. */
export const routing = defineRouting({
  locales: ROUTE_LOCALES,
  defaultLocale: DEFAULT_ROUTE_LOCALE,
  localePrefix: "never",
});

export type Locale = (typeof routing.locales)[number];
export const { Link, redirect, usePathname, useRouter } = createNavigation(routing);
