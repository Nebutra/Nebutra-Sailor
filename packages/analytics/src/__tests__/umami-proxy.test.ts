import { beforeEach, describe, expect, it, vi } from "vitest";

import { createUmamiProxyHandler } from "../umami-proxy";

describe("Umami proxy handler", () => {
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockFetch = vi.fn();
    globalThis.fetch = mockFetch as unknown as typeof fetch;
  });

  it("forwards request body and headers to upstream Umami host", async () => {
    mockFetch.mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    const handler = await createUmamiProxyHandler({
      umamiHost: "https://analytics.internal",
      websiteId: "site_123",
    });

    const req = new Request("https://nebutra.com/api/um", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-forwarded-for": "1.2.3.4",
        "user-agent": "TestAgent/1.0",
      },
      body: JSON.stringify({ type: "event", payload: {} }),
    });

    const res = await handler(req);
    expect(res.status).toBe(200);

    const [upstreamUrl, options] = mockFetch.mock.calls[0];
    expect(upstreamUrl).toBe("https://analytics.internal/api/send");
    expect(options.method).toBe("POST");
    expect(options.headers["X-Website-Id"]).toBe("site_123");
    expect(options.headers["X-Forwarded-For"]).toBe("1.2.3.4");
    expect(options.headers["User-Agent"]).toBe("TestAgent/1.0");
    expect(options.body).toContain("event");
  });

  it("returns 503 when upstream throws", async () => {
    mockFetch.mockRejectedValue(new Error("unreachable"));

    const handler = await createUmamiProxyHandler({
      umamiHost: "https://analytics.internal",
      websiteId: "site_123",
    });

    const req = new Request("https://nebutra.com/api/um", {
      method: "POST",
      body: "{}",
    });

    const res = await handler(req);
    expect(res.status).toBe(503);
    const body = await res.json();
    expect(body).toEqual({ error: "proxy_failed" });
  });

  it("propagates upstream status code", async () => {
    mockFetch.mockResolvedValue(
      new Response(JSON.stringify({ error: "bad" }), { status: 400 }),
    );

    const handler = await createUmamiProxyHandler({
      umamiHost: "https://analytics.internal",
      websiteId: "site_123",
    });

    const req = new Request("https://nebutra.com/api/um", {
      method: "POST",
      body: "{}",
    });

    const res = await handler(req);
    expect(res.status).toBe(400);
  });
});
