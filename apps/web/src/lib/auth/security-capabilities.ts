export type AuthProviderId = "clerk" | "better-auth";

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

const ENV_PROVIDER =
  process.env.NEXT_PUBLIC_AUTH_PROVIDER ?? process.env.AUTH_PROVIDER ?? "better-auth";

function readProvider(): AuthProviderId {
  return ENV_PROVIDER === "clerk" ? "clerk" : "better-auth";
}

export function getSecurityCapabilities(): SecurityCapabilities {
  const provider = readProvider();

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

  return {
    provider: "better-auth",
    supportsChangePassword: true,
    supportsTwoFactor: true,
    supportsActiveSessions: true,
    supportsDeleteAccount: true,
    providerProfileUrl: null,
  };
}
