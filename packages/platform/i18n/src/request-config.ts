import { cookies, headers } from "next/headers";
import { getRequestConfig } from "next-intl/server";
import { LOCALE_COOKIE } from "./cookies";
import { toMessageLocale } from "./locales";
import { loadMessages, type Messages } from "./messages";
import { resolveRequestLocale } from "./resolve-locale";

type Importer = (locale: string) => Promise<{ default: Messages } | Messages>;

export interface CookieRequestConfigOptions {
  /**
   * What next-intl's `locale` is set to. `canonical` (`zh-Hans-CN`) is what the
   * dashboard and auth center have always used; apps that route through
   * next-intl navigation need the message key (`zh-Hans`), because their
   * routing table is ROUTE_LOCALES and a canonical tag there 500s the tree.
   */
  locale?: "canonical" | "message";
}

/**
 * The request config every cookie-mode product app uses (web, auth, forge,
 * router): locale from {@link resolveRequestLocale}, messages from
 * {@link loadMessages}. An app's `src/i18n/request.ts` is one call.
 */
export function createCookieRequestConfig(
  load: Importer,
  options: CookieRequestConfigOptions = {},
) {
  return getRequestConfig(async () => {
    const [cookieStore, headerStore] = await Promise.all([cookies(), headers()]);
    const canonical = resolveRequestLocale({
      cookie: cookieStore.get(LOCALE_COOKIE)?.value,
      acceptLanguage: headerStore.get("accept-language"),
    });
    const messageLocale = toMessageLocale(canonical);
    return {
      locale: options.locale === "message" ? messageLocale : canonical,
      messages: await loadMessages(messageLocale, load),
    };
  });
}
