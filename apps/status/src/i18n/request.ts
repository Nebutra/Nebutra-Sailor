import { headers } from "next/headers";
import { getRequestConfig } from "next-intl/server";
import { type AppLocale, normalizeLocale, resolveLocale } from "@/lib/locale";
import { loadMessages } from "./messages";

/**
 * Pages resolve their locale from the page's own `locales` and pass it
 * explicitly (`getTranslations({ locale })`). Anything that asks without one
 * — the root layout, not-found — gets the browser's best match.
 */
export default getRequestConfig(async ({ locale, requestLocale }) => {
  let resolved: AppLocale | null = normalizeLocale(locale ?? (await requestLocale));
  if (!resolved) {
    const h = await headers();
    resolved = resolveLocale({
      acceptLanguage: h.get("accept-language"),
      locales: ["en", "zh-CN"],
    });
  }
  return { locale: resolved, messages: await loadMessages(resolved), timeZone: "UTC" };
});
