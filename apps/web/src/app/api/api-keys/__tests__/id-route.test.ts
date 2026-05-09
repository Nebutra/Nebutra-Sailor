import { beforeEach, describe, expect, it, vi } from "vitest";

const getAuthMock = vi.fn();

const dbMock = {
  aPIKey: {
    findUnique: vi.fn(),
    update: vi.fn(),
  },
};

vi.mock("@/lib/auth", () => ({
  getAuth: getAuthMock,
}));

vi.mock("@/lib/db", () => ({
  db: dbMock,
}));

vi.mock("@nebutra/logger", () => ({
  logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn() },
}));

async function loadRoute() {
  return import("@/app/api/api-keys/[id]/route");
}

function buildContext(id: string) {
  return { params: Promise.resolve({ id }) };
}

const ADMIN_AUTH = {
  userId: "user_admin",
  orgId: "org_1",
  isSignedIn: true,
  sessionClaims: { org_role: "org:admin" },
};

const MEMBER_AUTH = {
  userId: "user_member",
  orgId: "org_1",
  isSignedIn: true,
  sessionClaims: { org_role: "org:member" },
};

describe("/api/api-keys/[id] DELETE (revoke)", () => {
  beforeEach(() => {
    vi.resetModules();
    getAuthMock.mockReset();
    Object.values(dbMock.aPIKey).forEach((fn) => fn.mockReset());
  });

  it("returns 401 when unauthenticated", async () => {
    getAuthMock.mockResolvedValue({
      userId: null,
      orgId: null,
      isSignedIn: false,
      sessionClaims: {},
    });

    const { DELETE } = await loadRoute();
    const res = await DELETE(
      new Request("http://localhost/api/api-keys/k1", { method: "DELETE" }),
      buildContext("k1"),
    );
    expect(res.status).toBe(401);
  });

  it("returns 404 when key does not exist or belongs to a different org", async () => {
    getAuthMock.mockResolvedValue(ADMIN_AUTH);
    dbMock.aPIKey.findUnique.mockResolvedValue(null);

    const { DELETE } = await loadRoute();
    const res = await DELETE(
      new Request("http://localhost/api/api-keys/k1", { method: "DELETE" }),
      buildContext("k1"),
    );
    expect(res.status).toBe(404);
    expect(dbMock.aPIKey.update).not.toHaveBeenCalled();
  });

  it("returns 403 when non-admin tries to revoke a key they did not create", async () => {
    getAuthMock.mockResolvedValue(MEMBER_AUTH);
    dbMock.aPIKey.findUnique.mockResolvedValue({
      id: "k1",
      organizationId: "org_1",
      createdById: "user_other",
      revokedAt: null,
    });

    const { DELETE } = await loadRoute();
    const res = await DELETE(
      new Request("http://localhost/api/api-keys/k1", { method: "DELETE" }),
      buildContext("k1"),
    );
    expect(res.status).toBe(403);
    expect(dbMock.aPIKey.update).not.toHaveBeenCalled();
  });

  it("revokes when user is admin (regardless of creator)", async () => {
    getAuthMock.mockResolvedValue(ADMIN_AUTH);
    dbMock.aPIKey.findUnique.mockResolvedValue({
      id: "k1",
      organizationId: "org_1",
      createdById: "someone_else",
      revokedAt: null,
    });
    dbMock.aPIKey.update.mockResolvedValue({ id: "k1", revokedAt: new Date() });

    const { DELETE } = await loadRoute();
    const res = await DELETE(
      new Request("http://localhost/api/api-keys/k1", { method: "DELETE" }),
      buildContext("k1"),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ ok: true });

    const updateCall = dbMock.aPIKey.update.mock.calls[0][0];
    expect(updateCall.where).toEqual({ id: "k1" });
    expect(updateCall.data.revokedAt).toBeInstanceOf(Date);
  });

  it("revokes when non-admin user is the original creator", async () => {
    getAuthMock.mockResolvedValue(MEMBER_AUTH);
    dbMock.aPIKey.findUnique.mockResolvedValue({
      id: "k1",
      organizationId: "org_1",
      createdById: "user_member",
      revokedAt: null,
    });
    dbMock.aPIKey.update.mockResolvedValue({ id: "k1", revokedAt: new Date() });

    const { DELETE } = await loadRoute();
    const res = await DELETE(
      new Request("http://localhost/api/api-keys/k1", { method: "DELETE" }),
      buildContext("k1"),
    );
    expect(res.status).toBe(200);
    expect(dbMock.aPIKey.update).toHaveBeenCalledTimes(1);
  });
});
