export interface SecurityAccountRecord {
  id: string;
  providerId: string;
}

interface BuildSecurityCapabilitiesInput {
  accounts: SecurityAccountRecord[];
  authProvider: string;
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
}: BuildSecurityCapabilitiesInput): SecurityCapabilities {
  const isBetterAuth = authProvider === "better-auth";
  const hasPasswordAccount = accounts.some((account) => account.providerId === "credential");
  const linkedProviders = accounts
    .map((account) => account.providerId)
    .filter((providerId) => providerId !== "credential");

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
      available: false,
      reason: "Passkey registration is not exposed by the shared Nebutra auth client yet.",
    },
    password: {
      available: hasPasswordAccount,
      hasPasswordAccount,
      reason: hasPasswordAccount
        ? "Credential sign-in is attached, but in-app password rotation is not exposed by the shared Nebutra auth client yet."
        : "Password management is unavailable because this account does not use email/password sign-in.",
    },
    twoFactor: {
      available: false,
      requiresPasswordAccount: !hasPasswordAccount,
      reason: hasPasswordAccount
        ? "Two-factor setup is not exposed by the shared Nebutra auth client yet."
        : "Two-factor setup requires a credential sign-in method first.",
    },
  };
}
