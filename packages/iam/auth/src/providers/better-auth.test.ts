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

import { getSystemDb } from "@nebutra/db";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  createBetterAuthProvider,
  loadBetterAuthOneTapPlugin,
  resolveBetterAuthPrismaClient,
  resolveBetterAuthTrustedOrigins,
} from "./better-auth";

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

describe("Better Auth trusted origins (cross-origin One Tap / OAuth)", () => {
  beforeEach(() => {
    for (const key of [
      "BETTER_AUTH_URL",
      "NEXT_PUBLIC_SITE_URL",
      "NEXT_PUBLIC_APP_URL",
      "NEBUTRA_LANDING_ORIGIN",
      "BETTER_AUTH_TRUSTED_ORIGINS",
    ]) {
      delete process.env[key];
    }
  });

  it("returns [] when no cross-origin env is configured (keeps BA single-origin default)", () => {
    expect(resolveBetterAuthTrustedOrigins()).toEqual([]);
  });

  it("collects, trims, and dedupes first-party origins so the landing One Tap is trusted", () => {
    process.env.BETTER_AUTH_URL = "https://app.nebutra.com";
    process.env.NEXT_PUBLIC_SITE_URL = "https://nebutra.com";
    process.env.NEXT_PUBLIC_APP_URL = "https://app.nebutra.com"; // duplicate of BETTER_AUTH_URL
    process.env.BETTER_AUTH_TRUSTED_ORIGINS = " https://staging.nebutra.com , ";

    expect(resolveBetterAuthTrustedOrigins()).toEqual([
      "https://app.nebutra.com",
      "https://nebutra.com",
      "https://staging.nebutra.com",
    ]);
  });
});

describe("Better Auth Prisma client resolution", () => {
  it("uses @nebutra/db getSystemDb when no legacy prisma export exists", async () => {
    const dbModule = (await import("@nebutra/db")) as Record<string, unknown>;

    expect(dbModule.prisma).toBeUndefined();
    await expect(resolveBetterAuthPrismaClient({ provider: "better-auth" })).resolves.toBe(
      getSystemDb(),
    );
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
    process.env.GOOGLE_CLIENT_ID = "google-client";
    process.env.GOOGLE_CLIENT_SECRET = "google-secret";

    await expect(loadBetterAuthOneTapPlugin()).resolves.toMatchObject({
      id: "one-tap",
      options: { clientId: "google-client" },
    });
  });
});
