/**
 * Static multi-provider matrix — product-facing contract for parallel providers.
 *
 * Two layers of truth:
 *   1. **Declared matrix** (this file) — what we *intend* each provider to support
 *      and its product tier (first-class vs migration-only).
 *   2. **Runtime probe** (`AuthProvider.capabilities`) — what the live adapter
 *      actually mounted (plugins, env, SDK availability).
 *
 * UI / product code must AND both:
 *   declared.supports.X && runtime.capabilities.X
 *
 * Multi-provider parallel is intentional (platform scaffolding). The single
 * product import surface remains `@nebutra/auth` — apps must not import
 * `@clerk/*`, `better-auth`, or `next-auth` outside allowlisted adapter paths.
 */

import type { AuthCapabilities, AuthProviderId } from "./types";

/** How seriously product surfaces treat a provider. */
export type AuthProviderTier =
  /** Default / production path; full CI + docs. */
  | "first-class"
  /** Supported enterprise option; smoke-tested, not the default. */
  | "optional-enterprise"
  /** Scaffold / migration only; no product feature guarantee. */
  | "migration"
  /** Local synthetic sessions; never production. */
  | "dev-only";

export interface AuthProviderProfile {
  readonly id: AuthProviderId;
  readonly tier: AuthProviderTier;
  /**
   * Declared capability intent for this provider.
   * Runtime probe may still be false if plugins failed to load.
   */
  readonly supports: Readonly<AuthCapabilities>;
  /** Short product note for operators / Create Sailor. */
  readonly notes: string;
}

const none: AuthCapabilities = {
  passkeys: false,
  organizations: false,
  twoFactor: false,
  magicLink: false,
  impersonation: false,
};

/**
 * Canonical matrix. Keep in sync with adapter implementations and README.
 * Impersonation is intentionally **unsupported** across the board until a
 * provider adapter implements it end-to-end (no half-cookie product path).
 */
export const AUTH_PROVIDER_MATRIX: Readonly<Record<AuthProviderId, AuthProviderProfile>> = {
  "better-auth": {
    id: "better-auth",
    tier: "first-class",
    supports: {
      passkeys: true,
      organizations: true,
      twoFactor: true,
      magicLink: true,
      impersonation: false,
    },
    notes: "Default self-hosted path. Runtime probe reflects mounted plugins.",
  },
  clerk: {
    id: "clerk",
    tier: "optional-enterprise",
    supports: {
      passkeys: true,
      organizations: true,
      twoFactor: true,
      magicLink: false,
      impersonation: false,
    },
    notes:
      "Enterprise option. Bridge adapter; some flows use Clerk-native client APIs via package wrappers.",
  },
  nextauth: {
    id: "nextauth",
    tier: "migration",
    supports: { ...none },
    notes: "Migration / scaffold only. Core session only; optional capabilities stay off.",
  },
  supabase: {
    id: "supabase",
    tier: "migration",
    supports: { ...none },
    notes: "Scaffold / experimental. Not a product CI path.",
  },
  dev: {
    id: "dev",
    tier: "dev-only",
    supports: {
      passkeys: false,
      organizations: true,
      twoFactor: false,
      magicLink: false,
      impersonation: false,
    },
    notes: "Synthetic sessions for local AUTH_PROVIDER=dev only.",
  },
};

export function getAuthProviderProfile(id: AuthProviderId): AuthProviderProfile {
  return AUTH_PROVIDER_MATRIX[id];
}

/** Declared (static) support for a capability — not the runtime probe. */
export function isCapabilityDeclared(
  provider: AuthProviderId,
  capability: keyof AuthCapabilities,
): boolean {
  return AUTH_PROVIDER_MATRIX[provider].supports[capability] === true;
}

/**
 * Effective support: declared matrix AND runtime probe.
 * Prefer this for UI gates when you have a live AuthProvider instance.
 */
export function isCapabilityEffective(
  provider: AuthProviderId,
  capability: keyof AuthCapabilities,
  runtime: Readonly<AuthCapabilities> | null | undefined,
): boolean {
  if (!isCapabilityDeclared(provider, capability)) return false;
  if (!runtime) return false;
  return runtime[capability] === true;
}

/** Providers that product surfaces may recommend in docs / preset. */
export function listFirstClassAuthProviders(): AuthProviderId[] {
  return (Object.keys(AUTH_PROVIDER_MATRIX) as AuthProviderId[]).filter(
    (id) =>
      AUTH_PROVIDER_MATRIX[id].tier === "first-class" ||
      AUTH_PROVIDER_MATRIX[id].tier === "optional-enterprise",
  );
}
