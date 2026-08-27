import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const findUnique = vi.fn();
const getAuth = vi.fn();

vi.mock("@/lib/auth", () => ({
  getAuth: (req: Request) => getAuth(req),
}));

vi.mock("@/lib/db", () => ({
  db: {
    authUser: {
      findUnique: (args: unknown) => findUnique(args),
    },
  },
}));

vi.mock("@nebutra/logger", () => ({
  logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn() },
}));

describe("GET /api/auth/two-factor-status", () => {
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
    const req = new Request("http://localhost/api/auth/two-factor-status");
    const res = await GET(req);

    expect(res.status).toBe(401);
    expect(findUnique).not.toHaveBeenCalled();
  });

  it("returns enabled: true when AuthUser.twoFactorEnabled is true", async () => {
    getAuth.mockResolvedValue({ userId: "u1" });
    findUnique.mockResolvedValue({ twoFactorEnabled: true });

    const { GET } = await import("../route");
    const res = await GET(new Request("http://localhost/api/auth/two-factor-status"));

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ enabled: true });
    expect(findUnique).toHaveBeenCalledWith({
      where: { id: "u1" },
      select: { twoFactorEnabled: true },
    });
  });

  it("returns enabled: false when AuthUser.twoFactorEnabled is false", async () => {
    getAuth.mockResolvedValue({ userId: "u1" });
    findUnique.mockResolvedValue({ twoFactorEnabled: false });

    const { GET } = await import("../route");
    const res = await GET(new Request("http://localhost/api/auth/two-factor-status"));

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ enabled: false });
  });

  it("returns enabled: false when AuthUser does not exist (defensive default)", async () => {
    getAuth.mockResolvedValue({ userId: "u1" });
    findUnique.mockResolvedValue(null);

    const { GET } = await import("../route");
    const res = await GET(new Request("http://localhost/api/auth/two-factor-status"));

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ enabled: false });
  });

  it("returns 500 when db query throws", async () => {
    getAuth.mockResolvedValue({ userId: "u1" });
    findUnique.mockRejectedValue(new Error("db down"));

    const { GET } = await import("../route");
    const res = await GET(new Request("http://localhost/api/auth/two-factor-status"));

    expect(res.status).toBe(500);
  });
});
