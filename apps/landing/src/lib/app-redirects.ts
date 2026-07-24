const LEGACY_LOGIN_SUCCESS_PATHS = new Set(["/login/success"]);

export function createLegacyAppRedirectUrl(pathname: string, appOrigin: string): URL | null {
  const normalizedPath = pathname.replace(/\/+$/, "") || "/";

  if (!LEGACY_LOGIN_SUCCESS_PATHS.has(normalizedPath)) {
    return null;
  }

  return new URL("/login/success", appOrigin);
}
