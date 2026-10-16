import { cookies, headers } from "next/headers";
import { type AppLocale, LOCALE_COOKIE, resolveLocale } from "./locale";
import { TIME_ZONE_COOKIE, validTimeZone } from "./time-zone";

/** The reader's locale for a page: ?lang=, saved choice, browser, page default. Server only. */
export async function requestLocale(
  lang: string | string[] | undefined,
  locales: readonly string[] | null,
): Promise<AppLocale> {
  const [h, jar] = await Promise.all([headers(), cookies()]);
  return resolveLocale({
    lang: Array.isArray(lang) ? lang[0] : lang,
    cookie: jar.get(LOCALE_COOKIE)?.value,
    acceptLanguage: h.get("accept-language"),
    locales,
  });
}

/** The reader's IANA time zone, once the browser has told us; null on a first visit. */
export async function requestTimeZone(): Promise<string | null> {
  return validTimeZone((await cookies()).get(TIME_ZONE_COOKIE)?.value);
}
