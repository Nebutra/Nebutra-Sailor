import { describe, expect, it } from "vitest";
import { buildSecurityCapabilities } from "@/components/settings/security/security-capabilities";

describe("security settings capabilities", () => {
  it("marks Better Auth credential accounts as session-capable but mutation-degraded", () => {
    expect(
      buildSecurityCapabilities({
        accounts: [
          { id: "credential_account", providerId: "credential" },
          { id: "github_account", providerId: "github" },
        ],
        authProvider: "better-auth",
      }),
    ).toEqual({
      activeSessions: {
        available: true,
        reason: "Active sessions are managed by Nebutra through Better Auth session records.",
      },
      connectedAccounts: {
        available: true,
        linkedProviders: ["github"],
        reason:
          "Linked sign-in methods can be discovered, but linking and unlinking providers is not exposed in Nebutra yet.",
      },
      passkeys: {
        available: false,
        reason: "Passkey registration is not exposed by the shared Nebutra auth client yet.",
      },
      password: {
        available: true,
        hasPasswordAccount: true,
        reason:
          "Credential sign-in is attached, but in-app password rotation is not exposed by the shared Nebutra auth client yet.",
      },
      twoFactor: {
        available: false,
        requiresPasswordAccount: false,
        reason: "Two-factor setup is not exposed by the shared Nebutra auth client yet.",
      },
    });
  });

  it("degrades auth-provider-specific settings outside Better Auth", () => {
    expect(
      buildSecurityCapabilities({
        accounts: [],
        authProvider: "clerk",
      }),
    ).toMatchObject({
      activeSessions: {
        available: false,
        reason: "Session management is delegated to clerk.",
      },
      connectedAccounts: {
        available: false,
        linkedProviders: [],
      },
      password: {
        available: false,
        hasPasswordAccount: false,
      },
    });
  });
});
