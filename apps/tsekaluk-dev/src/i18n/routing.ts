import { defineRouting } from "next-intl/routing";

/** Global product locales — aligned with @nebutra/i18n ROUTE_LOCALES. */
export const routing = defineRouting({
  locales: ["en", "zh", "ja", "ko", "es", "fr", "de"],
  defaultLocale: "en",
});
