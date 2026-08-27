import { isSupportedLocale } from "@nebutra/i18n/locales";

const BILLING_ROUTE_SEGMENT = "billing";

function isBillingPath(pathname: string): boolean {
  const segments = pathname.split("/").filter(Boolean);

  if (segments.length === 1) {
    return segments[0] === BILLING_ROUTE_SEGMENT;
  }

  if (segments.length === 2) {
    const [locale, route] = segments;
    return isSupportedLocale(locale) && route === BILLING_ROUTE_SEGMENT;
  }

  return false;
}

export function resolveBillingReturnUrl(request: Request): string {
  const requestUrl = new URL(request.url);
  const fallback = new URL(`/${BILLING_ROUTE_SEGMENT}`, requestUrl.origin);
  const referer = request.headers.get("referer");

  if (!referer) {
    return fallback.toString();
  }

  try {
    const refererUrl = new URL(referer);

    if (refererUrl.origin === requestUrl.origin && isBillingPath(refererUrl.pathname)) {
      return refererUrl.toString();
    }
  } catch {
    return fallback.toString();
  }

  return fallback.toString();
}

export function appendBillingStatus(
  returnUrl: string,
  status: "checkout-canceled" | "checkout-failed" | "checkout-success" | "portal-failed",
) {
  const url = new URL(returnUrl);
  url.searchParams.set("billing", status);
  return url.toString();
}
