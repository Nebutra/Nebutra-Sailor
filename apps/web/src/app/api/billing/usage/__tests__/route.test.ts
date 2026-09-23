import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

async function loadRoute() {
  return import("@/app/api/billing/usage/route");
}

const USAGE = {
  period: "2026-09",
  apiCalls: { used: 42, limit: 100, percentUsed: 42 },
  aiTokens: { used: 1234 },
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function requestWithCookie(cookie: string) {
  return new Request("https://app.example.com/api/billing/usage", {
    headers: { cookie },
  });
}

describe("GET /api/billing/usage", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("forwards the caller's session cookie and returns the payload uncached", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(USAGE));
    vi.stubGlobal("fetch", fetchMock);

    const { GET } = await loadRoute();
    const response = await GET(requestWithCookie("session=abc"));

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    await expect(response.json()).resolves.toEqual(USAGE);

    // The gateway authenticates by cookie; without this header the first cut of
    // this route answered 401 (getTypedApi injects no token under better-auth).
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toContain("/api/v1/billing/usage");
    expect((init.headers as Record<string, string>).cookie).toBe("session=abc");
  });

  it("passes an upstream status through so the client can tell 401 from 503", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({ error: "nope" }, 401)));

    const { GET } = await loadRoute();
    const response = await GET(requestWithCookie(""));

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ error: "Usage is unavailable." });
  });

  it("answers 503 for a network failure (never 502 — Cloudflare swallows it)", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("ECONNREFUSED")));

    const { GET } = await loadRoute();
    const response = await GET(requestWithCookie(""));

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({ error: "Usage is unavailable." });
  });

  it("answers 503 when the upstream body is not JSON", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response("<html>nope</html>", { status: 200 })),
    );

    const { GET } = await loadRoute();
    const response = await GET(requestWithCookie(""));

    expect(response.status).toBe(503);
  });
});
