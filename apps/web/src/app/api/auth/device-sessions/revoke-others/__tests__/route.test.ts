import { beforeEach, describe, expect, it, vi } from "vitest";

const auditLog = vi.fn();
const getAuth = vi.fn();
const db = {
  authSession: {
    deleteMany: vi.fn(),
  },
  desktopAuthSession: {
    updateMany: vi.fn(),
  },
};

vi.mock("@/lib/auth", () => ({
  getAuth: (request: Request) => getAuth(request),
}));

vi.mock("@/lib/db", () => ({ db }));

vi.mock("@nebutra/audit", () => ({
  auditLogger: vi.fn(() => ({ log: auditLog })),
}));

vi.mock("@nebutra/logger", () => ({
  logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn() },
}));

describe("POST /api/auth/device-sessions/revoke-others", () => {
  beforeEach(() => {
    vi.resetModules();
    auditLog.mockReset();
    getAuth.mockReset();
    db.authSession.deleteMany.mockReset();
    db.desktopAuthSession.updateMany.mockReset();
  });

  it("rejects unauthenticated requests", async () => {
    getAuth.mockResolvedValue({ userId: null });

    const { POST } = await import("../route");
    const response = await POST(
      new Request("https://app.nebutra.com/api/auth/device-sessions/revoke-others", {
        method: "POST",
      }),
    );

    expect(response.status).toBe(401);
    expect(db.authSession.deleteMany).not.toHaveBeenCalled();
  });

  it("rejects requests that cannot identify the current web session", async () => {
    getAuth.mockResolvedValue({ userId: "user_1", orgId: "org_1" });

    const { POST } = await import("../route");
    const response = await POST(
      new Request("https://app.nebutra.com/api/auth/device-sessions/revoke-others", {
        method: "POST",
      }),
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "Current session is required to revoke other devices.",
    });
    expect(db.authSession.deleteMany).not.toHaveBeenCalled();
    expect(db.desktopAuthSession.updateMany).not.toHaveBeenCalled();
  });

  it("revokes every other web session and all active desktop sessions", async () => {
    getAuth.mockResolvedValue({ userId: "user_1", orgId: "org_1" });
    db.authSession.deleteMany.mockResolvedValue({ count: 2 });
    db.desktopAuthSession.updateMany.mockResolvedValue({ count: 1 });

    const { POST } = await import("../route");
    const response = await POST(
      new Request("https://app.nebutra.com/api/auth/device-sessions/revoke-others", {
        method: "POST",
        headers: { cookie: "better-auth.session_token=tok_current" },
      }),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ ok: true, revoked: 3 });
    expect(db.authSession.deleteMany).toHaveBeenCalledWith({
      where: { userId: "user_1", NOT: { token: "tok_current" } },
    });
    expect(db.desktopAuthSession.updateMany).toHaveBeenCalledWith({
      where: {
        userId: "user_1",
        revokedAt: null,
        expiresAt: { gt: expect.any(Date) },
      },
      data: { revokedAt: expect.any(Date) },
    });
    expect(auditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "auth.session.revoked_other",
        metadata: { desktopRevoked: 1, revokedCount: 3, webRevoked: 2 },
      }),
    );
  });
});
