import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const deleteMany = vi.fn();
const getAuth = vi.fn();

vi.mock("@/lib/auth", () => ({
  getAuth: (req: Request) => getAuth(req),
}));

vi.mock("@/lib/db", () => ({
  db: {
    authSession: {
      deleteMany: (args: unknown) => deleteMany(args),
    },
  },
}));

vi.mock("@nebutra/logger", () => ({
  logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn() },
}));

describe("POST /api/auth/revoke-other-sessions", () => {
  beforeEach(() => {
    deleteMany.mockReset();
    getAuth.mockReset();
  });

  afterEach(() => {
    vi.resetModules();
  });

  it("returns 401 when no session", async () => {
    getAuth.mockResolvedValue({ userId: null });

    const { POST } = await import("../route");
    const req = new Request("http://localhost/api/auth/revoke-other-sessions", {
      method: "POST",
    });
    const res = await POST(req);

    expect(res.status).toBe(401);
    expect(deleteMany).not.toHaveBeenCalled();
  });

  it("revokes all sessions except current when token cookie present", async () => {
    getAuth.mockResolvedValue({ userId: "u1" });
    deleteMany.mockResolvedValue({ count: 3 });

    const { POST } = await import("../route");
    const req = new Request("http://localhost/api/auth/revoke-other-sessions", {
      method: "POST",
      headers: {
        cookie: "better-auth.session_token=tok-current; other=1",
      },
    });
    const res = await POST(req);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ ok: true, revoked: 3 });
    expect(deleteMany).toHaveBeenCalledWith({
      where: { userId: "u1", NOT: { token: "tok-current" } },
    });
  });

  it("falls back to revoking ALL user sessions when no cookie", async () => {
    getAuth.mockResolvedValue({ userId: "u1" });
    deleteMany.mockResolvedValue({ count: 2 });

    const { POST } = await import("../route");
    const req = new Request("http://localhost/api/auth/revoke-other-sessions", {
      method: "POST",
    });
    const res = await POST(req);

    expect(res.status).toBe(200);
    expect(deleteMany).toHaveBeenCalledWith({ where: { userId: "u1" } });
  });

  it("returns 500 when delete throws", async () => {
    getAuth.mockResolvedValue({ userId: "u1" });
    deleteMany.mockRejectedValue(new Error("db down"));

    const { POST } = await import("../route");
    const req = new Request("http://localhost/api/auth/revoke-other-sessions", {
      method: "POST",
    });
    const res = await POST(req);

    expect(res.status).toBe(500);
  });
});
