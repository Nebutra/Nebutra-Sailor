import { headers } from "next/headers";
import { type AppLocale, resolveLocale } from "./locale";

/** Resolve the reader's locale for a page from the request. Server only. */
export async function requestLocale(
  lang: string | string[] | undefined,
  locales: readonly string[] | null,
): Promise<AppLocale> {
  const h = await headers();
  return resolveLocale({
    lang: Array.isArray(lang) ? lang[0] : lang,
    acceptLanguage: h.get("accept-language"),
    locales,
  });
}
