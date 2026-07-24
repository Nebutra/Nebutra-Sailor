import { routing } from "@/i18n/routing";

const oneTapSuppressedPaths = new Set(["/refer"]);

function normalizePathname(pathname: string): string {
  const normalized = pathname.startsWith("/") ? pathname : `/${pathname}`;
  const withoutTrailingSlash = normalized.replace(/\/+$/, "") || "/";
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
