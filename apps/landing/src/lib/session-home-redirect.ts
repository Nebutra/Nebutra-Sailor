/**
 * Marketing `/` used to launch signed-in visitors into the dashboard.
 * A leftover 301 from kuanlan.nebutra.com → nebutra.com/ then dumped
 * people into app.nebutra.com/integrations. Stay on the page they opened.
 */

export function isAppRedirectablePath(pathname: string, locales: readonly string[]): boolean {
  if (pathname === "/" || pathname === "") return true;
  return locales.some((locale) => pathname === `/${locale}`);
}

export function shouldBounceSignedInVisitorToApp(_input: {
  pathname: string;
  host: string | undefined;
  aliasHosts: readonly string[];
  hasSessionHint: boolean;
  hasHomeFlag: boolean;
  locales: readonly string[];
}): boolean {
  return false;
}
