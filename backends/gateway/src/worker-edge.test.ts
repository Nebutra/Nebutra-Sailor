import { afterEach, describe, expect, it, vi } from "vitest";
import { buildForwardHeaders, default as worker } from "./worker-edge";

describe("gateway-edge forward headers", () => {
  it("does not copy Host from the incoming api.nebutra.com request", () => {
    const request = new Request("https://api.nebutra.com/api/misc/health", {
      headers: {
        host: "api.nebutra.com",
        "cf-connecting-ip": "203.0.113.9",
        "cf-ray": "abc",
        authorization: "Bearer test",
      },
    });

    const headers = buildForwardHeaders(request);

    expect(headers.get("host")).toBeNull();
    expect(headers.get("cf-ray")).toBeNull();
    expect(headers.get("authorization")).toBe("Bearer test");
    expect(headers.get("x-forwarded-host")).toBe("api.nebutra.com");
    expect(headers.get("x-forwarded-proto")).toBe("https");
    expect(headers.get("x-forwarded-for")).toBe("203.0.113.9");
  });
});

describe("gateway-edge fetch", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("forwards to ORIGIN_URL without a Host that would loop back into this Worker", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
      expect(url).toBe("https://nebutra-gateway.fly.dev/api/misc/health");
      return new Response(JSON.stringify({ status: "ok" }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    });
    vi.stubGlobal("fetch", fetchMock);

    const response = await worker.fetch(
      new Request("https://api.nebutra.com/api/misc/health", {
        headers: { host: "api.nebutra.com" },
      }),
      { ORIGIN_URL: "https://nebutra-gateway.fly.dev" },
    );

    expect(response.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledOnce();
    const init = fetchMock.mock.calls[0]?.[1] as RequestInit;
    const headers = new Headers(init.headers);
    expect(headers.get("host")).toBeNull();
    expect(headers.get("x-forwarded-host")).toBe("api.nebutra.com");
  });

  it("answers /__edge/health locally so origin outages are visible on /api/misc/health", async () => {
    const response = await worker.fetch(new Request("https://api.nebutra.com/__edge/health"), {});
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ status: "ok", layer: "edge" });
  });
});
