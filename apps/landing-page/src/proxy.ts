import { NextRequest, NextResponse } from "next/server";
import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";
import { createDocsRedirectUrl } from "./lib/docs-routing";

const intlMiddleware = createMiddleware(routing);
const STATUS_HOST = "status.nebutra.com";

function withSecurityHeaders(response: NextResponse): NextResponse {
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=(), payment=()",
  );
  return response;
}

function getCurrencyForCountry(countryCode: string): string {
  const map: Record<string, string> = {
    US: "USD",
    GB: "GBP",
    CN: "CNY",
    JP: "JPY",
    AU: "AUD",
    CA: "CAD",
    CH: "CHF",
    IN: "INR",
    SG: "SGD",
    HK: "HKD",
    NZ: "NZD",
    KR: "KRW",
    TW: "TWD",
    FR: "EUR",
    DE: "EUR",
    IT: "EUR",
    ES: "EUR",
    NL: "EUR",
    BE: "EUR",
    AT: "EUR",
    GR: "EUR",
    PT: "EUR",
    FI: "EUR",
    IE: "EUR",
  };
  return map[countryCode.toUpperCase()] || "USD";
}

export default function proxy(request: NextRequest): NextResponse {
  const host = request.headers.get("host")?.split(":")[0]?.toLowerCase();
  const pathname = request.nextUrl.pathname.replace(/\/+$/, "") || "/";
  const docsRedirectUrl = createDocsRedirectUrl(request.nextUrl, host);

  if (docsRedirectUrl) {
    return withSecurityHeaders(NextResponse.redirect(docsRedirectUrl, 308));
  }

  if (pathname === "/status.json") {
    return withSecurityHeaders(NextResponse.next());
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

  // 1. Detect Country and Currency
  let country = request.headers.get("x-vercel-ip-country");

  // Fallback to language locale if GeoIP is missing (e.g. local development)
  if (!country) {
    const pathname = request.nextUrl.pathname;
    if (pathname.startsWith("/zh")) country = "CN";
    else if (pathname.startsWith("/ja")) country = "JP";
    else if (pathname.startsWith("/en-GB")) country = "GB";
    else if (pathname.startsWith("/fr")) country = "FR";
    else if (pathname.startsWith("/de")) country = "DE";
    else country = "US";
  }

  const currency = getCurrencyForCountry(country);

  // 2. Add to request headers so downstream Server Components can read via headers()
  request.headers.set("x-user-country", country);
  request.headers.set("x-user-currency", currency);

  // 3. Process with next-intl
  const response = intlMiddleware(request) as NextResponse;

  return withSecurityHeaders(response);
}

export const config = {
  matcher: [
    "/docs/:path*",
    "/:locale(en|zh|ja|ko|es|fr|de)/docs/:path*",
    "/((?!api|trpc|_next|_vercel|.*/opengraph-image|.*\\..*).*)",
  ],
};
