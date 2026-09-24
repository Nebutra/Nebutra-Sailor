import { describe, expect, it } from "vitest";
import { getSecurityCapabilities } from "../security-capabilities";

describe("getSecurityCapabilities", () => {
  it("returns full capabilities for the better-auth provider", () => {
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
});
