import { canonicalizeLocaleOrDefault, toMessageLocale } from "@nebutra/i18n/locales";
import { cookies } from "next/headers";
import { getRequestConfig } from "next-intl/server";

export default getRequestConfig(async () => {
  const store = await cookies();
  const cookieLocale = store.get("NEXT_LOCALE")?.value;
  const canonical = canonicalizeLocaleOrDefault(cookieLocale);
  const messageLocale = toMessageLocale(canonical);

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

  // Same contract as apps/forge: cookie is canonical BCP-47, next-intl locale
  // must be a ROUTE_LOCALES message key or the tree 500s.
  return { locale: messageLocale, messages };
});
