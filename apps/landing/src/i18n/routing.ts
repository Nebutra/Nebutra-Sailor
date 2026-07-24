import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  locales: ["en", "zh", "ja", "ko", "es", "fr", "de"],
  defaultLocale: "en",
  localePrefix: "as-needed",
  // Locale is determined PURELY by the URL on this marketing site — never by a
  // cookie or Accept-Language header. With detection on (the default), the
  // next-intl middleware 307-redirects the default-locale path "/" to whatever
  // the NEXT_LOCALE cookie / Accept-Language says. That made switching *to* the
  // default locale (EN → "/") silently fail: the switcher writes NEXT_LOCALE
  // and prefetches "/" on menu-open, but the prefetch ran with the *previous*
  // locale's cookie → middleware redirected "/" → "/<oldLocale>" → that
  // redirect got cached → the actual EN click resolved to the cached redirect
  // and the page never changed ("clicking EN does nothing"). Deterministic
  // URL-only locales also drop the SEO-hostile auto-redirect on "/".
  localeDetection: false,
});

export type Locale = (typeof routing.locales)[number];
export const locales = routing.locales;
export const defaultLocale = routing.defaultLocale;
