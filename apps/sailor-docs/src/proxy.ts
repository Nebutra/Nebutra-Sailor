import { createI18nMiddleware } from "fumadocs-core/i18n/middleware";
import { i18n } from "./lib/i18n";

const i18nProxy = createI18nMiddleware(i18n);

export function proxy(...args: Parameters<typeof i18nProxy>) {
  return i18nProxy(...args);
}

export const config = {
  // Matcher ignoring `/_next/`, `/api/`, and static assets like `/logo/`
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|logo).*)"],
};
