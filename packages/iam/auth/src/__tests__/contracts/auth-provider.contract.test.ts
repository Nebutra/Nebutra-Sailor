/**
 * AuthProvider contract tests — Phase 1.2.
 *
 * Verifies that the Better Auth provider implementation honors the
 * foundational runtime API surface:
 *
 *   • signIn(method): Promise<SignInResult>
 *   • signOut(req): Promise<void>
 *   • capabilities: Readonly<AuthCapabilities>
 *
 * Probe semantics: Better Auth introspects the live `auth.api` surface so
 * the probe reflects mounted plugins rather than config intent.
 *
 * Tests use vi.mock to swap out provider dependencies (better-auth) so we
 * can assert mapping behavior without a real database or HTTP stack.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { AuthCapabilities } from "../../types";

// ─── Logger mock (shared by all provider tests) ───
vi.mock("@nebutra/logger", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

const ORIGINAL_ENV = { ...process.env };

beforeEach(() => {
  process.env.BETTER_AUTH_SECRET = "test-secret-not-real";
  process.env.AUTH_SECRET = "test-secret-not-real";
  process.env.DATABASE_URL = "postgresql://localhost/test";
});

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
  vi.restoreAllMocks();
});

// ─── Shared capability-shape assertion ───

function assertCapabilitiesShape(caps: AuthCapabilities): void {
  expect(typeof caps.passkeys).toBe("boolean");
  expect(typeof caps.organizations).toBe("boolean");
  expect(typeof caps.twoFactor).toBe("boolean");
  expect(typeof caps.magicLink).toBe("boolean");
  expect(typeof caps.impersonation).toBe("boolean");
}

// ─── Better Auth ───
//
// We mock the dynamic `better-auth` import so the provider's lazy init can
// assemble an auth instance whose `api` surface reflects exactly the plugins
// we want to test. The probe must read from `auth.api` keys.

describe("Better Auth provider — signIn/signOut/capabilities contract", () => {
  it("exposes signIn, signOut, and capabilities on the returned provider", async () => {
    const { createBetterAuthProvider } = await import("../../providers/better-auth");
    const provider = createBetterAuthProvider({ provider: "better-auth" });
    expect(typeof provider.signIn).toBe("function");
    expect(typeof provider.signOut).toBe("function");
    expect(provider.capabilities).toBeDefined();
  });

  it("capabilities object matches AuthCapabilities shape", async () => {
    const { createBetterAuthProvider } = await import("../../providers/better-auth");
    const provider = createBetterAuthProvider({ provider: "better-auth" });
    assertCapabilitiesShape(provider.capabilities);
  });

  it("capabilities reports all false before initAuth runs (lazy + no plugins)", async () => {
    // The first read of `.capabilities` happens before any API call → probe
    // must default to a safe all-false reading until init resolves.
    const { createBetterAuthProvider } = await import("../../providers/better-auth");
    const provider = createBetterAuthProvider({ provider: "better-auth" });
    expect(provider.capabilities).toEqual({
      passkeys: false,
      organizations: false,
      twoFactor: false,
      magicLink: false,
      impersonation: false,
    });
  });

  it("probeCapabilities() reports true for organizations + passkeys when those auth.api methods are present", async () => {
    // Build a fake auth instance whose `api` simulates orgs + passkeys plugins.
    const fakeAuth = {
      api: {
        signInEmail: vi.fn(),
        signOut: vi.fn(),
        listOrganizations: vi.fn(),
        signInPasskey: vi.fn(),
      },
    };
    const { probeBetterAuthCapabilities } = await import("../../providers/better-auth");
    const caps = probeBetterAuthCapabilities(fakeAuth);
    expect(caps.organizations).toBe(true);
    expect(caps.passkeys).toBe(true);
    expect(caps.twoFactor).toBe(false);
    expect(caps.magicLink).toBe(false);
    expect(caps.impersonation).toBe(false);
  });

  it("probeCapabilities() reports true for twoFactor + magicLink when those auth.api methods are present", async () => {
    const fakeAuth = {
      api: {
        signInEmail: vi.fn(),
        signOut: vi.fn(),
        verifyTwoFactor: vi.fn(),
        signInMagicLink: vi.fn(),
      },
    };
    const { probeBetterAuthCapabilities } = await import("../../providers/better-auth");
    const caps = probeBetterAuthCapabilities(fakeAuth);
    expect(caps.twoFactor).toBe(true);
    expect(caps.magicLink).toBe(true);
    expect(caps.organizations).toBe(false);
    expect(caps.passkeys).toBe(false);
  });

  it("probeCapabilities() reports all false when only the base auth.api is present (no plugins)", async () => {
    const fakeAuth = {
      api: {
        signInEmail: vi.fn(),
        signOut: vi.fn(),
        signUpEmail: vi.fn(),
      },
    };
    const { probeBetterAuthCapabilities } = await import("../../providers/better-auth");
    const caps = probeBetterAuthCapabilities(fakeAuth);
    expect(caps).toEqual({
      passkeys: false,
      organizations: false,
      twoFactor: false,
      magicLink: false,
      impersonation: false,
    });
  });
});
