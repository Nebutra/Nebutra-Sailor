import { canonicalizeLocaleOrDefault, toMessageLocale } from "@nebutra/i18n/locales";
import { cookies } from "next/headers";
import { getRequestConfig } from "next-intl/server";

/**
 * Deep-merge locale messages onto English base so partial locale files
 * (or newly added en keys) never drop shell/runner strings.
 */
function mergeMessages(base: unknown, overlay: unknown): unknown {
  if (
    !base ||
    !overlay ||
    typeof base !== "object" ||
    typeof overlay !== "object" ||
    Array.isArray(base) ||
    Array.isArray(overlay)
  ) {
    return overlay === undefined ? base : overlay;
  }
  const out: Record<string, unknown> = { ...(base as Record<string, unknown>) };
  for (const [key, value] of Object.entries(overlay as Record<string, unknown>)) {
    out[key] = key in out ? mergeMessages(out[key], value) : value;
  }
  return out;
}

/**
 * Cookie-based locale for Forge (same pattern as apps/web).
 * Message files: apps/forge/messages/<messageKey>.json
 */
export default getRequestConfig(async () => {
  const store = await cookies();
  const cookieLocale = store.get("NEXT_LOCALE")?.value;
  const canonical = canonicalizeLocaleOrDefault(cookieLocale);
  const messageLocale = toMessageLocale(canonical);

  const en = (await import("../../messages/en.json")).default;
  let messages: typeof en = en;
  if (messageLocale !== "en") {
    try {
      const overlay = (await import(`../../messages/${messageLocale}.json`)).default as typeof en;
      messages = mergeMessages(en, overlay) as typeof en;
    } catch {
      messages = en;
    }
  }

  // next-intl routing.locales is ROUTE_LOCALES (`en`, `zh-Hans`). The cookie
  // is a canonical tag (`en-US`, `zh-Hans-CN`) shared on .nebutra.com. Returning
  // the canonical tag here 500s every page for anyone who picked a language.
  return { locale: messageLocale, messages };
});
