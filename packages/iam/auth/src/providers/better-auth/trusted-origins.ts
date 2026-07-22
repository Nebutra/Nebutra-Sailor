/**
 * Resolve the additional cross-origin trusted origins for Better Auth.
 *
 * Better Auth rejects any state-changing request whose `Origin` header isn't in
 * `trustedOrigins` (the `baseURL` origin is always trusted). First-party
 * surfaces sign in from a DIFFERENT origin than the app — e.g. the marketing
 * site (nebutra.com) mounts Google One Tap that posts the credential to the
 * app's `/api/auth` (app.nebutra.com) — so those origins must be trusted or the
 * cross-origin One Tap / OAuth flow silently 403s.
 *
 * Sourced from env (trimmed, empties dropped, deduped, insertion order kept):
 *   - BETTER_AUTH_URL              auth center / BA base (always trusted by BA)
 *   - NEXT_PUBLIC_AUTH_URL         public auth-center origin (login UX host)
 *   - NEXT_PUBLIC_SITE_URL         marketing / landing origin
 *   - NEXT_PUBLIC_APP_URL          dashboard origin
 *   - NEBUTRA_LANDING_ORIGIN       explicit landing origin override
 *   - BETTER_AUTH_TRUSTED_ORIGINS  comma-separated extra origins (wildcards ok)
 *
 * Returns `[]` when nothing is configured, so callers can omit the option and
 * keep Better Auth's safe single-origin default unchanged.
 */
export function resolveBetterAuthTrustedOrigins(): string[] {
  return Array.from(
    new Set(
      [
        process.env.BETTER_AUTH_URL,
        process.env.NEXT_PUBLIC_AUTH_URL,
        process.env.NEXT_PUBLIC_SITE_URL,
        process.env.NEXT_PUBLIC_APP_URL,
        process.env.NEBUTRA_LANDING_ORIGIN,
        ...(process.env.BETTER_AUTH_TRUSTED_ORIGINS?.split(",") ?? []),
      ]
        .map((value) => value?.trim())
        .filter((value): value is string => Boolean(value)),
    ),
  );
}
