import { buildAuthCenterSignInUrl } from "@nebutra/auth";

/**
 * Where this app lives, and how to send someone to the auth center and back.
 *
 * `NEXT_PUBLIC_SITE_URL` is the source of truth in every deployed environment; the localhost
 * fallback is for `pnpm dev` only. No hardcoded production domain — PARA has no brand-domains entry
 * yet, and inventing one here would put it in two places.
 */
export function paraOrigin(env: Record<string, string | undefined> = process.env): string {
  const configured = env.NEXT_PUBLIC_SITE_URL?.trim();
  if (configured) return configured.replace(/\/+$/, "");
  return "http://localhost:3110";
}

export function paraSignInUrl(
  returnPath = "/",
  env: Record<string, string | undefined> = process.env,
): string {
  const path = returnPath.startsWith("/") ? returnPath : `/${returnPath}`;
  return buildAuthCenterSignInUrl(`${paraOrigin(env)}${path}`, env);
}
