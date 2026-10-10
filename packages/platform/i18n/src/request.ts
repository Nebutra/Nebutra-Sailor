import { createCookieRequestConfig } from "./request-config";

/**
 * Request config for apps that render the shared catalog (`locales/*.json`):
 * the dashboard and the auth center. Cookie mode — see request-config.ts.
 */
export default createCookieRequestConfig((locale) => import(`../locales/${locale}.json`));
