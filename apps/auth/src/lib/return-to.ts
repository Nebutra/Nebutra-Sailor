import { getAuthReturnAllowedHosts, sanitizeReturnUrl } from "@nebutra/auth";

export function resolveAppOrigin(): string {
  return (
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    "https://app.nebutra.com"
  ).replace(/\/$/, "");
}

/**
 * Resolve a safe post-login destination for multi-app returnTo.
 */
export function resolvePostLoginReturnTo(raw: string | null | undefined): string {
  const appOrigin = resolveAppOrigin();
  const fallback = `${appOrigin}/dashboard`;
  const allowedHosts = getAuthReturnAllowedHosts();

  if (!raw || !raw.trim()) return fallback;

  const trimmed = raw.trim();
  if (trimmed.startsWith("/")) {
    return sanitizeReturnUrl(trimmed, { fallback: "/dashboard" }) === "/dashboard"
      ? fallback
      : `${appOrigin}${sanitizeReturnUrl(trimmed, { fallback: "/dashboard" })}`;
  }

  return sanitizeReturnUrl(trimmed, { allowedHosts, fallback });
}
