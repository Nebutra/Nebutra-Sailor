export interface SecurityAccountRecord {
  id: string;
  providerId: string;
}

/**
 * Feature-flag inputs for the security area. Mirrors the {@link AuthFeature}
 * names from `@nebutra/auth`. Each flag is a separate kill-switch the operator
 * can flip from env (dev) or `@nebutra/feature-flags` (prod) without touching
 * UI code.
 *
 * When `undefined` we fall back to the legacy hardcoded defaults so existing
 * callers (and tests) keep their current behaviour.
 */
export interface SecurityFeatureFlags {
  /** Passkey registration UI — Phase 2.4 dev rollout gate. */
  passkeys?: boolean;
  /** TOTP enroll / disable UI — Phase 2.4 dev rollout gate. */
  twoFactor?: boolean;
}

interface BuildSecurityCapabilitiesInput {
  accounts: SecurityAccountRecord[];
  authProvider: string;
  /**
   * Optional feature-flag gates. When omitted, the legacy defaults stand:
   * passkeys=false (matches the existing "not wired" copy), twoFactor=true
   * (matches the pre-Phase-2.4 behaviour of gating only on credential account).
   */
  featureFlags?: SecurityFeatureFlags;
}

interface CapabilityState {
  available: boolean;
  reason: string;
}

export interface SecurityCapabilities {
  activeSessions: CapabilityState;
  connectedAccounts: CapabilityState & {
    linkedProviders: string[];
  };
  passkeys: CapabilityState;
  password: CapabilityState & {
    hasPasswordAccount: boolean;
  };
  twoFactor: CapabilityState & {
    requiresPasswordAccount: boolean;
  };
}

export function buildSecurityCapabilities({
  accounts,
  authProvider,
  featureFlags,
}: BuildSecurityCapabilitiesInput): SecurityCapabilities {
  const isBetterAuth = authProvider === "better-auth";
  const hasPasswordAccount = accounts.some((account) => account.providerId === "credential");
  const linkedProviders = accounts
    .map((account) => account.providerId)
    .filter((providerId) => providerId !== "credential");

  // Phase 2.4 dev rollout gates. Legacy defaults preserve prior behaviour:
  //   - passkeys: false (the existing "not wired" stub)
  //   - twoFactor: true (current behaviour — gated only on credential account)
  const passkeysFlagOn = featureFlags?.passkeys ?? false;
  const twoFactorFlagOn = featureFlags?.twoFactor ?? true;

  if (!isBetterAuth) {
    return {
      activeSessions: {
        available: false,
        reason: `Session management is delegated to ${authProvider}.`,
      },
      connectedAccounts: {
        available: false,
        linkedProviders: [],
        reason: `Linked account management is delegated to ${authProvider}.`,
      },
      passkeys: {
        available: false,
        reason: `Passkey management is delegated to ${authProvider}.`,
      },
      password: {
        available: false,
        hasPasswordAccount: false,
        reason: `Password management is delegated to ${authProvider}.`,
      },
      twoFactor: {
        available: false,
        requiresPasswordAccount: false,
        reason: `Two-factor setup is delegated to ${authProvider}.`,
      },
    };
  }

  return {
    activeSessions: {
      available: true,
      reason: "Active sessions are managed by Nebutra through Better Auth session records.",
    },
    connectedAccounts: {
      available: true,
      linkedProviders,
      reason:
        "Linked sign-in methods can be discovered, but linking and unlinking providers is not exposed in Nebutra yet.",
    },
    passkeys: {
      available: passkeysFlagOn,
      reason: passkeysFlagOn
        ? "Passkey registration is available. Register a device-bound credential for phishing-resistant sign-in."
        : "Passkey registration is gated behind the `auth.passkeys` feature flag. Set NEXT_PUBLIC_AUTH_PASSKEYS=1 to enable in development.",
    },
    password: {
      available: hasPasswordAccount,
      hasPasswordAccount,
      reason: hasPasswordAccount
        ? "Credential sign-in is attached, but in-app password rotation is not exposed by the shared Nebutra auth client yet."
        : "Password management is unavailable because this account does not use email/password sign-in.",
    },
    twoFactor: {
      available: twoFactorFlagOn && hasPasswordAccount,
      requiresPasswordAccount: !hasPasswordAccount,
      reason: !twoFactorFlagOn
        ? "Two-factor authentication is gated behind the `auth.twoFactor` feature flag. Set NEXT_PUBLIC_AUTH_TWO_FACTOR=1 to enable in development."
        : hasPasswordAccount
          ? "Two-factor authentication can be enabled with an authenticator app and a TOTP code."
          : "Two-factor setup requires a credential sign-in method first.",
    },
  };
}
