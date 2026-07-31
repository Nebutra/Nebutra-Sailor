import "server-only";

import { getAuthReturnAllowedHosts, sanitizeReturnUrl } from "@nebutra/auth";
import { getBrandOrigin } from "@nebutra/brand/metadata-helpers";

/**
 * Origin of the dashboard app, for post-login destinations.
 *
 * NEXT_PUBLIC_SITE_URL used to sit in the middle of this chain, where it does
 * not belong: @nebutra/auth defines it as the marketing / landing origin and
 * feeds it to the trusted-origins list, and vercel.json sets it accordingly.
 * As a fallback here it meant that an unset NEXT_PUBLIC_APP_URL would send
 * every login to <marketing-home>/dashboard. That never fired in production
 * because vercel.json also sets NEXT_PUBLIC_APP_URL — it was a trap waiting for
 * the first environment that forgot to.
 */
export function resolveAppOrigin(): string {
  return (process.env.NEXT_PUBLIC_APP_URL || getBrandOrigin("app")).replace(/\/$/, "");
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
