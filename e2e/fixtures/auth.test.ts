import { describe, expect, it } from "vitest";

import { getAuthCapabilityStatus, getConfiguredSessionCookie, getSampleUser } from "./auth";

describe("auth E2E fixture configuration", () => {
  it("does not treat placeholders as runnable auth runtime config", () => {
    const status = getAuthCapabilityStatus("auth-runtime", {
      E2E_LIVE: "1",
      NEXT_PUBLIC_AUTH_PROVIDER: "clerk",
      NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: "pk_test_placeholder",
      CLERK_SECRET_KEY: "sk_test_placeholder",
    });

    expect(status.ready).toBe(false);
    expect(status.reason).toContain("NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY");
    expect(status.reason).toContain("CLERK_SECRET_KEY");
  });

  it("requires an explicit live target before auth-gated tests run", () => {
    const status = getAuthCapabilityStatus("ui-sign-in", {
      NEXT_PUBLIC_AUTH_PROVIDER: "better-auth",
      BETTER_AUTH_SECRET: "test-secret-with-enough-length",
      DATABASE_URL: "postgresql://test.invalid/nebutra",
      E2E_TEST_USER_EMAIL: "tester@example.test",
      E2E_TEST_USER_PASSWORD: "correct-horse-battery-staple",
    });

    expect(status.ready).toBe(false);
    expect(status.reason).toContain("E2E_LIVE=1");
  });

  it("marks UI sign-in runnable when live runtime and seeded credentials are configured", () => {
    const status = getAuthCapabilityStatus("ui-sign-in", {
      E2E_LIVE: "true",
      NEXT_PUBLIC_AUTH_PROVIDER: "better-auth",
      BETTER_AUTH_SECRET: "test-secret-with-enough-length",
      DATABASE_URL: "postgresql://test.invalid/nebutra",
      E2E_TEST_USER_EMAIL: "tester@example.test",
      E2E_TEST_USER_PASSWORD: "correct-horse-battery-staple",
    });

    expect(status.ready).toBe(true);
    expect(status.reason).toBe("configured");
  });

  it("builds a real session cookie only from explicit non-placeholder values", () => {
    expect(
      getConfiguredSessionCookie({
        E2E_LIVE: "1",
        NEXT_PUBLIC_AUTH_PROVIDER: "better-auth",
        BETTER_AUTH_SECRET: "test-secret-with-enough-length",
        DATABASE_URL: "postgresql://test.invalid/nebutra",
        E2E_SESSION_COOKIE_VALUE: "placeholder-session-value",
      }),
    ).toBeNull();

    expect(
      getConfiguredSessionCookie({
        E2E_LIVE: "1",
        NEXT_PUBLIC_AUTH_PROVIDER: "better-auth",
        BETTER_AUTH_SECRET: "test-secret-with-enough-length",
        DATABASE_URL: "postgresql://test.invalid/nebutra",
        APP_BASE_URL: "https://app.example.test",
        E2E_SESSION_COOKIE_VALUE: "session_real_value",
      }),
    ).toMatchObject({
      name: "better-auth.session_token",
      value: "session_real_value",
      domain: "app.example.test",
      secure: true,
    });
  });

  it("reads seeded user credentials from env instead of using checked-in secrets", () => {
    expect(
      getSampleUser({
        E2E_TEST_USER_EMAIL: "seeded@example.test",
        E2E_TEST_USER_PASSWORD: "seeded-password",
        E2E_TEST_USER_NAME: "Seeded User",
      }),
    ).toEqual({
      email: "seeded@example.test",
      password: "seeded-password",
      displayName: "Seeded User",
    });
  });
});
