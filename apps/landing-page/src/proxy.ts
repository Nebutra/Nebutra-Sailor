import type { NextRequest, NextResponse } from "next/server";
import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";

const intlMiddleware = createMiddleware(routing);

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

  // Add security headers
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=(), payment=()",
  );

  return response;
}

export const config = {
  matcher: "/((?!api|trpc|_next|_vercel|.*/opengraph-image|.*\\..*).*)",
};
