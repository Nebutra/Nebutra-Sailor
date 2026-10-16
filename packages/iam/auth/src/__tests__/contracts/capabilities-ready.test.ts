/**
 * `createAuth()` hands out a Better Auth provider whose `capabilities` are
 * already probed.
 *
 * The probe used to be fire-and-forget, so a caller doing the documented
 * `if (auth.capabilities.organizations && auth.organizations)` straight after
 * `await createAuth()` always read the all-false default: the gateway's
 * POST /organizations/active answered 501 on every request, and a fresh
 * scaffold's /billing could never select its only workspace.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const betterAuth = vi.fn(() => ({
  api: { listOrganizations: vi.fn(), setActiveOrganization: vi.fn() },
  handler: vi.fn(),
}));

vi.mock("better-auth", () => ({ betterAuth }));
vi.mock("better-auth/adapters/prisma", () => ({ prismaAdapter: vi.fn(() => ({})) }));
vi.mock("@nebutra/logger", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

const ORIGINAL_ENV = { ...process.env };

beforeEach(() => {
  process.env.BETTER_AUTH_SECRET = "test-secret-not-real";
  betterAuth.mockClear();
});

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
});

// The first init imports every real plugin module cold; on a CI runner that
// takes longer than vitest's 5 s default.
describe("createAuth({ provider: 'better-auth' })", { timeout: 60_000 }, () => {
  it("resolves with capabilities probed from the mounted plugins", async () => {
    const { createAuth } = await import("../../server");
    const auth = await createAuth({ provider: "better-auth", options: { prisma: {} } });

    expect(auth.capabilities.organizations).toBe(true);
    expect(auth.organizations).toBeDefined();
  });

  it("builds one Better Auth instance for concurrent first calls", async () => {
    const { createAuth } = await import("../../server");
    const auth = await createAuth({ provider: "better-auth", options: { prisma: {} } });
    const builds = betterAuth.mock.calls.length;

    await Promise.all([
      auth.middleware()(new Request("http://localhost/api/auth/ok")),
      auth.middleware()(new Request("http://localhost/api/auth/ok")),
    ]);

    expect(betterAuth.mock.calls.length).toBe(builds);
    expect(builds).toBe(1);
  });

  it("still resolves, with every capability off, when the instance cannot be built", async () => {
    delete process.env.BETTER_AUTH_SECRET;
    const { createAuth } = await import("../../server");
    const auth = await createAuth({ provider: "better-auth", options: { prisma: {} } });

    expect(auth.capabilities.organizations).toBe(false);
    expect(auth.organizations).toBeUndefined();
  });
});
