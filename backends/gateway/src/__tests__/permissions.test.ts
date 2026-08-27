/**
 * Route-layer permission tests.
 *
 * Covers the two additive capabilities landed alongside the existing
 * `requireRole` guard (which is left unchanged):
 *
 *  1. `tenantToPermissionContext` / `mapTenantRoleToPermissionRoles` —
 *     the mapping from the gateway TenantContext (Clerk `org:` role) to the
 *     @nebutra/permissions PermissionContext (prefix-less CASL role).
 *
 *  2. `requirePermission(action, resource)` from @nebutra/permissions, run as a
 *     Hono route guard. The allow/deny matrix is asserted across
 *     owner / admin / member / viewer.
 *
 * These tests inject the PermissionContext directly via a tiny middleware
 * (`c.set("user", ctx)`) rather than going through the S2S HMAC header path,
 * so they exercise the authorization logic in isolation and stay independent
 * of service-token plumbing.
 */

import { Hono } from "hono";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Suppress permission-denied / info logging during tests.
vi.mock("@nebutra/logger", () => ({
  logger: { warn: vi.fn(), error: vi.fn(), info: vi.fn() },
}));

import type { PermissionContext, Role } from "@nebutra/permissions";
import { resetPermissions } from "@nebutra/permissions";
import { requirePermission } from "@/middlewares/permissions.js";
import {
  mapTenantRoleToPermissionRoles,
  type TenantContext,
  tenantToPermissionContext,
} from "@/middlewares/tenantContext.js";

// ---------------------------------------------------------------------------
// Force the in-process CASL provider (no external creds) for a deterministic
// allow/deny matrix, regardless of ambient env.
// ---------------------------------------------------------------------------
beforeEach(() => {
  delete process.env.OPENFGA_API_URL;
  process.env.PERMISSIONS_PROVIDER = "casl";
  resetPermissions();
});

afterEach(() => {
  resetPermissions();
});

// ===========================================================================
// tenant → PermissionContext mapping
// ===========================================================================

describe("mapTenantRoleToPermissionRoles", () => {
  it.each<[string, Role]>([
    ["org:owner", "owner"],
    ["org:admin", "admin"],
    ["org:member", "member"],
    ["org:viewer", "viewer"],
  ])("strips the Clerk prefix: %s → %s", (input, expected) => {
    expect(mapTenantRoleToPermissionRoles(input)).toEqual([expected]);
  });

  it("returns an empty list for an undefined role", () => {
    expect(mapTenantRoleToPermissionRoles(undefined)).toEqual([]);
  });

  it("passes through an unknown/custom role unchanged", () => {
    expect(mapTenantRoleToPermissionRoles("billing_admin")).toEqual(["billing_admin"]);
  });
});

describe("tenantToPermissionContext", () => {
  const base: TenantContext = {
    userId: "user-1",
    organizationId: "org-1",
    tenantId: "tenant-1",
    role: "org:admin",
    plan: "PRO",
    ip: "127.0.0.1",
  };

  it("maps a fully resolved tenant into a PermissionContext", () => {
    const ctx = tenantToPermissionContext(base);
    expect(ctx).toEqual({
      userId: "user-1",
      tenantId: "tenant-1",
      roles: ["admin"],
      attributes: { plan: "PRO" },
    });
  });

  it("returns undefined when userId is missing", () => {
    const { userId: _userId, ...noUser } = base;
    expect(tenantToPermissionContext(noUser)).toBeUndefined();
  });

  it("returns undefined when tenantId is missing", () => {
    const { tenantId: _tenantId, ...noTenant } = base;
    expect(tenantToPermissionContext(noTenant)).toBeUndefined();
  });

  it("yields empty roles when the tenant has no role", () => {
    const { role: _role, ...noRole } = base;
    const ctx = tenantToPermissionContext(noRole);
    expect(ctx?.roles).toEqual([]);
  });
});

// ===========================================================================
// requirePermission — route guard allow/deny matrix
// ===========================================================================

/**
 * Build a Hono app whose single GET route is protected by
 * `requirePermission(action, resource)`. The PermissionContext for the given
 * role is injected via a preceding middleware.
 */
function makeApp(role: Role | null, action: string, resource: string) {
  const app = new Hono();
  app.use("*", async (c, next) => {
    if (role !== null) {
      const ctx: PermissionContext = {
        userId: "user-1",
        tenantId: "org-1",
        roles: [role],
        attributes: { plan: "PRO" },
      };
      c.set("user", ctx);
    }
    await next();
  });
  app.get("/protected", requirePermission(action, resource), (c) => c.json({ ok: true }));
  return app;
}

function request(app: Hono) {
  return app.request("/protected", { method: "GET" });
}

describe("requirePermission — allow/deny matrix", () => {
  // owner & admin have full action coverage on Integration (manage); member &
  // viewer have no Integration rules → denied.
  it.each<[Role, number]>([
    ["owner", 200],
    ["admin", 200],
    ["member", 403],
    ["viewer", 403],
  ])("manage Integration as %s → %d", async (role, expected) => {
    const res = await request(makeApp(role, "manage", "Integration"));
    expect(res.status).toBe(expected);
  });

  it.each<[Role, number]>([
    ["owner", 200],
    ["admin", 200],
    ["member", 200],
    ["viewer", 200],
  ])("read Document as %s → %d", async (role, expected) => {
    // viewer/member can read shared/visible Documents; owner/admin inherit it.
    // A bare resource check (no subject) resolves true when any rule grants the
    // action on the type.
    const res = await request(makeApp(role, "read", "Document"));
    expect(res.status).toBe(expected);
  });

  it("read Billing: owner allowed, viewer denied", async () => {
    expect((await request(makeApp("owner", "read", "Billing"))).status).toBe(200);
    expect((await request(makeApp("viewer", "read", "Billing"))).status).toBe(403);
  });

  it("returns 401 when no PermissionContext is present", async () => {
    const res = await request(makeApp(null, "read", "Document"));
    expect(res.status).toBe(401);
    const body = (await res.json()) as { error: string };
    expect(body.error).toMatch(/[Uu]nauthorized/);
  });

  it("403 body carries a Forbidden error + message", async () => {
    const res = await request(makeApp("viewer", "manage", "Integration"));
    expect(res.status).toBe(403);
    const body = (await res.json()) as { error: string; message: string };
    expect(body.error).toBe("Forbidden");
    expect(body.message).toContain("Integration");
  });
});
