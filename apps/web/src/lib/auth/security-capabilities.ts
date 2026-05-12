import type { AuthProviderId } from "@nebutra/auth";
import { getConfiguredAuthProvider } from "@nebutra/auth";

export type { AuthProviderId };

export interface SecurityCapabilities {
  provider: AuthProviderId;
  supportsChangePassword: boolean;
  supportsTwoFactor: boolean;
  supportsActiveSessions: boolean;
  supportsDeleteAccount: boolean;
  /**
   * If non-null, the provider's hosted user profile URL.
   * UI should redirect users here for actions the provider owns.
   */
  providerProfileUrl: string | null;
}

export function getSecurityCapabilities(): SecurityCapabilities {
  const provider = getConfiguredAuthProvider();

  if (provider === "clerk") {
    const configuredProfileUrl = process.env.NEXT_PUBLIC_CLERK_USER_PROFILE_URL;
    return {
      provider,
      supportsChangePassword: false,
      supportsTwoFactor: false,
      supportsActiveSessions: false,
      supportsDeleteAccount: false,
      providerProfileUrl:
        configuredProfileUrl && configuredProfileUrl.length > 0 ? configuredProfileUrl : "/account",
    };
  }

  if (provider === "nextauth") {
    // NextAuth (Auth.js v5) capabilities depend on the configured adapter.
    // With the default JWT-only setup we ship, account-management actions
    // require the consumer to wire their own DB-backed flows. Conservative
    // default: report unsupported rather than rendering broken UI.
    return {
      provider,
      supportsChangePassword: false,
      supportsTwoFactor: false,
      supportsActiveSessions: false,
      supportsDeleteAccount: false,
      providerProfileUrl: null,
    };
  }

  return {
    provider: "better-auth",
    supportsChangePassword: true,
    supportsTwoFactor: true,
    supportsActiveSessions: true,
    supportsDeleteAccount: true,
    providerProfileUrl: null,
  };
}
