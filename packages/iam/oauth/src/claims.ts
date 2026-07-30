/**
 * Nebutra OIDC Claims Configuration
 *
 * Defines what user data is returned for each OAuth scope.
 * This maps Nebutra's internal user model to standard OIDC claims
 * plus Nebutra-specific custom claims.
 */

/**
 * Scope-to-claims mapping for oidc-provider.
 * Standard OIDC scopes + Nebutra platform scopes.
 */
export const NEBUTRA_CLAIMS = {
  // Standard OIDC scopes
  openid: ["sub"],
  profile: ["name", "picture", "updated_at"],
  email: ["email", "email_verified"],

  // Nebutra platform scopes
  "organization:read": [
    "nebutra:organization_id",
    "nebutra:organization_name",
    "nebutra:organization_slug",
    "nebutra:role",
    "nebutra:plan",
  ],
  "organization:write": [
    "nebutra:organization_id",
    "nebutra:organization_name",
    "nebutra:organization_slug",
    "nebutra:role",
    "nebutra:plan",
  ],
  "content:read": ["nebutra:organization_id"],
  "content:write": ["nebutra:organization_id"],
  "billing:read": ["nebutra:organization_id", "nebutra:plan"],
};

/**
 * Protocol scopes that carry no claims, so they cannot come from NEBUTRA_CLAIMS.
 *
 * `offline_access` is the one that matters and its absence was not cosmetic:
 * oidc-provider derives `grant_types_supported` from what it can actually do, and
 * it only enables the refresh_token grant when offline_access is a supported
 * scope. Without it the issuer advertised
 * `grant_types_supported: ["implicit","authorization_code"]` and rejected any
 * client listing refresh_token with
 * `invalid_client_metadata: grant_types can only contain 'implicit' or
 * 'authorization_code'` — while provider.ts configured a 30-day RefreshToken TTL
 * and its docblock promised "Token refresh" in three places. Three statements of
 * intent, no capability, and the only symptom was a 400 at /auth for an otherwise
 * correctly registered client.
 *
 * Deriving scopes from the claims map is what hid it: a scope with no claims
 * silently never reaches the provider.
 */
export const PROTOCOL_SCOPES = ["offline_access"] as const;

/**
 * All supported scopes — claims-bearing scopes plus the protocol scopes above.
 */
export const SUPPORTED_SCOPES = [...Object.keys(NEBUTRA_CLAIMS), ...PROTOCOL_SCOPES];

/**
 * Human-readable scope descriptions for the consent screen.
 */
export const SCOPE_DESCRIPTIONS: Record<string, { label: string; description: string }> = {
  openid: {
    label: "OpenID",
    description: "Verify your identity",
  },
  profile: {
    label: "Profile",
    description: "Access your name and profile picture",
  },
  email: {
    label: "Email",
    description: "Access your email address",
  },
  "organization:read": {
    label: "Organization (Read)",
    description: "View your organization name, plan, and your role",
  },
  "organization:write": {
    label: "Organization (Write)",
    description: "Modify your organization settings",
  },
  "content:read": {
    label: "Content (Read)",
    description: "Read your content and documents",
  },
  "content:write": {
    label: "Content (Write)",
    description: "Create and edit content on your behalf",
  },
  "billing:read": {
    label: "Billing (Read)",
    description: "View your subscription and billing information",
  },
  // Present so the consent screen never shows a bare scope identifier. What the
  // user is actually agreeing to is continued access without signing in again,
  // which is worth saying plainly rather than as "offline_access".
  offline_access: {
    label: "Stay signed in",
    description: "Keep access when you are not using the app, until you revoke it",
  },
};
