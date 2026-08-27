import { beforeEach, describe, expect, it, vi } from "vitest";

const consumeDesktopAuthHandoffMock = vi.fn();
const resolveDesktopSessionMock = vi.fn();
const dbMock = { $transaction: vi.fn(), $queryRaw: vi.fn(), $executeRaw: vi.fn() };

vi.mock("@nebutra/auth/desktop", () => ({
  consumeDesktopAuthHandoff: consumeDesktopAuthHandoffMock,
  resolveDesktopSession: resolveDesktopSessionMock,
}));

vi.mock("@/lib/db", () => ({
  db: dbMock,
}));

async function loadExchangeRoute() {
  return import("../exchange/route");
}

async function loadMeRoute() {
  return import("../me/route");
}

describe("desktop auth API routes", () => {
  beforeEach(() => {
    vi.resetModules();
    consumeDesktopAuthHandoffMock.mockReset();
    resolveDesktopSessionMock.mockReset();
  });

  it("exchanges a one-time handoff token through @nebutra/auth/desktop", async () => {
    consumeDesktopAuthHandoffMock.mockResolvedValue({
      accessToken: "nds_token",
      tokenType: "Bearer",
      sessionId: "session_1",
      scheme: "foundry",
      expiresAt: new Date("2026-07-04T00:00:00.000Z"),
      user: { id: "user_1", email: "ada@example.com", name: "Ada", imageUrl: null },
    });
    const { POST } = await loadExchangeRoute();

    const response = await POST(
      new Request("https://app.nebutra.com/api/auth/desktop/exchange", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token: "ndh_handoff" }),
      }),
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(consumeDesktopAuthHandoffMock).toHaveBeenCalledWith({
      client: dbMock,
      token: "ndh_handoff",
      request: expect.any(Request),
    });
    await expect(response.json()).resolves.toMatchObject({
      accessToken: "nds_token",
      tokenType: "Bearer",
      sessionId: "session_1",
      user: { id: "user_1", email: "ada@example.com" },
    });
  });

  it("rejects invalid or already-consumed handoff tokens", async () => {
    consumeDesktopAuthHandoffMock.mockResolvedValue(null);
    const { POST } = await loadExchangeRoute();

    const response = await POST(
      new Request("https://app.nebutra.com/api/auth/desktop/exchange", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token: "ndh_used" }),
      }),
    );

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ error: "Invalid desktop handoff token." });
  });

  it("returns the bearer desktop session user", async () => {
    resolveDesktopSessionMock.mockResolvedValue({
      sessionId: "session_1",
      scheme: "foundry",
      expiresAt: new Date("2026-07-04T00:00:00.000Z"),
      user: { id: "user_1", email: "ada@example.com", name: "Ada", imageUrl: null },
    });
    const { GET } = await loadMeRoute();

    const response = await GET(
      new Request("https://app.nebutra.com/api/auth/desktop/me", {
        headers: { authorization: "Bearer nds_token" },
      }),
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(resolveDesktopSessionMock).toHaveBeenCalledWith({
      client: dbMock,
      request: expect.any(Request),
    });
    await expect(response.json()).resolves.toMatchObject({
      sessionId: "session_1",
      user: { id: "user_1", email: "ada@example.com" },
    });
  });
});
