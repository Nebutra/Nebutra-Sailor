import { afterEach, describe, expect, it } from "vitest";
import {
  buildAuthCenterSignInUrl,
  buildAuthCenterSignUpUrl,
  getAuthCenterOrigin,
  getAuthReturnAllowedHosts,
} from "../utils/auth-center";

describe("auth center URL helpers", () => {
  afterEach(() => {
    for (const key of [
      "NEXT_PUBLIC_AUTH_URL",
      "BETTER_AUTH_URL",
      "NEXT_PUBLIC_APP_URL",
      "AUTH_RETURN_ALLOWED_HOSTS",
    ]) {
      delete process.env[key];
    }
  });

  it("prefers NEXT_PUBLIC_AUTH_URL for the center origin", () => {
    process.env.NEXT_PUBLIC_AUTH_URL = "https://auth.nebutra.com/";
    process.env.BETTER_AUTH_URL = "https://app.nebutra.com";
    expect(getAuthCenterOrigin()).toBe("https://auth.nebutra.com");
  });

  it("builds sign-in URL with returnTo", () => {
    process.env.NEXT_PUBLIC_AUTH_URL = "https://auth.nebutra.com";
    expect(buildAuthCenterSignInUrl("https://app.nebutra.com/dashboard")).toBe(
      "https://auth.nebutra.com/sign-in?returnTo=https%3A%2F%2Fapp.nebutra.com%2Fdashboard",
    );
  });

  it("builds sign-up URL", () => {
    process.env.NEXT_PUBLIC_AUTH_URL = "https://auth.nebutra.com";
    expect(buildAuthCenterSignUpUrl()).toBe("https://auth.nebutra.com/sign-up");
  });

  it("includes production hosts in return allowlist", () => {
    const hosts = getAuthReturnAllowedHosts({
      NEXT_PUBLIC_APP_URL: "https://app.nebutra.com",
      AUTH_RETURN_ALLOWED_HOSTS: "console.nebutra.com",
    });
    expect(hosts).toContain("app.nebutra.com");
    expect(hosts).toContain("auth.nebutra.com");
    expect(hosts).toContain("console.nebutra.com");
  });
});
