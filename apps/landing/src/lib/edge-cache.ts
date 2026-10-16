// Relative, not "@/": next.config.ts imports this module too.
import { SERVED_PAGES } from "../site-map";
import edgeCachedPages from "./edge-cached-pages.json";

/**
 * Edge (Cloudflare) caching of the public marketing HTML.
 *
 * The site runs on one Fly Machine in Singapore; every visitor elsewhere used
 * to wait on that origin for the HTML, and LCP swung with its TTFB. The pages
 * below are prerendered with no request data (○ in the `next build` table:
 * no cookies, headers, `connection()` or auth), so one copy can serve every
 * visitor: the edge keeps it for ten minutes and serves it stale while it
 * refreshes, and browsers always revalidate, so a deploy (which purges these
 * URLs, infra/ops/scripts/apply-landing-edge-cache.sh) shows at once and no
 * stale HTML outlives the chunks it names.
 *
 * The two headers come from two places, because Next strips the RSC request
 * headers (`RSC`, `Next-Router-*`, `?_rsc`) before the proxy runs:
 *
 * - the proxy (applyEdgeCacheHeaders) sets the browser `Cache-Control` on a
 *   listed page, and `Cloudflare-CDN-Cache-Control: no-store` on everything
 *   else — pages rendered per request (pricing, licensing, get-license, refer,
 *   status, blog articles), redirects, and anything that sets a cookie — so
 *   even a broad Cache Rule cannot keep those;
 * - next.config.ts (edgeCacheHeaderRules) adds the edge lifetime to a listed
 *   page only when the request is NOT an RSC/prefetch request. An RSC payload
 *   (or the redirect Next answers a hashless one with) is the same URL as the
 *   HTML, and Cloudflare ignores `Vary: rsc`; with no edge header and a
 *   browser `max-age=0` it is never stored. The Cache Rules also bypass any
 *   request carrying those headers. The consent banner and the signed-in navbar are client-side
 * (lib/consent.ts, lib/public-me.ts), so a cached page carries no visitor's
 * state. If the signed-in bounce on `/` (lib/session-home-redirect.ts) is ever
 * turned back on, `/` must leave this list: it would then depend on a cookie.
 *
 * The list is edge-cached-pages.json (the deploy's purge reads it too). Add a
 * page there only when the build table shows it as ○ for every locale. The
 * template (acme) serves the subset it ships (SERVED_PAGES).
 */
export const EDGE_CACHED_PAGES: readonly string[] = edgeCachedPages;

/** Browsers revalidate every time; the edge holds the copy (Cloudflare-CDN-Cache-Control). */
export const BROWSER_CACHE_CONTROL = "public, max-age=0, must-revalidate";
export const EDGE_CACHE_CONTROL = "max-age=600, stale-while-revalidate=86400, stale-if-error=86400";
export const EDGE_NO_STORE = "no-store";

const served = new Set(
  SERVED_PAGES.filter((page) => page.status === "live").map((page) => page.path),
);
const CACHED = new Set<string>(EDGE_CACHED_PAGES.filter((path) => served.has(path)));

/** The locale-free route of a pathname: "/de/about" → "/about", "/de" → "/". */
function routeOf(pathname: string, locales: readonly string[]): string {
  const [, first = "", ...rest] = pathname.split("/");
  if (!locales.includes(first)) return pathname.replace(/\/+$/, "") || "/";
  return `/${rest.join("/")}`.replace(/\/+$/, "") || "/";
}

/** Whether a pathname (any locale prefix) is one of the edge-cached pages this build serves. */
export function isEdgeCachedPath(pathname: string, locales: readonly string[]): boolean {
  return CACHED.has(routeOf(pathname, locales));
}

interface EdgeCacheRequest {
  method: string;
  pathname: string;
}

/**
 * Sets the cache headers on a proxy response: the browser header for a GET/HEAD
 * of a listed page that renders (not a redirect) and sets no cookie, and the
 * edge `no-store` for everything else. The listed page's edge lifetime is
 * added by next.config.ts (edgeCacheHeaderRules), which can see RSC requests.
 */
export function applyEdgeCacheHeaders(
  response: Response,
  request: EdgeCacheRequest,
  locales: readonly string[],
): void {
  const cacheable =
    (request.method === "GET" || request.method === "HEAD") &&
    response.status < 300 &&
    !response.headers.has("location") &&
    !response.headers.has("set-cookie") &&
    isEdgeCachedPath(request.pathname, locales);
  if (cacheable) {
    response.headers.set("Cache-Control", BROWSER_CACHE_CONTROL);
  } else {
    response.headers.set("Cloudflare-CDN-Cache-Control", EDGE_NO_STORE);
  }
}

/** Request markers of an RSC payload or router prefetch (next/dist app-router-headers). */
const RSC_MARKERS = [
  { type: "header", key: "rsc" },
  { type: "header", key: "next-router-prefetch" },
  { type: "header", key: "next-router-state-tree" },
  { type: "header", key: "next-router-segment-prefetch" },
  { type: "query", key: "_rsc" },
] as const;

/**
 * next.config `headers()` rules giving each listed page, under any locale
 * prefix, its edge lifetime — for document requests only (`missing` the RSC
 * markers). The proxy's `no-store` overrides it on redirects and per-request
 * responses, since proxy headers are applied after these.
 */
export function edgeCacheHeaderRules(locales: readonly string[]) {
  const prefix = `/:edgeLocale(${locales.join("|")})?`;
  return [...CACHED].map((page) => ({
    source: page === "/" ? prefix : `${prefix}${page}`,
    missing: RSC_MARKERS.map((marker) => ({ ...marker })),
    headers: [{ key: "Cloudflare-CDN-Cache-Control", value: EDGE_CACHE_CONTROL }],
  }));
}
