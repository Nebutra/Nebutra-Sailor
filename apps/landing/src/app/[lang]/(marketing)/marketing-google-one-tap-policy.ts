import { legacyLocalePathRedirect } from "@nebutra/i18n/locales";
import { routing } from "@/i18n/routing";

const oneTapSuppressedPaths = new Set(["/refer"]);

function normalizePathname(pathname: string): string {
  const normalized = pathname.startsWith("/") ? pathname : `/${pathname}`;
  const trimmed = normalized.replace(/\/+$/, "") || "/";
  // A legacy locale prefix (bare /zh, /zh-CN, /en-US …) is folded onto its
  // route locale first — same SSOT the proxy 308s with — so the suppression
  // list only ever has to know route locales.
  const withoutTrailingSlash = legacyLocalePathRedirect(trimmed) ?? trimmed;
  const segments = withoutTrailingSlash.split("/").filter(Boolean);
  const [firstSegment, ...rest] = segments;

  if (firstSegment && routing.locales.some((locale) => locale === firstSegment)) {
    return rest.length === 0 ? "/" : `/${rest.join("/")}`;
  }

  return withoutTrailingSlash;
}

export function shouldMountMarketingGoogleOneTap(pathname: string, enabled: boolean): boolean {
  if (!enabled) return false;
  return !oneTapSuppressedPaths.has(normalizePathname(pathname));
}
