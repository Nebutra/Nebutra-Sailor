import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("../staff", () => ({
  requireStaff: vi
    .fn()
    .mockResolvedValue({ userId: "u", email: "ops@nebutra.com", role: "platform_owner" }),
  StaffAccessError: class extends Error {},
}));

const { proxyToCliProxy, syncCliProxyChannel } = await import("../supply");

function json(body: unknown, init: ResponseInit = {}) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "content-type": "application/json" },
    ...init,
  });
}

describe("supply desk", () => {
  const saved = { ...process.env };
  afterEach(() => {
    process.env = { ...saved };
  });

  it("injects the management key and never forwards the browser's own auth", async () => {
    process.env.CLIPROXY_MANAGEMENT_KEY = "mgmt-secret";
    const fetchImpl = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const h = new Headers(init?.headers);
      expect(String(input)).toBe(
        "http://nebutra-cliproxyapi.internal:8317/v0/management/auth-files?x=1",
      );
      expect(h.get("authorization")).toBe("Bearer mgmt-secret");
      expect(h.get("cookie")).toBeNull();
      return json({ files: [] });
    });
    const res = await proxyToCliProxy(
      new Request("https://admin.nebutra.com/v0/management/auth-files?x=1", {
        headers: { authorization: "Bearer whatever-the-ui-typed", cookie: "cf=1" },
      }),
      "/v0/management/auth-files",
      fetchImpl as unknown as typeof fetch,
    );
    expect(res.status).toBe(200);
  });

  it("upserts the New-API channel with the live model list", async () => {
    process.env.CLIPROXY_API_KEY = "proxy-key";
    process.env.NEW_API_ROOT_PASSWORD = "root-pw";
    const calls: Array<{ url: string; method: string; body?: unknown; headers: Headers }> = [];
    const fetchImpl = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      const headers = new Headers(init?.headers);
      calls.push({
        url,
        method: init?.method ?? "GET",
        body: init?.body ? JSON.parse(String(init.body)) : undefined,
        headers,
      });
      if (url.endsWith("/v1/models")) {
        return json({
          data: [{ id: "gpt-5-codex" }, { id: "gemini-3-pro" }, { id: "gpt-5-codex" }],
        });
      }
      if (url.endsWith("/api/user/login")) {
        return json(
          { success: true, data: { id: 7 } },
          { headers: { "set-cookie": "session=abc; Path=/", "content-type": "application/json" } },
        );
      }
      if (url.includes("/api/channel/search")) {
        return json({
          success: true,
          data: { items: [{ id: 42, name: "cliproxyapi" }], total: 1 },
        });
      }
      return json({ success: true });
    });

    const result = await syncCliProxyChannel(fetchImpl as unknown as typeof fetch);
    expect(result).toEqual({ action: "updated", models: ["gemini-3-pro", "gpt-5-codex"] });

    const update = calls.find((c) => c.method === "PUT");
    expect(update?.headers.get("cookie")).toBe("session=abc");
    expect(update?.headers.get("new-api-user")).toBe("7");
    expect(update?.body).toMatchObject({
      id: 42,
      type: 1,
      name: "cliproxyapi",
      key: "proxy-key",
      base_url: "http://nebutra-cliproxyapi.internal:8317",
      models: "gemini-3-pro,gpt-5-codex",
    });
  });

  it("refuses to register an empty pool", async () => {
    process.env.CLIPROXY_API_KEY = "proxy-key";
    process.env.NEW_API_ROOT_PASSWORD = "root-pw";
    const fetchImpl = vi.fn(async () => json({ data: [] }));
    await expect(syncCliProxyChannel(fetchImpl as unknown as typeof fetch)).rejects.toThrow(
      /no models/,
    );
  });
});
