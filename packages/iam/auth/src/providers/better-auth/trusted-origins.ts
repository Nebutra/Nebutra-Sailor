/**
 * Resolve the additional cross-origin trusted origins for Better Auth.
 *
 * Better Auth rejects any state-changing request whose `Origin` header isn't in
 * `trustedOrigins` (the `baseURL` origin is always trusted). First-party
 * surfaces sign in from a DIFFERENT origin than the auth center — e.g.
 * forge.nebutra.com mounts `<AuthProvider apiUrl="https://auth.nebutra.com">`
 * and calls `getSession()` cross-origin. Without CORS trust the browser blocks
 * the response and the product always appears signed-out after login.
 *
 * Sourced from env (trimmed, empties dropped, deduped, insertion order kept):
 *   - BETTER_AUTH_URL              auth center / BA base (always trusted by BA)
 *   - NEXT_PUBLIC_AUTH_URL         public auth-center origin (login UX host)
 *   - NEXT_PUBLIC_SITE_URL         marketing / landing origin
 *   - NEXT_PUBLIC_APP_URL          dashboard origin
 *   - NEXT_PUBLIC_FORGE_URL        Forge tool station
 *   - NEXT_PUBLIC_ROUTER_URL       Router model fabric
 *   - NEBUTRA_LANDING_ORIGIN       explicit landing origin override
 *   - BETTER_AUTH_TRUSTED_ORIGINS  comma-separated extra origins (wildcards ok)
 *
 * Multi-app SSO mode: when `AUTH_COOKIE_DOMAIN` is set (shared cookie domain
 * across first-party subdomains), also include the known product surfaces so
 * forge/router do not silently lose CORS even if ops forgets the env list.
 *
 * Returns `[]` when nothing is configured, so callers can omit the option and
 * keep Better Auth's safe single-origin default unchanged.
 */

/** First-party product origins trusted when multi-app SSO cookies are enabled. */
export const MULTI_APP_SSO_DEFAULT_ORIGINS = [
  "https://nebutra.com",
  "https://www.nebutra.com",
  "https://app.nebutra.com",
  "https://auth.nebutra.com",
  "https://forge.nebutra.com",
  "https://router.nebutra.com",
  "https://kuanlan.nebutra.com",
  "http://localhost:3000",
  "http://localhost:3001",
  "http://localhost:3100",
  "http://localhost:3101",
  "http://localhost:3105",
  "http://localhost:3106",
  "http://localhost:3120",
] as const;

function collectEnvOrigins(): string[] {
  return [
    process.env.BETTER_AUTH_URL,
    process.env.NEXT_PUBLIC_AUTH_URL,
    process.env.NEXT_PUBLIC_SITE_URL,
    process.env.NEXT_PUBLIC_APP_URL,
    process.env.NEXT_PUBLIC_FORGE_URL,
    process.env.NEXT_PUBLIC_ROUTER_URL,
    process.env.NEBUTRA_LANDING_ORIGIN,
    ...(process.env.BETTER_AUTH_TRUSTED_ORIGINS?.split(",") ?? []),
  ]
    .map((value) => value?.trim())
    .filter((value): value is string => Boolean(value));
}

export function resolveBetterAuthTrustedOrigins(): string[] {
  const fromEnv = collectEnvOrigins();
  const multiAppSso = Boolean(process.env.AUTH_COOKIE_DOMAIN?.trim());
  const defaults = multiAppSso ? [...MULTI_APP_SSO_DEFAULT_ORIGINS] : [];

  // Preserve insertion order: defaults first (stable product set), then env.
  return Array.from(new Set([...defaults, ...fromEnv]));
}
