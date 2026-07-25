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

function makeRequest(body: unknown): Request {
  return new Request("https://app.nebutra.com/api/auth/device-sessions/revoke", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/auth/device-sessions/revoke", () => {
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
    const response = await POST(makeRequest({ sessionId: "web_1", kind: "web" }));

    expect(response.status).toBe(401);
    expect(db.authSession.deleteMany).not.toHaveBeenCalled();
  });

  it("rejects invalid request bodies", async () => {
    getAuth.mockResolvedValue({ userId: "user_1" });

    const { POST } = await import("../route");
    const response = await POST(makeRequest({ sessionId: "web_1", kind: "mobile" }));

    expect(response.status).toBe(400);
    expect(db.authSession.deleteMany).not.toHaveBeenCalled();
  });

  it("revokes a web device session", async () => {
    getAuth.mockResolvedValue({ userId: "user_1", orgId: "org_1" });
    db.authSession.deleteMany.mockResolvedValue({ count: 1 });

    const { POST } = await import("../route");
    const response = await POST(makeRequest({ sessionId: "web_1", kind: "web" }));

    expect(response.status).toBe(200);
    expect(db.authSession.deleteMany).toHaveBeenCalledWith({
      where: { id: "web_1", userId: "user_1" },
    });
    expect(auditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "auth.session.revoked",
        resource: { type: "device_session", id: "web_1" },
      }),
    );
  });

  it("soft revokes a desktop device session", async () => {
    getAuth.mockResolvedValue({ userId: "user_1", orgId: "org_1" });
    db.desktopAuthSession.updateMany.mockResolvedValue({ count: 1 });

    const { POST } = await import("../route");
    const response = await POST(makeRequest({ sessionId: "desktop_1", kind: "desktop" }));

    expect(response.status).toBe(200);
    expect(db.desktopAuthSession.updateMany).toHaveBeenCalledWith({
      where: { id: "desktop_1", userId: "user_1", revokedAt: null },
      data: { revokedAt: expect.any(Date) },
    });
    expect(auditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "auth.session.revoked",
        resource: { type: "device_session", id: "desktop_1" },
      }),
    );
  });

  it("returns 404 when the device session does not belong to the user", async () => {
    getAuth.mockResolvedValue({ userId: "user_1", orgId: "org_1" });
    db.authSession.deleteMany.mockResolvedValue({ count: 0 });

    const { POST } = await import("../route");
    const response = await POST(makeRequest({ sessionId: "missing", kind: "web" }));

    expect(response.status).toBe(404);
    expect(auditLog).not.toHaveBeenCalled();
  });
});
