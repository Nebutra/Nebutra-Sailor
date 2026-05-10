import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth", () => ({
  getAuth: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  db: {
    user: {
      findUnique: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

vi.mock("@/lib/permissions", () => ({
  hasPermission: vi.fn(() => true),
  resolveRole: vi.fn(() => "admin"),
}));

const auditLogMock = vi.fn(async (_input: Record<string, unknown>) => undefined);
vi.mock("@nebutra/audit", () => ({
  auditLogger: vi.fn(() => ({ log: auditLogMock })),
}));

vi.mock("@nebutra/logger", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

import { getAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import { hasPermission } from "@/lib/permissions";

const mockedGetAuth = vi.mocked(getAuth);
const mockedFindUnique = vi.mocked(db.user.findUnique);
const mockedUpdate = vi.mocked(db.user.update);
const mockedDelete = vi.mocked(db.user.delete);
const mockedHasPermission = vi.mocked(hasPermission);

function buildAuth(overrides: Partial<Awaited<ReturnType<typeof getAuth>>> = {}) {
  return {
    userId: "admin_user",
    orgId: "org_admin",
    sessionClaims: { org_role: "org:admin" } as Record<string, unknown>,
    isSignedIn: true,
    ...overrides,
  } as Awaited<ReturnType<typeof getAuth>>;
}

async function loadRoute() {
  return import("@/app/api/admin/users/[userId]/route");
}

const params = Promise.resolve({ userId: "target_user" });

beforeEach(() => {
  vi.resetModules();
  mockedGetAuth.mockReset();
  mockedFindUnique.mockReset();
  mockedUpdate.mockReset();
  mockedDelete.mockReset();
  mockedHasPermission.mockReset().mockReturnValue(true);
  auditLogMock.mockClear();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("PATCH /api/admin/users/[userId]", () => {
  it("returns 401 when unauthenticated and emits no audit", async () => {
    mockedGetAuth.mockResolvedValue(buildAuth({ userId: null, isSignedIn: false }));
    const { PATCH } = await loadRoute();
    const res = await PATCH(
      new Request("https://app.example/api/admin/users/target_user", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "New Name" }),
      }),
      { params },
    );
    expect(res.status).toBe(401);
    expect(auditLogMock).not.toHaveBeenCalled();
  });

  it("returns 403 when lacking admin:manage_users", async () => {
    mockedGetAuth.mockResolvedValue(buildAuth());
    mockedHasPermission.mockReturnValue(false);
    const { PATCH } = await loadRoute();
    const res = await PATCH(
      new Request("https://app.example/api/admin/users/target_user", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "New Name" }),
      }),
      { params },
    );
    expect(res.status).toBe(403);
    expect(auditLogMock).not.toHaveBeenCalled();
  });

  it("returns 404 when user not found", async () => {
    mockedGetAuth.mockResolvedValue(buildAuth());
    mockedFindUnique.mockResolvedValue(null);
    const { PATCH } = await loadRoute();
    const res = await PATCH(
      new Request("https://app.example/api/admin/users/target_user", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "New Name" }),
      }),
      { params },
    );
    expect(res.status).toBe(404);
    expect(auditLogMock).not.toHaveBeenCalled();
  });

  it("emits admin.user.updated with severity warning + before/after on success", async () => {
    mockedGetAuth.mockResolvedValue(buildAuth());
    mockedFindUnique.mockResolvedValue({
      id: "target_user",
      email: "u@example.com",
      name: "Old Name",
      avatarUrl: null,
      updatedAt: new Date("2025-01-01T00:00:00Z"),
    } as never);
    mockedUpdate.mockResolvedValue({
      id: "target_user",
      email: "u@example.com",
      name: "New Name",
      avatarUrl: null,
      updatedAt: new Date("2025-02-01T00:00:00Z"),
    } as never);
    const { PATCH } = await loadRoute();
    const res = await PATCH(
      new Request("https://app.example/api/admin/users/target_user", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "New Name" }),
      }),
      { params },
    );
    expect(res.status).toBe(200);
    expect(auditLogMock).toHaveBeenCalledTimes(1);
    expect(auditLogMock.mock.calls[0]?.[0]).toMatchObject({
      action: "admin.user.updated",
      outcome: "success",
      severity: "warning",
      resource: { type: "user", id: "target_user" },
      changes: { before: { name: "Old Name" }, after: { name: "New Name" } },
    });
  });
});

describe("DELETE /api/admin/users/[userId]", () => {
  it("returns 401 when unauthenticated", async () => {
    mockedGetAuth.mockResolvedValue(buildAuth({ userId: null, isSignedIn: false }));
    const { DELETE } = await loadRoute();
    const res = await DELETE(
      new Request("https://app.example/api/admin/users/target_user", { method: "DELETE" }),
      { params },
    );
    expect(res.status).toBe(401);
    expect(auditLogMock).not.toHaveBeenCalled();
  });

  it("emits admin.user.deleted with severity critical on success", async () => {
    mockedGetAuth.mockResolvedValue(buildAuth());
    mockedFindUnique.mockResolvedValue({
      id: "target_user",
      email: "u@example.com",
      name: "Doomed User",
    } as never);
    mockedDelete.mockResolvedValue({ id: "target_user" } as never);
    const { DELETE } = await loadRoute();
    const res = await DELETE(
      new Request("https://app.example/api/admin/users/target_user", { method: "DELETE" }),
      { params },
    );
    expect(res.status).toBe(200);
    expect(auditLogMock).toHaveBeenCalledTimes(1);
    expect(auditLogMock.mock.calls[0]?.[0]).toMatchObject({
      action: "admin.user.deleted",
      outcome: "success",
      severity: "critical",
      resource: { type: "user", id: "target_user" },
    });
  });

  it("rejects self-delete with 400", async () => {
    mockedGetAuth.mockResolvedValue(buildAuth({ userId: "target_user" }));
    const { DELETE } = await loadRoute();
    const res = await DELETE(
      new Request("https://app.example/api/admin/users/target_user", { method: "DELETE" }),
      { params },
    );
    expect(res.status).toBe(400);
    expect(auditLogMock).not.toHaveBeenCalled();
  });
});
