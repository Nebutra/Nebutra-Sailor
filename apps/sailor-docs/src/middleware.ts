import { createI18nMiddleware } from "fumadocs-core/i18n/middleware";
import { isMarkdownPreferred, rewritePath } from "fumadocs-core/negotiation";
import { NextResponse } from "next/server";
import { i18n } from "./lib/i18n";

/**
 * Edge Middleware (not Next 16 `proxy.ts`).
 *
 * Next.js 16 renamed middleware → proxy and defaults proxy to the Node.js
 * runtime. OpenNext Cloudflare only supports Edge Middleware, so we keep the
 * deprecated `middleware.ts` convention until OpenNext gains Node proxy
 * support. Logic is pure Request/Response rewrites and is edge-safe.
 */
const i18nProxy = createI18nMiddleware(i18n);
const markdownDocsPath = rewritePath("/:lang/:slug{/*rest}", "/llms.mdx/docs/:lang/:slug{/*rest}");
const localizedDocsPath = new RegExp(`^/(${i18n.languages.join("|")})/[^/]+`);
/**
 * The same page without a locale segment, which is what the default language's
 * URLs look like under `i18n.hideLocale`. Markdown negotiation matched only the
 * prefixed shape, so `Accept: text/markdown` returned HTML for every English
 * page while Chinese worked — the kind of asymmetry that reads as an agent bug.
 */
const localeLessDocsPath = new RegExp(`^/(?!${i18n.languages.join("|")}/)[^/]+`);

export function middleware(...args: Parameters<typeof i18nProxy>) {
  const [request] = args;
  const markdownResponse = rewriteMarkdownRequest(request);
  if (markdownResponse) {
    return markdownResponse;
  }

  const rootResponse = rewriteZoneRoot(request);
  if (rootResponse) {
    return rootResponse;
  }

  return i18nProxy(...args);
}

/**
 * Give the zone root a route.
 *
 * `hideLocale: "default-locale"` rewrites every locale-less path onto the default
 * language — `/cli/create-sailor` → `/en/cli/create-sailor` — but not the empty
 * one, so the zone root had no route at all and answered 404 while every page
 * under it worked. `/en` is no help either: the same middleware strips the
 * default locale back off, and Next then normalises the trailing slash, so
 * `/en` → `/` → 404 in two hops.
 *
 * A rewrite, not a redirect: the root's address is the zone root, and this app is
 * reached through a rewrite that cannot translate a Location on the way back.
 */
function rewriteZoneRoot(request: Parameters<typeof i18nProxy>[0]) {
  if (request.nextUrl.pathname !== "/") {
    return undefined;
  }

  const url = request.nextUrl.clone();
  url.pathname = `/${i18n.defaultLanguage}`;
  return NextResponse.rewrite(url);
}

function rewriteMarkdownRequest(request: Parameters<typeof i18nProxy>[0]) {
  const pathname = request.nextUrl.pathname;
  if (!isMarkdownPreferred(request)) {
    return undefined;
  }

  const prefixed = localizedDocsPath.test(pathname);
  if (!prefixed && !localeLessDocsPath.test(pathname)) {
    return undefined;
  }

  // The handler's path always carries a language, so supply the hidden one.
  const targetPath = markdownDocsPath.rewrite(
    prefixed ? pathname : `/${i18n.defaultLanguage}${pathname}`,
  );
  if (!targetPath) {
    return undefined;
  }

  const url = request.nextUrl.clone();
  url.pathname = targetPath;
  return NextResponse.rewrite(url);
}

export const config = {
  // Matcher ignoring `/_next/`, `/api/`, static assets like `/logo/`, the
  // locale-less `/llms.txt` family — the i18n redirect used to send them to
  // `/en/llms.txt`, which 404s and made the status page report docs as down —
  // and the metadata routes, for the same reason: `sitemap.xml` is served at the
  // zone root, so letting the locale rewrite claim it produced `/en/sitemap.xml`
  // and a 404 where the host site's sitemap index points.
  matcher: [
    // The zone root, listed explicitly. Under `basePath` Next prefixes every
    // matcher with it, so the pattern below becomes `/docs/((?!…).*)` and
    // requires a segment after `/docs` — bare `/docs` matched nothing, the
    // middleware never ran, and the zone root 404'd while every page under it
    // worked. `/docs/` is no escape: Next normalises the trailing slash away
    // first.
    "/",
    "/((?!api|_next/static|_next/image|favicon.ico|logo|llms|sitemap).*)",
  ],
};
