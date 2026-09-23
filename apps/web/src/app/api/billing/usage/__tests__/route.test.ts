import { beforeEach, describe, expect, it, vi } from "vitest";

const getTypedApiMock = vi.fn();

vi.mock("@/lib/api/client", () => ({
  getTypedApi: getTypedApiMock,
}));

async function loadRoute() {
  return import("@/app/api/billing/usage/route");
}

const USAGE = {
  period: "2026-09",
  apiCalls: { used: 42, limit: 100, percentUsed: 42 },
  aiTokens: { used: 1234 },
};

function clientReturning(result: unknown) {
  return { GET: vi.fn().mockResolvedValue(result) };
}

describe("GET /api/billing/usage", () => {
  beforeEach(() => {
    vi.resetModules();
    getTypedApiMock.mockReset();
  });

  it("returns the gateway payload and never caches it", async () => {
    getTypedApiMock.mockResolvedValue(
      clientReturning({
        data: USAGE,
        error: undefined,
        response: new Response(null, { status: 200 }),
      }),
    );

    const { GET } = await loadRoute();
    const response = await GET();

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    await expect(response.json()).resolves.toEqual(USAGE);
  });

  it("passes the gateway status through when the call fails", async () => {
    getTypedApiMock.mockResolvedValue(
      clientReturning({
        data: undefined,
        error: { message: "unauthorized" },
        response: new Response(null, { status: 401 }),
      }),
    );

    const { GET } = await loadRoute();
    const response = await GET();

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ error: "Usage is unavailable." });
  });

  it("answers 503 when the upstream call fails without a status", async () => {
    getTypedApiMock.mockResolvedValue(
      clientReturning({ data: undefined, error: { message: "boom" }, response: undefined }),
    );

    const { GET } = await loadRoute();
    const response = await GET();

    expect(response.status).toBe(503);
  });

  it("answers 500 when the auth layer throws", async () => {
    getTypedApiMock.mockRejectedValue(new Error("no session"));

    const { GET } = await loadRoute();
    const response = await GET();

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({ error: "Usage is unavailable." });
  });
});
