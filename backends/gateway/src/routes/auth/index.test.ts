import type { AuthProvider } from "@nebutra/auth";
import { describe, expect, it, vi } from "vitest";
import { createAuthRoutes } from "./index.js";

function createFakeAuth(overrides: Partial<AuthProvider> = {}): AuthProvider {
  return {
    provider: "dev",
    capabilities: {
      passkeys: false,
      organizations: true,
      twoFactor: false,
      magicLink: false,
      impersonation: false,
    },
    getSession: vi.fn(async () => null),
    getUser: vi.fn(async () => null),
    createUser: vi.fn(async () => {
      throw new Error("not implemented");
    }),
    getOrganization: vi.fn(async () => null),
    getUserOrganizations: vi.fn(async () => []),
    createOrganization: vi.fn(async () => {
      throw new Error("not implemented");
    }),
    signIn: vi.fn(async () => ({
      ok: false,
      error: { code: "not_implemented", message: "not implemented" },
    })),
    signOut: vi.fn(async () => undefined),
    middleware: vi.fn(() => async () => undefined),
    handleWebhook: vi.fn(async () => undefined),
    organizations: {
      create: vi.fn(async () => {
        throw new Error("not implemented");
      }),
      list: vi.fn(async () => []),
      setActive: vi.fn(async () => ({ headers: new Headers() })),
      invite: vi.fn(async () => ({ invitationId: "inv_1" })),
      acceptInvite: vi.fn(async () => ({ organizationId: "org_1" })),
      members: vi.fn(async () => []),
      updateMemberRole: vi.fn(async () => undefined),
      removeMember: vi.fn(async () => undefined),
    },
    ...overrides,
  };
}

describe("auth routes", () => {
  it("returns null for an unauthenticated session", async () => {
    const auth = createFakeAuth();
    const app = createAuthRoutes({ authFactory: async () => auth });

    const response = await app.request("/auth/session");

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toBeNull();
  });

  it("fails closed to null when the provider cannot resolve a session", async () => {
    const app = createAuthRoutes({
      authFactory: async () => {
        throw new Error("provider unavailable");
      },
    });

    const response = await app.request("/auth/session");

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toBeNull();
  });

  it("projects an authenticated session through the gateway auth boundary", async () => {
    const auth = createFakeAuth({
      getSession: vi.fn(async () => ({
        userId: "user_1",
        organizationId: "org_1",
        role: "admin",
        email: "ada@example.com",
        expiresAt: new Date("2030-01-01T00:00:00.000Z"),
      })),
      getUser: vi.fn(async () => ({
        id: "user_1",
        email: "ada@example.com",
        name: "Ada",
        imageUrl: "https://example.com/avatar.png",
        createdAt: new Date("2026-01-01T00:00:00.000Z"),
      })),
      getOrganization: vi.fn(async () => ({
        id: "org_1",
        name: "Workspace",
        slug: "workspace",
        plan: "pro",
        createdAt: new Date("2026-01-01T00:00:00.000Z"),
      })),
    });
    const app = createAuthRoutes({ authFactory: async () => auth });

    const response = await app.request("/auth/session");

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      user: { id: "user_1", email: "ada@example.com", name: "Ada" },
      session: { userId: "user_1", organizationId: "org_1", role: "admin" },
      organization: { id: "org_1", name: "Workspace", slug: "workspace" },
      membership: { role: "admin" },
    });
  });

  it("signs out via the configured auth facade", async () => {
    const signOut = vi.fn(async () => undefined);
    const auth = createFakeAuth({ signOut });
    const app = createAuthRoutes({ authFactory: async () => auth });

    const response = await app.request("/auth/sign-out", { method: "POST" });

    expect(response.status).toBe(204);
    expect(signOut).toHaveBeenCalledTimes(1);
  });

  it("sets the active organization and forwards provider headers", async () => {
    const setActive = vi.fn(async () => ({
      headers: new Headers({ "set-cookie": "session=rotated; Path=/; HttpOnly" }),
    }));
    const auth = createFakeAuth({
      organizations: {
        ...createFakeAuth().organizations,
        setActive,
      } as AuthProvider["organizations"],
    });
    const app = createAuthRoutes({ authFactory: async () => auth });

    const response = await app.request("/organizations/active", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ organizationId: "org_1" }),
    });

    expect(response.status).toBe(200);
    expect(setActive).toHaveBeenCalledWith(expect.any(Request), "org_1");
    expect(response.headers.get("set-cookie")).toContain("session=rotated");
  });

  it("delegates provider auth routes through the auth facade middleware", async () => {
    const handler = vi.fn(async () => Response.json({ ok: true }, { status: 202 }));
    const auth = createFakeAuth({
      middleware: vi.fn(() => handler),
    });
    const app = createAuthRoutes({ authFactory: async () => auth });

    const response = await app.request("/auth/sign-in");

    expect(response.status).toBe(202);
    await expect(response.json()).resolves.toEqual({ ok: true });
    expect(handler).toHaveBeenCalledTimes(1);
  });
});
