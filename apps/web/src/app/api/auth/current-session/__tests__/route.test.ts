import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const findUnique = vi.fn();
const getAuth = vi.fn();

vi.mock("@/lib/auth", () => ({
  getAuth: (req: Request) => getAuth(req),
}));

vi.mock("@/lib/db", () => ({
  db: {
    authSession: {
      findUnique: (args: unknown) => findUnique(args),
    },
  },
}));

vi.mock("@nebutra/logger", () => ({
  logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn() },
}));

describe("GET /api/auth/current-session", () => {
  beforeEach(() => {
    findUnique.mockReset();
    getAuth.mockReset();
  });

  afterEach(() => {
    vi.resetModules();
  });

  it("returns 401 when no session", async () => {
    getAuth.mockResolvedValue({ userId: null });

    const { GET } = await import("../route");
    const req = new Request("http://localhost/api/auth/current-session");
    const res = await GET(req);

    expect(res.status).toBe(401);
    expect(findUnique).not.toHaveBeenCalled();
  });

  it("returns sessionId: null when no cookie is present", async () => {
    getAuth.mockResolvedValue({ userId: "u1" });

    const { GET } = await import("../route");
    const res = await GET(new Request("http://localhost/api/auth/current-session"));

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ sessionId: null });
    expect(findUnique).not.toHaveBeenCalled();
  });

  it("returns the matching authSession id when cookie token belongs to the user", async () => {
    getAuth.mockResolvedValue({ userId: "u1" });
    findUnique.mockResolvedValue({ id: "sess_abc", userId: "u1" });

    const { GET } = await import("../route");
    const res = await GET(
      new Request("http://localhost/api/auth/current-session", {
        headers: { cookie: "better-auth.session_token=tok-current; other=1" },
      }),
    );

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ sessionId: "sess_abc" });
    expect(findUnique).toHaveBeenCalledWith({
      where: { token: "tok-current" },
      select: { id: true, userId: true },
    });
  });

  it("returns sessionId: null when the cookie token belongs to another user", async () => {
    getAuth.mockResolvedValue({ userId: "u1" });
    findUnique.mockResolvedValue({ id: "sess_xyz", userId: "u2" });

    const { GET } = await import("../route");
    const res = await GET(
      new Request("http://localhost/api/auth/current-session", {
        headers: { cookie: "better-auth.session_token=tok-other" },
      }),
    );

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ sessionId: null });
  });

  it("returns sessionId: null when the cookie token does not match any session", async () => {
    getAuth.mockResolvedValue({ userId: "u1" });
    findUnique.mockResolvedValue(null);

    const { GET } = await import("../route");
    const res = await GET(
      new Request("http://localhost/api/auth/current-session", {
        headers: { cookie: "better-auth.session_token=tok-stale" },
      }),
    );

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ sessionId: null });
  });

  it("returns 500 when db query throws", async () => {
    getAuth.mockResolvedValue({ userId: "u1" });
    findUnique.mockRejectedValue(new Error("db down"));

    const { GET } = await import("../route");
    const res = await GET(
      new Request("http://localhost/api/auth/current-session", {
        headers: { cookie: "better-auth.session_token=tok-current" },
      }),
    );

    expect(res.status).toBe(500);
  });
});
