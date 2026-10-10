import { createCookieRequestConfig } from "@nebutra/i18n/request-config";

/**
 * Same contract as apps/forge: cookie-mode locale, English-backed messages, and
 * the message key as next-intl's locale.
 */
export default createCookieRequestConfig((locale) => import(`../../messages/${locale}.json`), {
  locale: "message",
});
