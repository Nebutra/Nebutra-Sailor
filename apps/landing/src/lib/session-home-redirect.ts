/**
 * When a session-hint cookie is present, marketing `/` (and bare locale
 * roots) send signed-in visitors into the product. In-site Home (logo,
 * login-center ← 主页) is the opposite intent: stay on marketing.
 */

export function isAppRedirectablePath(pathname: string, locales: readonly string[]): boolean {
  if (pathname === "/" || pathname === "") return true;
  return locales.some((locale) => pathname === `/${locale}`);
}

function hostnameOf(value: string): string {
  return value
    .replace(/^https?:\/\//, "")
    .replace(/\/+$/, "")
    .toLowerCase();
}

function refererHost(referer: string | null): string | null {
  if (!referer) return null;
  try {
    return new URL(referer).hostname.toLowerCase();
  } catch {
    return null;
  }
}

function firstPartyHomeHosts(authHost: string, landingHost: string): Set<string> {
  const auth = hostnameOf(authHost);
  const landing = hostnameOf(landingHost);
  const apex = landing.replace(/^www\./, "");
  return new Set([auth, landing, apex, `www.${apex}`]);
}

function refererIsFirstPartyHome(
  referer: string | null,
  authHost: string,
  landingHost: string,
): boolean {
  const host = refererHost(referer);
  if (!host) return false;
  return firstPartyHomeHosts(authHost, landingHost).has(host);
}

export function shouldBounceSignedInVisitorToApp(input: {
  pathname: string;
  host: string | undefined;
  statusHost: string;
  authHost: string;
  landingHost: string;
  hasSessionHint: boolean;
  stayParam: string | null;
  referer: string | null;
  locales: readonly string[];
}): boolean {
  if (!input.hasSessionHint) return false;
  const host = input.host?.toLowerCase();
  if (!host || host === input.statusHost.toLowerCase()) return false;
  if (!isAppRedirectablePath(input.pathname, input.locales)) return false;
  if (input.stayParam === "1" || input.stayParam === "marketing") return false;
  if (refererIsFirstPartyHome(input.referer, input.authHost, input.landingHost)) return false;
  return true;
}
