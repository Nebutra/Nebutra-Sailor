import { createCookieRequestConfig } from "@nebutra/i18n/request-config";

/**
 * Cookie-mode locale, English-backed messages — the shared product path
 * (packages/platform/i18n/src/request-config.ts). next-intl's locale is the
 * message key (`zh-Hans`): Forge's routing table is ROUTE_LOCALES, and a
 * canonical tag (`zh-Hans-CN`) there 500s every page.
 */
export default createCookieRequestConfig((locale) => import(`../../messages/${locale}.json`), {
  locale: "message",
});
