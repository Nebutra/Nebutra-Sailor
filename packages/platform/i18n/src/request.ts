import { cookies } from "next/headers";
import { getRequestConfig } from "next-intl/server";
import { canonicalizeLocaleOrDefault, toMessageLocale } from "./locales";

export default getRequestConfig(async () => {
  const store = await cookies();
  const cookieLocale = store.get("NEXT_LOCALE")?.value;

  // Cookies use canonical BCP-47 locale tags. Message files and legacy content
  // still use compact route/storage keys such as zh.json.
  const locale = canonicalizeLocaleOrDefault(cookieLocale);
  const messageLocale = toMessageLocale(locale);

  return {
    locale,
    messages: (await import(`../locales/${messageLocale}.json`)).default,
  };
});
