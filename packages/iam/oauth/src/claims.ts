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
 * All supported scopes
 */
export const SUPPORTED_SCOPES = Object.keys(NEBUTRA_CLAIMS);

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
};
