import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("getSecurityCapabilities", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns full capabilities for better-auth provider", async () => {
    vi.stubEnv("NEXT_PUBLIC_AUTH_PROVIDER", "better-auth");
    const { getSecurityCapabilities } = await import("../security-capabilities");
    const caps = getSecurityCapabilities();
    expect(caps).toMatchObject({
      provider: "better-auth",
      supportsChangePassword: true,
      supportsTwoFactor: true,
      supportsActiveSessions: true,
      supportsDeleteAccount: true,
      providerProfileUrl: null,
    });
  });

  it("disables all capabilities for clerk and exposes profile URL", async () => {
    vi.stubEnv("NEXT_PUBLIC_AUTH_PROVIDER", "clerk");
    vi.stubEnv("NEXT_PUBLIC_CLERK_USER_PROFILE_URL", "/clerk-account");
    const { getSecurityCapabilities } = await import("../security-capabilities");
    const caps = getSecurityCapabilities();
    expect(caps).toMatchObject({
      provider: "clerk",
      supportsChangePassword: false,
      supportsTwoFactor: false,
      supportsActiveSessions: false,
      supportsDeleteAccount: false,
      providerProfileUrl: "/clerk-account",
    });
  });

  it("falls back to /account when clerk profile URL not configured", async () => {
    vi.stubEnv("NEXT_PUBLIC_AUTH_PROVIDER", "clerk");
    vi.stubEnv("NEXT_PUBLIC_CLERK_USER_PROFILE_URL", "");
    const { getSecurityCapabilities } = await import("../security-capabilities");
    const caps = getSecurityCapabilities();
    expect(caps.providerProfileUrl).toBe("/account");
  });

  it("defaults to better-auth when env unset", async () => {
    vi.stubEnv("NEXT_PUBLIC_AUTH_PROVIDER", "");
    vi.stubEnv("AUTH_PROVIDER", "");
    const { getSecurityCapabilities } = await import("../security-capabilities");
    const caps = getSecurityCapabilities();
    expect(caps.provider).toBe("better-auth");
  });
});
