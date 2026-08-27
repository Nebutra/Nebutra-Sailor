import { canonicalizeLocaleOrDefault, toMessageLocale } from "@nebutra/i18n/locales";
import { cookies } from "next/headers";
import { getRequestConfig } from "next-intl/server";

export default getRequestConfig(async () => {
  const store = await cookies();
  const cookieLocale = store.get("NEXT_LOCALE")?.value;
  const locale = canonicalizeLocaleOrDefault(cookieLocale);
  const messageLocale = toMessageLocale(locale);

  const en = (await import("../../messages/en.json")).default;
  let messages = en;
  if (messageLocale !== "en") {
    try {
      messages = {
        ...en,
        ...((await import(`../../messages/${messageLocale}.json`)).default as typeof en),
      };
    } catch {
      messages = en;
    }
  }

  return { locale, messages };
});
