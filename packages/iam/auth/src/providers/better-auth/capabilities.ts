import type { AuthCapabilities } from "../../types";

/**
 * Sentinel auth.api method names mapped to capabilities.
 *
 * Better Auth surfaces plugin functionality as additional methods on
 * `auth.api` after plugins are registered. We probe by checking for the
 * presence of one canonical method per plugin. If you add a new plugin
 * and want to flip a capability, extend this map.
 *
 * Exported for tests so the probe contract is documented + verifiable.
 */
export const BETTER_AUTH_CAPABILITY_PROBES = {
  organizations: ["listOrganizations", "createOrganization", "getFullOrganization"],
  passkeys: ["signInPasskey", "generatePasskeyAuthenticationOptions", "verifyPasskey"],
  twoFactor: ["verifyTwoFactor", "enableTwoFactor", "disableTwoFactor", "verifyTOTP"],
  magicLink: ["signInMagicLink", "verifyMagicLink"],
} as const;

/**
 * Probe a live Better Auth instance to see which plugins actually mounted.
 *
 * Better Auth's plugin loading is best-effort — if a plugin module is missing
 * (e.g. `better-auth/plugins/passkey` not in the `exports` map) we log a
 * warning and continue. The probe checks `auth.api` for the presence of
 * sentinel method names so the resulting `AuthCapabilities` reflects the
 * actual runtime surface, not config intent. Impersonation is currently not
 * available as a first-class Better Auth plugin → always `false`.
 */
export function probeBetterAuthCapabilities(
  auth: { api?: Record<string, unknown> } | null | undefined,
): AuthCapabilities {
  const api = (auth?.api ?? {}) as Record<string, unknown>;
  const has = (names: readonly string[]): boolean =>
    names.some((name) => typeof api[name] === "function");
  return {
    organizations: has(BETTER_AUTH_CAPABILITY_PROBES.organizations),
    passkeys: has(BETTER_AUTH_CAPABILITY_PROBES.passkeys),
    twoFactor: has(BETTER_AUTH_CAPABILITY_PROBES.twoFactor),
    magicLink: has(BETTER_AUTH_CAPABILITY_PROBES.magicLink),
    impersonation: false,
  };
}

export const ALL_FALSE_CAPABILITIES: AuthCapabilities = Object.freeze({
  passkeys: false,
  organizations: false,
  twoFactor: false,
  magicLink: false,
  impersonation: false,
});
