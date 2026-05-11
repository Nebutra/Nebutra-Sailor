import { describe, expect, it } from "vitest";
import { buildSecurityCapabilities, type SecurityAccountRecord } from "../security-capabilities";

const credentialAccount: SecurityAccountRecord = {
  id: "acct_credential",
  providerId: "credential",
};

const googleAccount: SecurityAccountRecord = {
  id: "acct_google",
  providerId: "google",
};

describe("buildSecurityCapabilities", () => {
  describe("non-better-auth providers", () => {
    it("disables every capability when provider is clerk", () => {
      const caps = buildSecurityCapabilities({
        accounts: [credentialAccount],
        authProvider: "clerk",
      });

      expect(caps.activeSessions.available).toBe(false);
      expect(caps.connectedAccounts.available).toBe(false);
      expect(caps.connectedAccounts.linkedProviders).toEqual([]);
      expect(caps.passkeys.available).toBe(false);
      expect(caps.password.available).toBe(false);
      expect(caps.password.hasPasswordAccount).toBe(false);
      expect(caps.twoFactor.available).toBe(false);
      expect(caps.twoFactor.reason).toContain("clerk");
    });

    it("includes the provider name in the reason text", () => {
      const caps = buildSecurityCapabilities({
        accounts: [],
        authProvider: "clerk",
      });

      expect(caps.activeSessions.reason).toContain("clerk");
      expect(caps.passkeys.reason).toContain("clerk");
    });
  });

  describe("better-auth provider", () => {
    it("enables 2FA when the account has a credential (password) sign-in attached", () => {
      const caps = buildSecurityCapabilities({
        accounts: [credentialAccount],
        authProvider: "better-auth",
      });

      expect(caps.twoFactor.available).toBe(true);
      expect(caps.twoFactor.requiresPasswordAccount).toBe(false);
      expect(caps.twoFactor.reason).toMatch(/authenticator app|TOTP/i);
    });

    it("disables 2FA when no credential account is present (oauth-only sign-in)", () => {
      const caps = buildSecurityCapabilities({
        accounts: [googleAccount],
        authProvider: "better-auth",
      });

      expect(caps.twoFactor.available).toBe(false);
      expect(caps.twoFactor.requiresPasswordAccount).toBe(true);
      expect(caps.twoFactor.reason).toMatch(/credential sign-in/i);
    });

    it("flags hasPasswordAccount when a credential account is linked", () => {
      const caps = buildSecurityCapabilities({
        accounts: [credentialAccount, googleAccount],
        authProvider: "better-auth",
      });

      expect(caps.password.available).toBe(true);
      expect(caps.password.hasPasswordAccount).toBe(true);
    });

    it("returns linked providers excluding credential entries", () => {
      const caps = buildSecurityCapabilities({
        accounts: [credentialAccount, googleAccount, { id: "g", providerId: "github" }],
        authProvider: "better-auth",
      });

      expect(caps.connectedAccounts.linkedProviders).toEqual(["google", "github"]);
    });

    it("keeps active sessions available regardless of credential linkage", () => {
      const credentialCaps = buildSecurityCapabilities({
        accounts: [credentialAccount],
        authProvider: "better-auth",
      });
      const oauthOnlyCaps = buildSecurityCapabilities({
        accounts: [googleAccount],
        authProvider: "better-auth",
      });

      expect(credentialCaps.activeSessions.available).toBe(true);
      expect(oauthOnlyCaps.activeSessions.available).toBe(true);
    });
  });

  describe("Phase 2.4 feature-flag gating", () => {
    it("keeps passkeys unavailable when featureFlags.passkeys is omitted (legacy default)", () => {
      const caps = buildSecurityCapabilities({
        accounts: [credentialAccount],
        authProvider: "better-auth",
      });

      expect(caps.passkeys.available).toBe(false);
      expect(caps.passkeys.reason).toMatch(/feature flag|not exposed/i);
    });

    it("flips passkeys available when featureFlags.passkeys is true", () => {
      const caps = buildSecurityCapabilities({
        accounts: [credentialAccount],
        authProvider: "better-auth",
        featureFlags: { passkeys: true },
      });

      expect(caps.passkeys.available).toBe(true);
      expect(caps.passkeys.reason).toMatch(/passkey/i);
    });

    it("gates twoFactor on the feature flag in addition to credential account", () => {
      const flagOff = buildSecurityCapabilities({
        accounts: [credentialAccount],
        authProvider: "better-auth",
        featureFlags: { twoFactor: false },
      });

      expect(flagOff.twoFactor.available).toBe(false);
      expect(flagOff.twoFactor.reason).toMatch(/feature flag/i);
    });

    it("keeps twoFactor available with explicit flag-on + credential account", () => {
      const caps = buildSecurityCapabilities({
        accounts: [credentialAccount],
        authProvider: "better-auth",
        featureFlags: { twoFactor: true },
      });

      expect(caps.twoFactor.available).toBe(true);
    });

    it("keeps twoFactor unavailable when flag is on but no credential account", () => {
      const caps = buildSecurityCapabilities({
        accounts: [googleAccount],
        authProvider: "better-auth",
        featureFlags: { twoFactor: true },
      });

      expect(caps.twoFactor.available).toBe(false);
      expect(caps.twoFactor.requiresPasswordAccount).toBe(true);
    });
  });
});
