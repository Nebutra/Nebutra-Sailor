import type { AuthProviderId } from "@nebutra/auth";

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
  return {
    provider: "better-auth",
    supportsChangePassword: true,
    supportsTwoFactor: true,
    supportsActiveSessions: true,
    supportsDeleteAccount: true,
    providerProfileUrl: null,
  };
}
