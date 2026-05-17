/**
 * Better Auth provider — construction-time + interface contract tests.
 *
 * Why these and not deeper method tests?
 *   The provider lazy-loads `better-auth` via dynamic import inside getAuth().
 *   Exercising getSession/getUser/getOrganization end-to-end requires mocking
 *   the entire better-auth surface AND a real Prisma client. That belongs in
 *   an integration test (with testcontainers), not a unit test.
 *
 *   What we cover here:
 *     - env-var validation (parallel to nextauth.test.ts pattern)
 *     - the AuthProvider interface contract (all required methods present)
 *     - conditional social provider env handling
 *
 *   Plugin paths (`better-auth/plugins/*`) are loaded via the variable-path
 *   `loadOptionalPlugin` helper so Vite skips static resolution at test time.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createBetterAuthProvider, loadBetterAuthOneTapPlugin } from "./better-auth";

const ORIGINAL_ENV = { ...process.env };

beforeEach(() => {
  process.env.BETTER_AUTH_SECRET = "test-secret-not-real";
  process.env.DATABASE_URL = "postgresql://localhost/test";
});

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
});

describe("createBetterAuthProvider env validation", () => {
  it("throws with explicit guidance when BETTER_AUTH_SECRET is missing", () => {
    delete process.env.BETTER_AUTH_SECRET;
    expect(() => createBetterAuthProvider({ provider: "better-auth" })).toThrow(
      /BETTER_AUTH_SECRET/,
    );
  });

  it("includes secret-generation hint in the error message", () => {
    delete process.env.BETTER_AUTH_SECRET;
    expect(() => createBetterAuthProvider({ provider: "better-auth" })).toThrow(
      /openssl rand -base64 32/,
    );
  });
});

describe("createBetterAuthProvider AuthProvider interface contract", () => {
  it("returns an object exposing every method consumers depend on", () => {
    const provider = createBetterAuthProvider({ provider: "better-auth" });

    // The AuthProvider contract — if any of these go missing the multi-provider
    // factory in server.ts will silently break for Better Auth callers.
    expect(provider.provider).toBe("better-auth");
    expect(typeof provider.getSession).toBe("function");
    expect(typeof provider.getUser).toBe("function");
    expect(typeof provider.createUser).toBe("function");
    expect(typeof provider.getOrganization).toBe("function");
    expect(typeof provider.getUserOrganizations).toBe("function");
    expect(typeof provider.createOrganization).toBe("function");
    expect(typeof provider.middleware).toBe("function");
    expect(typeof provider.handleWebhook).toBe("function");
  });

  it("middleware() returns a function (request handler shape)", () => {
    const provider = createBetterAuthProvider({ provider: "better-auth" });
    const handler = provider.middleware();
    expect(typeof handler).toBe("function");
  });
});

describe("createBetterAuthProvider conditional social providers", () => {
  it("does not throw when no OAuth credentials are set (plain email-only flow)", () => {
    delete process.env.GOOGLE_CLIENT_ID;
    delete process.env.GOOGLE_CLIENT_SECRET;
    delete process.env.GITHUB_CLIENT_ID;
    delete process.env.GITHUB_CLIENT_SECRET;
    expect(() => createBetterAuthProvider({ provider: "better-auth" })).not.toThrow();
  });

  it("accepts Google OAuth env pair", () => {
    process.env.GOOGLE_CLIENT_ID = "test-id";
    process.env.GOOGLE_CLIENT_SECRET = "test-secret";
    expect(() => createBetterAuthProvider({ provider: "better-auth" })).not.toThrow();
  });

  it("accepts GitHub OAuth env pair", () => {
    process.env.GITHUB_CLIENT_ID = "test-id";
    process.env.GITHUB_CLIENT_SECRET = "test-secret";
    expect(() => createBetterAuthProvider({ provider: "better-auth" })).not.toThrow();
  });
});

describe("Better Auth Google One Tap plugin loading", () => {
  afterEach(() => {
    vi.doUnmock("better-auth/plugins");
  });

  it("does not mount one-tap without Google OAuth client credentials", async () => {
    delete process.env.GOOGLE_CLIENT_ID;
    delete process.env.GOOGLE_CLIENT_SECRET;

    await expect(loadBetterAuthOneTapPlugin()).resolves.toBeUndefined();
  });

  it("loads Better Auth's official oneTap plugin with the Google client id", async () => {
    // resetModules clears vitest's import cache so the dynamic `await import`
    // inside loadBetterAuthOneTapPlugin picks up the doMock factory instead of
    // the real better-auth/plugins module that may already be in cache from
    // a sibling test.
    vi.resetModules();
    const oneTap = vi.fn((options: unknown) => ({ id: "one-tap", options }));
    vi.doMock("better-auth/plugins", () => ({ oneTap }));
    process.env.GOOGLE_CLIENT_ID = "google-client";
    process.env.GOOGLE_CLIENT_SECRET = "google-secret";

    await expect(loadBetterAuthOneTapPlugin()).resolves.toEqual({
      id: "one-tap",
      options: { clientId: "google-client" },
    });
    expect(oneTap).toHaveBeenCalledWith({ clientId: "google-client" });
  });
});
