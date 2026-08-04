/**
 * Map Better Auth / IdP `?error=` codes to `auth.signIn` message keys.
 *
 * Keep this pure (no React / next-intl) so unit tests can pin behaviour without
 * mounting the credentials form. Unknown codes fall back to `genericError`.
 */

export type AuthSignInOauthMessageKey =
  | "genericError"
  | "signInFailed"
  | "oauthInvalidCode"
  | "oauthStateMismatch"
  | "oauthAccessDenied"
  | "oauthUnavailable";

/**
 * Better Auth (and some providers) redirect back with `?error=<code>` after a
 * failed social round-trip. Surface a specific copy key when we know the fix
 * path; never invent new codes here — only map what BA already emits.
 */
export function resolveOauthErrorMessageKey(
  code: string | null | undefined,
): AuthSignInOauthMessageKey | null {
  if (!code) return null;
  const normalized = code
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");
  if (!normalized) return null;

  switch (normalized) {
    case "invalid_code":
    case "unable_to_get_user_info":
    case "invalid_token":
    case "token_exchange_failed":
      return "oauthInvalidCode";

    case "state_mismatch":
    case "state_not_found":
    case "state_security_mismatch":
    case "please_restart_the_process":
    case "invalid_state":
      return "oauthStateMismatch";

    case "access_denied":
    case "user_cancelled":
    case "user_denied":
      return "oauthAccessDenied";

    case "oauth_unavailable":
    case "unsupported":
    case "provider_not_found":
    case "signup_disabled":
      return "oauthUnavailable";

    default:
      return "genericError";
  }
}
