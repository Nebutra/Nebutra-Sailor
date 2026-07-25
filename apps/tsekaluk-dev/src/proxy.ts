import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";

export const proxy = createMiddleware(routing);

export const config = {
  matcher: [
    // Match root and locale-prefixed paths, skip Next.js internals and static files
    "/",
    // Include multi-segment tags (zh-Hans, zh-Hant) — next-intl handles parsing
    "/((?!_next|_vercel|api|og|.*\\..*).*)",
  ],
};
