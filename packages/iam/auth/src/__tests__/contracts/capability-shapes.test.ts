/**
 * AuthProvider capability-shape contract tests — Phase 1.3.
 *
 * Verifies the optional capability shapes (organizations, passkeys,
 * twoFactor, magicLink) on the AuthProvider interface:
 *
 *   • Better Auth's capability builders translate canonical method calls
 *     into the matching `auth.api.*` invocations (mocked here against a
 *     fake api surface — no DB needed).
 *   • The Better Auth provider gates each shape on its probe result —
 *     when a plugin sentinel is missing, the corresponding property is
 *     `undefined`.
 *   • Clerk + NextAuth deliberately do NOT expose canonical shapes
 *     (per ADR D2 — Clerk is "Maintain" tier, NextAuth is "core only").
 *
 * Builder-level tests use a synthetic `getApi` closure so we bypass the
 * lazy Prisma adapter init that `createBetterAuthProvider` performs.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Organization, SignInResult } from "../../types";

// ─── Logger mock (shared by all tests) ───
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

// ─── Builder tests — direct unit tests of the BA capability builders ───
//
// These bypass createBetterAuthProvider's lazy init entirely; each builder
// receives a synthetic `getApi` that returns whatever `auth.api` we want
// to simulate. This is the cleanest way to assert routing behavior without
// having to thread a real Prisma client through tests.

type ApiMap = Record<string, ReturnType<typeof vi.fn>>;
const apiOf =
  (map: ApiMap) =>
  // biome-ignore lint/suspicious/noExplicitAny: synthetic api surface
  async (): Promise<any> =>
    map;

describe("buildOrganizationsCapability — routes to auth.api.* endpoints", () => {
  it("create() delegates to auth.api.createOrganization and normalizes the result", async () => {
    const createOrganization = vi.fn(async () => ({
      id: "org_1",
      name: "Acme",
      slug: "acme",
      createdAt: "2026-01-01T00:00:00.000Z",
      metadata: "PRO",
    }));
    const api: ApiMap = { createOrganization };
    const { buildOrganizationsCapability } = await import("../../providers/better-auth");
    const orgs = buildOrganizationsCapability(apiOf(api));
    const result: Organization = await orgs.create({ name: "Acme" });
    expect(createOrganization).toHaveBeenCalledWith({
      body: { name: "Acme", slug: "acme" },
    });
    expect(result).toEqual(
      expect.objectContaining({
        id: "org_1",
        name: "Acme",
        slug: "acme",
        plan: "PRO",
      }),
    );
    expect(result.createdAt).toBeInstanceOf(Date);
  });

  it("create() generates a slug from the name when slug is omitted", async () => {
    const createOrganization = vi.fn(async () => ({
      id: "org_2",
      name: "Foo Bar Inc",
      slug: "foo-bar-inc",
      createdAt: new Date(),
    }));
    const { buildOrganizationsCapability } = await import("../../providers/better-auth");
    const orgs = buildOrganizationsCapability(apiOf({ createOrganization }));
    await orgs.create({ name: "Foo Bar Inc" });
    expect(createOrganization).toHaveBeenCalledWith({
      body: { name: "Foo Bar Inc", slug: "foo-bar-inc" },
    });
  });

  it("list() returns [] when listOrganizations is missing rather than throwing", async () => {
    const { buildOrganizationsCapability } = await import("../../providers/better-auth");
    const orgs = buildOrganizationsCapability(apiOf({}));
    const result = await orgs.list("user_1");
    expect(result).toEqual([]);
  });

  it("list() maps the BA response array through normalizeOrganization", async () => {
    const listOrganizations = vi.fn(async () => [
      { id: "o1", name: "One", slug: "one", createdAt: "2026-01-01" },
      { id: "o2", name: "Two", slug: "two", createdAt: "2026-02-01" },
    ]);
    const { buildOrganizationsCapability } = await import("../../providers/better-auth");
    const orgs = buildOrganizationsCapability(apiOf({ listOrganizations }));
    const result = await orgs.list("user_1");
    expect(result).toHaveLength(2);
    expect(result[0]?.id).toBe("o1");
    expect(result[1]?.slug).toBe("two");
  });

  it("setActive() forwards headers and organizationId to auth.api.setActiveOrganization", async () => {
    const setActiveOrganization = vi.fn(async () => undefined);
    const { buildOrganizationsCapability } = await import("../../providers/better-auth");
    const orgs = buildOrganizationsCapability(apiOf({ setActiveOrganization }));
    const req = new Request("http://x/test", { headers: { cookie: "session=abc" } });
    await orgs.setActive(req, "org_42");
    expect(setActiveOrganization).toHaveBeenCalledWith({
      headers: req.headers,
      body: { organizationId: "org_42" },
    });
  });

  it("invite() returns the invitationId from auth.api.createInvitation", async () => {
    const createInvitation = vi.fn(async () => ({ id: "inv_99" }));
    const { buildOrganizationsCapability } = await import("../../providers/better-auth");
    const orgs = buildOrganizationsCapability(apiOf({ createInvitation }));
    const result = await orgs.invite({
      email: "new@example.com",
      organizationId: "org_1",
      role: "member",
    });
    expect(result).toEqual({ invitationId: "inv_99" });
    expect(createInvitation).toHaveBeenCalledWith({
      body: { email: "new@example.com", organizationId: "org_1", role: "member" },
    });
  });

  it("acceptInvite() returns the resolved organizationId", async () => {
    const acceptInvitation = vi.fn(async () => ({ organizationId: "org_7" }));
    const { buildOrganizationsCapability } = await import("../../providers/better-auth");
    const orgs = buildOrganizationsCapability(apiOf({ acceptInvitation }));
    const result = await orgs.acceptInvite("inv_99", "user_1");
    expect(result).toEqual({ organizationId: "org_7" });
  });

  it("members() maps the BA listMembers response", async () => {
    const listMembers = vi.fn(async () => [
      { userId: "u1", role: "owner", createdAt: "2026-01-01" },
      { userId: "u2", role: "member", createdAt: "2026-02-01" },
    ]);
    const { buildOrganizationsCapability } = await import("../../providers/better-auth");
    const orgs = buildOrganizationsCapability(apiOf({ listMembers }));
    const result = await orgs.members("org_1");
    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({ userId: "u1", role: "owner" });
    expect(result[0]?.joinedAt).toBeInstanceOf(Date);
  });

  it("removeMember() and updateMemberRole() route to the matching endpoints", async () => {
    const removeMember = vi.fn(async () => undefined);
    const updateMemberRole = vi.fn(async () => undefined);
    const { buildOrganizationsCapability } = await import("../../providers/better-auth");
    const orgs = buildOrganizationsCapability(apiOf({ removeMember, updateMemberRole }));
    await orgs.removeMember("org_1", "user_1");
    await orgs.updateMemberRole("org_1", "user_1", "owner");
    expect(removeMember).toHaveBeenCalled();
    expect(updateMemberRole).toHaveBeenCalled();
  });
});

describe("buildPasskeysCapability — routes to passkey plugin endpoints", () => {
  it("register() returns the challenge from auth.api.generatePasskeyRegistrationOptions", async () => {
    const generatePasskeyRegistrationOptions = vi.fn(async () => ({
      challenge: "chal-abc",
      options: { rp: { id: "example.com" } },
    }));
    const { buildPasskeysCapability } = await import("../../providers/better-auth");
    const pk = buildPasskeysCapability(apiOf({ generatePasskeyRegistrationOptions }));
    const result = await pk.register({ userId: "user_1", name: "Yubikey" });
    expect(result.challenge).toBe("chal-abc");
    expect(generatePasskeyRegistrationOptions).toHaveBeenCalledWith({
      body: { userId: "user_1", name: "Yubikey" },
    });
  });

  it("authenticate() returns a SignInResult with ok:true on success", async () => {
    const verifyPasskey = vi.fn(async () => ({ user: { id: "user_1" } }));
    const { buildPasskeysCapability } = await import("../../providers/better-auth");
    const pk = buildPasskeysCapability(apiOf({ verifyPasskey }));
    const result: SignInResult = await pk.authenticate({
      challenge: "chal-xyz",
      response: { id: "credId" },
    });
    expect(result.ok).toBe(true);
    expect(result.userId).toBe("user_1");
  });

  it("authenticate() returns ok:false with unsupported when verifyPasskey is missing", async () => {
    const { buildPasskeysCapability } = await import("../../providers/better-auth");
    const pk = buildPasskeysCapability(apiOf({}));
    const result = await pk.authenticate({ challenge: "x", response: {} });
    expect(result.ok).toBe(false);
    expect(result.error?.code).toBe("unsupported");
  });

  it("list() maps the listPasskeys response", async () => {
    const listPasskeys = vi.fn(async () => [
      { id: "pk_1", name: "Yubikey", createdAt: "2026-01-01" },
    ]);
    const { buildPasskeysCapability } = await import("../../providers/better-auth");
    const pk = buildPasskeysCapability(apiOf({ listPasskeys }));
    const result = await pk.list("user_1");
    expect(result[0]?.id).toBe("pk_1");
    expect(result[0]?.name).toBe("Yubikey");
  });
});

describe("buildTwoFactorCapability — routes to two-factor plugin endpoints", () => {
  it("enroll() returns secret + otpauthUrl + backupCodes", async () => {
    const enableTwoFactor = vi.fn(async () => ({
      totpURI: "otpauth://totp/example?secret=ABC",
      secret: "ABC",
      backupCodes: ["c1", "c2"],
    }));
    const { buildTwoFactorCapability } = await import("../../providers/better-auth");
    const tf = buildTwoFactorCapability(apiOf({ enableTwoFactor }));
    const result = await tf.enroll("user_1");
    expect(result.secret).toBe("ABC");
    expect(result.otpauthUrl).toContain("otpauth://");
    expect(result.backupCodes).toEqual(["c1", "c2"]);
  });

  it("verify() returns ok:true when verifyTOTP succeeds", async () => {
    const verifyTOTP = vi.fn(async () => ({ success: true }));
    const { buildTwoFactorCapability } = await import("../../providers/better-auth");
    const tf = buildTwoFactorCapability(apiOf({ verifyTOTP }));
    const result = await tf.verify({ userId: "user_1", code: "123456" });
    expect(result.ok).toBe(true);
  });

  it("backupCodes() returns the codes from generateBackupCodes", async () => {
    const generateBackupCodes = vi.fn(async () => ({ backupCodes: ["new1", "new2"] }));
    const { buildTwoFactorCapability } = await import("../../providers/better-auth");
    const tf = buildTwoFactorCapability(apiOf({ generateBackupCodes }));
    const result = await tf.backupCodes("user_1");
    expect(result.codes).toEqual(["new1", "new2"]);
  });

  it("disable() throws when disableTwoFactor endpoint is missing", async () => {
    const { buildTwoFactorCapability } = await import("../../providers/better-auth");
    const tf = buildTwoFactorCapability(apiOf({}));
    await expect(tf.disable("user_1")).rejects.toThrow(/disableTwoFactor/);
  });
});

describe("buildMagicLinkCapability — routes to magic-link plugin endpoints", () => {
  it("send() returns ok:true on success and routes to signInMagicLink", async () => {
    const signInMagicLink = vi.fn(async () => ({ status: true }));
    const { buildMagicLinkCapability } = await import("../../providers/better-auth");
    const ml = buildMagicLinkCapability(apiOf({ signInMagicLink }));
    const result = await ml.send({ email: "user@example.com" });
    expect(result.ok).toBe(true);
    expect(signInMagicLink).toHaveBeenCalledWith({
      body: { email: "user@example.com" },
    });
  });

  it("send() passes redirectTo as callbackURL when provided", async () => {
    const signInMagicLink = vi.fn(async () => ({ status: true }));
    const { buildMagicLinkCapability } = await import("../../providers/better-auth");
    const ml = buildMagicLinkCapability(apiOf({ signInMagicLink }));
    await ml.send({ email: "user@example.com", redirectTo: "/dashboard" });
    expect(signInMagicLink).toHaveBeenCalledWith({
      body: { email: "user@example.com", callbackURL: "/dashboard" },
    });
  });

  it("verify() returns ok:true with userId when magicLinkVerify succeeds", async () => {
    const magicLinkVerify = vi.fn(async () => ({ user: { id: "user_1" } }));
    const { buildMagicLinkCapability } = await import("../../providers/better-auth");
    const ml = buildMagicLinkCapability(apiOf({ magicLinkVerify }));
    const result: SignInResult = await ml.verify("token-abc");
    expect(result.ok).toBe(true);
    expect(result.userId).toBe("user_1");
  });

  it("verify() returns ok:false with unsupported when magicLinkVerify is missing", async () => {
    const { buildMagicLinkCapability } = await import("../../providers/better-auth");
    const ml = buildMagicLinkCapability(apiOf({}));
    const result = await ml.verify("token");
    expect(result.ok).toBe(false);
    expect(result.error?.code).toBe("unsupported");
  });
});

// ─── Provider-level shape gating ───
//
// Verifies that the optional shape properties on the returned AuthProvider
// object correctly mirror the capability probe. For Better Auth we read
// capabilities from the freshly-constructed provider — before any plugin
// has been probed live, capabilities default to all-false, so every shape
// must be undefined.

describe("Better Auth provider — shape gating (no plugins probed yet)", () => {
  it("organizations, passkeys, twoFactor, magicLink are undefined before any plugin probes", async () => {
    const { createBetterAuthProvider } = await import("../../providers/better-auth");
    const provider = createBetterAuthProvider({ provider: "better-auth" });
    expect(provider.organizations).toBeUndefined();
    expect(provider.passkeys).toBeUndefined();
    expect(provider.twoFactor).toBeUndefined();
    expect(provider.magicLink).toBeUndefined();
  });

  it("AuthProvider type allows optional shapes — TypeScript compile-time gate", async () => {
    const { createBetterAuthProvider } = await import("../../providers/better-auth");
    const provider = createBetterAuthProvider({ provider: "better-auth" });
    // Type-narrowing — apps must guard before calling.
    if (provider.capabilities.organizations && provider.organizations) {
      // Reachable only when plugin is mounted.
      expect(typeof provider.organizations.create).toBe("function");
    }
    // Safe call site even without a guard (just verifies the optional chain compiles).
    expect(provider.organizations?.create).toBeUndefined();
  });
});

// ─── Clerk: deliberately no canonical shapes (per ADR D2) ───

describe("Clerk provider — does NOT expose canonical capability shapes (D2)", () => {
  it("capabilities.passkeys is true but provider.passkeys is undefined", async () => {
    const { createClerkAuth } = await import("../../providers/clerk");
    const provider = createClerkAuth({ provider: "clerk" });
    expect(provider.capabilities.passkeys).toBe(true);
    expect(provider.passkeys).toBeUndefined();
  });

  it("capabilities.organizations is true but provider.organizations is undefined", async () => {
    const { createClerkAuth } = await import("../../providers/clerk");
    const provider = createClerkAuth({ provider: "clerk" });
    expect(provider.capabilities.organizations).toBe(true);
    expect(provider.organizations).toBeUndefined();
  });

  it("capabilities.twoFactor is true but provider.twoFactor is undefined", async () => {
    const { createClerkAuth } = await import("../../providers/clerk");
    const provider = createClerkAuth({ provider: "clerk" });
    expect(provider.capabilities.twoFactor).toBe(true);
    expect(provider.twoFactor).toBeUndefined();
  });

  it("capabilities.magicLink is true but provider.magicLink is undefined", async () => {
    const { createClerkAuth } = await import("../../providers/clerk");
    const provider = createClerkAuth({ provider: "clerk" });
    expect(provider.capabilities.magicLink).toBe(true);
    expect(provider.magicLink).toBeUndefined();
  });
});

// ─── NextAuth: all undefined (capabilities all false) ───

describe("NextAuth provider — all capability shapes undefined (D2)", () => {
  it("provider.organizations is undefined (capabilities.organizations === false)", async () => {
    const { createNextAuthProvider } = await import("../../providers/nextauth");
    const provider = createNextAuthProvider({ provider: "nextauth" });
    expect(provider.capabilities.organizations).toBe(false);
    expect(provider.organizations).toBeUndefined();
  });

  it("provider.passkeys is undefined", async () => {
    const { createNextAuthProvider } = await import("../../providers/nextauth");
    const provider = createNextAuthProvider({ provider: "nextauth" });
    expect(provider.passkeys).toBeUndefined();
  });

  it("provider.twoFactor is undefined", async () => {
    const { createNextAuthProvider } = await import("../../providers/nextauth");
    const provider = createNextAuthProvider({ provider: "nextauth" });
    expect(provider.twoFactor).toBeUndefined();
  });

  it("provider.magicLink is undefined", async () => {
    const { createNextAuthProvider } = await import("../../providers/nextauth");
    const provider = createNextAuthProvider({ provider: "nextauth" });
    expect(provider.magicLink).toBeUndefined();
  });
});
