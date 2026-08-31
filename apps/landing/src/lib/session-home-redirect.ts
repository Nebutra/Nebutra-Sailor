/**
 * When a session-hint cookie is present, marketing `/` (and bare locale
 * roots) are a product launcher. `?home` is the only skip — in-site Home
 * and login-center ← 主页 must send that flag.
 */

export function isAppRedirectablePath(pathname: string, locales: readonly string[]): boolean {
  if (pathname === "/" || pathname === "") return true;
  return locales.some((locale) => pathname === `/${locale}`);
}

export function shouldBounceSignedInVisitorToApp(input: {
  pathname: string;
  host: string | undefined;
  statusHost: string;
  hasSessionHint: boolean;
  hasHomeFlag: boolean;
  locales: readonly string[];
}): boolean {
  if (!input.hasSessionHint) return false;
  const host = input.host?.toLowerCase();
  if (!host || host === input.statusHost.toLowerCase()) return false;
  if (!isAppRedirectablePath(input.pathname, input.locales)) return false;
  if (input.hasHomeFlag) return false;
  return true;
}
