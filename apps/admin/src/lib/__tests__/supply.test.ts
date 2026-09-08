import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("../staff", () => ({
  requireStaff: vi
    .fn()
    .mockResolvedValue({ userId: "u", email: "ops@example.com", role: "platform_owner" }),
  StaffAccessError: class extends Error {},
}));

const { proxyToCliProxy } = await import("../supply");

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
      new Request("https://admin.example.com/v0/management/auth-files?x=1", {
        headers: { authorization: "Bearer whatever-the-ui-typed", cookie: "cf=1" },
      }),
      "/v0/management/auth-files",
      fetchImpl as unknown as typeof fetch,
    );
    expect(res.status).toBe(200);
  });
});

describe("rebrandManagementConsole", () => {
  it("replaces the vendor title and prepends the Nebutra note", async () => {
    const { rebrandManagementConsole } = await import("../supply");
    const out = rebrandManagementConsole(
      '<html><head><title>CLI Proxy API Management Center</title></head><body class="x"><div id="app"></div></body></html>',
    );
    expect(out).toMatch(/<title>[^<]+ Admin · 引擎控制台<\/title>/);
    expect(out).toMatch(/<body class="x"><style id="nebutra-skin">/);
    expect(out).toContain('id="nebutra-note"');
    expect(out).not.toContain("Management Center");
  });
});
