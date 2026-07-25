import { beforeEach, describe, expect, it, vi } from "vitest";

const getAuth = vi.fn();
const db = {
  authSession: {
    findMany: vi.fn(),
  },
  desktopAuthSession: {
    findMany: vi.fn(),
  },
};

vi.mock("@/lib/auth", () => ({
  getAuth: (request: Request) => getAuth(request),
}));

vi.mock("@/lib/db", () => ({ db }));

vi.mock("@nebutra/logger", () => ({
  logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn() },
}));

describe("GET /api/auth/device-sessions", () => {
  beforeEach(() => {
    vi.resetModules();
    getAuth.mockReset();
    db.authSession.findMany.mockReset();
    db.desktopAuthSession.findMany.mockReset();
  });

  it("rejects unauthenticated requests", async () => {
    getAuth.mockResolvedValue({ userId: null });

    const { GET } = await import("../route");
    const response = await GET(new Request("https://app.nebutra.com/api/auth/device-sessions"));

    expect(response.status).toBe(401);
    expect(db.authSession.findMany).not.toHaveBeenCalled();
    expect(db.desktopAuthSession.findMany).not.toHaveBeenCalled();
  });

  it("returns unified web and desktop device sessions for the authenticated user", async () => {
    getAuth.mockResolvedValue({ userId: "user_1" });
    db.authSession.findMany.mockResolvedValue([
      {
        id: "web_current",
        token: "tok_current",
        createdAt: new Date("2026-06-01T10:00:00.000Z"),
        updatedAt: new Date("2026-06-05T09:00:00.000Z"),
        expiresAt: new Date("2026-07-01T10:00:00.000Z"),
        ipAddress: "203.0.113.10",
        userAgent:
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/125.0 Safari/537.36",
      },
    ]);
    db.desktopAuthSession.findMany.mockResolvedValue([
      {
        id: "desktop_1",
        scheme: "foundry",
        createdAt: new Date("2026-06-02T10:00:00.000Z"),
        updatedAt: new Date("2026-06-03T10:00:00.000Z"),
        lastUsedAt: new Date("2026-06-05T10:00:00.000Z"),
        expiresAt: new Date("2026-07-02T10:00:00.000Z"),
        ipAddress: "203.0.113.11",
        userAgent: "Nebutra Foundry/1.0 macOS",
      },
    ]);

    const { GET } = await import("../route");
    const response = await GET(
      new Request("https://app.nebutra.com/api/auth/device-sessions", {
        headers: { cookie: "better-auth.session_token=tok_current" },
      }),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual([
      expect.objectContaining({
        id: "desktop_1",
        kind: "desktop",
        label: "Nebutra Foundry desktop",
        canRevoke: true,
        isCurrent: false,
      }),
      expect.objectContaining({
        id: "web_current",
        kind: "web",
        label: "Chrome on macOS",
        canRevoke: false,
        isCurrent: true,
      }),
    ]);
  });

  it("returns a stable 500 payload when device session lookup fails", async () => {
    getAuth.mockResolvedValue({ userId: "user_1" });
    db.authSession.findMany.mockRejectedValue(new Error("db offline"));
    db.desktopAuthSession.findMany.mockResolvedValue([]);

    const { GET } = await import("../route");
    const response = await GET(new Request("https://app.nebutra.com/api/auth/device-sessions"));

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      error: "Failed to load device sessions.",
    });
  });
});
