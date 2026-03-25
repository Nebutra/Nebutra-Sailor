import { hasLocale } from "next-intl";
import { getRequestConfig } from "next-intl/server";
import { routing } from "./routing";

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale = hasLocale(routing.locales, requested) ? requested : routing.defaultLocale;

  // Always load English as the base, then merge the target locale on top.
  // This prevents MISSING_MESSAGE crashes during SSG when translations are incomplete.
  const enMessages = (await import("../../messages/en.json")).default;
  const localeMessages =
    locale === "en" ? enMessages : (await import(`../../messages/${locale}.json`)).default;

  return {
    locale,
    messages: { ...enMessages, ...deepMerge(enMessages, localeMessages) },
  };
});

/** Deep-merge b into a, keeping a's values as fallback for missing keys in b. */
function deepMerge(
  a: Record<string, unknown>,
  b: Record<string, unknown>,
): Record<string, unknown> {
  const result: Record<string, unknown> = { ...a };
  for (const key of Object.keys(b)) {
    if (
      b[key] !== null &&
      typeof b[key] === "object" &&
      !Array.isArray(b[key]) &&
      typeof a[key] === "object" &&
      a[key] !== null &&
      !Array.isArray(a[key])
    ) {
      result[key] = deepMerge(a[key] as Record<string, unknown>, b[key] as Record<string, unknown>);
    } else {
      result[key] = b[key];
    }
  }
  return result;
}
