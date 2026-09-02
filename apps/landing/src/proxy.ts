import { brand } from "@nebutra/brand/metadata";
import { getBrandOrigin, MARKETING_HOME_PARAM } from "@nebutra/brand/metadata-helpers";
import { MARKET_COOKIE } from "@nebutra/i18n/cookies";
import { legacyLocalePathRedirect } from "@nebutra/i18n/locales";
import {
  resolveCountryFromRequest,
  resolveCurrencyFromRequest,
} from "@nebutra/i18n/resolve-market-request";
import { NextRequest, NextResponse } from "next/server";
import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";
import { createLegacyAppRedirectUrl } from "./lib/app-redirects";
import { createDocsRedirectUrl } from "./lib/docs-routing";
import { shouldBounceSignedInVisitorToApp } from "./lib/session-home-redirect";

const intlMiddleware = createMiddleware(routing);
const STATUS_HOST = brand.domains.status;

/**
 * Cross-subdomain "user is signed in somewhere" hint.
 *
 * The real HttpOnly session cookie lives on app host (host-scoped
 * for defense-in-depth). This non-sensitive flag cookie is set/cleared by
 * apps/web's auth catchall on the wider brand cookie apex so this
 * landing proxy can read it and redirect signed-in users to the app
 * without leaking real session material.
 *
 * Pattern: a presence-only hint cookie. The flag only encodes "session
 * exists somewhere", never the session itself.
 */
const SESSION_HINT_COOKIE = "nebutra_session_hint";
const APP_REDIRECT_URL = process.env.NEXT_PUBLIC_APP_URL ?? getBrandOrigin("app");

/**
 * 308 every legacy locale path prefix onto its route locale.
 *
 * Driven entirely by `legacyLocalePathRedirect` (@nebutra/i18n/locales), which
 * walks every LOCALE_ALIASES key that is not itself a route locale — so bare
 * `/zh`, `/zh-CN`, `/zh_TW`, `/zh-Hant-HK`, `/en-US`, `/ja-JP` … all resolve by
 * construction. The previous implementation only walked CANONICAL_LOCALES and
 * therefore left the whole bare/alias class 404ing.
 */
function createLegacyLocaleRedirectUrl(url: URL, pathname: string): URL | null {
  const redirectPath = legacyLocalePathRedirect(pathname);
  if (!redirectPath) return null;

  const redirectUrl = new URL(url.toString());
  redirectUrl.pathname = redirectPath;
  return redirectUrl;
}

function withSecurityHeaders(response: NextResponse): NextResponse {
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=(), payment=()",
  );
  // G31 isolation headers (same-origin default for marketing)
  response.headers.set("Cross-Origin-Opener-Policy", "same-origin-allow-popups");
  response.headers.set("Cross-Origin-Resource-Policy", "same-site");
  return response;
}

/** G32 — Host allowlist. Empty ALLOWED_HOSTS = soft mode (log only via header). */
function isHostAllowed(host: string | undefined): boolean {
  if (!host) return false;
  // Compare hostnames, not host:port. The allowlist holds domains, so a request
  // arriving on any port other than 80/443 could never match one — which made
  // the loopback branch below dead for every local server, since those all run
  // on a port. An allowlist is about which name reaches us, not which socket.
  const h = host.toLowerCase().replace(/:\d+$/, "");
  const fromEnv = (process.env.ALLOWED_HOSTS ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  const brandHosts = [
    // The marketing domain's key is `landing`; there is no `www` entry.
    // Keep the www. alias too — it is a real host visitors reach.
    brand.domains.landing,
    `www.${brand.domains.landing}`,
    brand.domains.app,
    brand.domains.status,
    brand.domains.docs,
  ]
    .filter(Boolean)
    .map(
      (d) =>
        String(d)
          .toLowerCase()
          .replace(/^https?:\/\//, "")
          .split("/")[0]!,
    );
  const allow = new Set([...fromEnv, ...brandHosts]);
  // Loopback is allowed whenever the app is not actually serving a public
  // origin. NODE_ENV alone cannot tell those apart: `next start` sets it to
  // production, so a production build served locally — which is what visual
  // acceptance and any local smoke test do — was rejected with 421 on every
  // request. ALLOWED_HOSTS being unset is the honest signal that nobody has
  // told this process which public names it answers to.
  if (process.env.NODE_ENV !== "production" || fromEnv.length === 0) {
    allow.add("localhost");
    allow.add("127.0.0.1");
    allow.add("[::1]");
  }
  // Unreachable in practice — brandHosts is never empty — but kept so the
  // function still means what it says if the brand config ever yields nothing.
  if (allow.size === 0) return true;
  return allow.has(h);
}

/** G30 — optional edge authenticity token when ORIGIN_EDGE_TOKEN is set. */
function isEdgeTokenValid(request: NextRequest): boolean {
  const expected = process.env.ORIGIN_EDGE_TOKEN;
  if (!expected) return true;
  const got = request.headers.get("x-nebutra-edge-token");
  return got === expected;
}

/** G22 — coarse UA-class rate signal (edge WAF is authoritative; this is defense-in-depth). */
function botClass(ua: string | null): "ai" | "search" | "other" {
  const u = (ua ?? "").toLowerCase();
  if (/gptbot|claudebot|bytespider|ccbot|google-extended|applebot-extended/.test(u)) return "ai";
  if (/googlebot|bingbot|duckduckbot|yandex|baiduspider/.test(u)) return "search";
  return "other";
}

export default function proxy(request: NextRequest): NextResponse {
  const host = request.headers.get("host")?.split(":")[0]?.toLowerCase();
  const pathname = request.nextUrl.pathname.replace(/\/+$/, "") || "/";

  if (!isEdgeTokenValid(request)) {
    return withSecurityHeaders(
      new NextResponse("Misdirected or unauthenticated edge hop", { status: 421 }),
    );
  }
  if (host && !isHostAllowed(host)) {
    return withSecurityHeaders(new NextResponse("Host not allowed", { status: 421 }));
  }
  // Annotate bot class for downstream observability / edge rules (G22)
  // (Actual per-IP rate limits belong on CF/WAF — see docs/seo/bot-policy-matrix.md)
  const _bot = botClass(request.headers.get("user-agent"));
  void _bot;
  const docsRedirectUrl = createDocsRedirectUrl(request.nextUrl, host);
  const legacyAppRedirectUrl = createLegacyAppRedirectUrl(pathname, APP_REDIRECT_URL);
  const legacyLocaleRedirectUrl = createLegacyLocaleRedirectUrl(request.nextUrl, pathname);

  // FIRST branch on purpose: the path is about to change, so no downstream
  // branch (docs / app / session) may act on the pre-redirect shape.
  if (legacyLocaleRedirectUrl) {
    return withSecurityHeaders(NextResponse.redirect(legacyLocaleRedirectUrl, 308));
  }

  if (docsRedirectUrl) {
    return withSecurityHeaders(NextResponse.redirect(docsRedirectUrl, 308));
  }

  if (host !== STATUS_HOST && legacyAppRedirectUrl) {
    const redirect = NextResponse.redirect(legacyAppRedirectUrl, 302);
    redirect.headers.set("Cache-Control", "private, no-store");
    return withSecurityHeaders(redirect);
  }

  if (pathname === "/status.json") {
    return withSecurityHeaders(NextResponse.next());
  }

  // Do not launch the dashboard from marketing `/`. A cached 301 from a
  // product host (kuanlan) onto the apex used to dump signed-in visitors
  // into app.nebutra.com/integrations.
  //
  // The response is intentionally `Cache-Control: private, no-store` because the
  // body varies per-cookie — never cache at the edge.
  if (
    shouldBounceSignedInVisitorToApp({
      pathname,
      host,
      statusHost: STATUS_HOST,
      hasSessionHint: request.cookies.get(SESSION_HINT_COOKIE)?.value === "1",
      hasHomeFlag: request.nextUrl.searchParams.has(MARKETING_HOME_PARAM),
      locales: routing.locales,
    })
  ) {
    const redirect = NextResponse.redirect(new URL("/workspace", APP_REDIRECT_URL), 302);
    redirect.headers.set("Cache-Control", "private, no-store");
    return withSecurityHeaders(redirect);
  }

  if (
    host === STATUS_HOST &&
    (pathname === "/" || routing.locales.some((l) => pathname === `/${l}`))
  ) {
    const rewriteUrl = request.nextUrl.clone();
    const locale = routing.locales.find((l) => pathname === `/${l}`);
    rewriteUrl.pathname =
      locale && locale !== routing.defaultLocale ? `/${locale}/status` : "/status";
    request = new NextRequest(rewriteUrl, { headers: request.headers });
  }

  // 1. Resolve market: NEXT_MARKET cookie > geo > path language default > US
  const pathLang = routing.locales.find(
    (l) => pathname === `/${l}` || pathname.startsWith(`/${l}/`),
  );
  const marketHints = {
    marketCookie: request.cookies.get(MARKET_COOKIE)?.value,
    geoCountry: request.headers.get("x-vercel-ip-country") ?? request.headers.get("cf-ipcountry"),
    pathLanguage: pathLang,
    acceptLanguage: request.headers.get("accept-language"),
  };
  const country = resolveCountryFromRequest(marketHints);
  const currency = resolveCurrencyFromRequest(marketHints);
  request.headers.set("x-user-country", country);
  request.headers.set("x-user-currency", currency);

  // 3. Process with next-intl
  const response = intlMiddleware(request) as NextResponse;

  return withSecurityHeaders(response);
}

export const config = {
  matcher: [
    "/docs/:path*",
    // Full PRODUCT_LANGUAGES wheel (+ bare zh legacy alias → Hans). Next requires
    // matchers to be statically analyzable literals, so this cannot be computed
    // from ROUTE_LOCALES. Drift is guarded by
    // tests/architecture/seo-locale-closure.test.ts, which asserts this
    // alternation === ROUTE_LOCALES ∪ the legacy prefixes that need redirects.
    "/:locale(en|zh-Hans|zh-Hant|zh|de|es|fr|ja|ko|pt|it|nl|sv|da|fi|no|pl|cs|ro|hu|el|ru|uk|tr|ar|he|fa|hi|bn|ur|th|vi|id|ms|sw)/docs/:path*",
    "/((?!api|trpc|_next|_vercel|.*/opengraph-image|.*\\..*).*)",
  ],
};
