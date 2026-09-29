import { Hono } from "hono";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Covers the guard on the platform control plane's browser-facing proxy —
 * the part @nebutra/web's Server Actions cannot express (see
 * platform-supply.ts's own header comment). Three cases per the migration's
 * runtime-verification ask: no assertion header → denied, an assertion that
 * verifies but resolves to no PlatformStaff grant → denied, and a verified
 * staff identity → the request reaches the (mocked) upstream.
 */

const { verifyMock, findUserMock, findStaffMock, fetchMock } = vi.hoisted(() => ({
  verifyMock: vi.fn(),
  findUserMock: vi.fn(),
  findStaffMock: vi.fn(),
  fetchMock: vi.fn(),
}));

vi.mock("jose", () => ({
  createRemoteJWKSet: () => ({}),
  jwtVerify: (...args: unknown[]) => verifyMock(...args),
}));

vi.mock("@nebutra/db", () => ({
  getSystemDb: () => ({
    user: { findUnique: (args: unknown) => findUserMock(args) },
    platformStaff: { findUnique: (args: unknown) => findStaffMock(args) },
  }),
}));

vi.mock("@nebutra/permissions", () => ({
  canPlatform: () => true,
  normalizePlatformStaffRole: (role: string) => role,
}));

vi.mock("@nebutra/brand/metadata", () => ({
  brand: { name: "Test Brand" },
}));

async function createApp() {
  const { platformSupplyRoutes } = await import("./platform-supply.js");
  const app = new Hono();
  app.route("/", platformSupplyRoutes);
  return app;
}

describe("platform-supply guard", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    vi.stubEnv("ACCESS_AUD", "test-aud");
    vi.stubEnv("CLIPROXY_MANAGEMENT_KEY", "test-management-key");
    global.fetch = fetchMock as unknown as typeof fetch;
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("denies a request with no Cf-Access-Jwt-Assertion header", async () => {
    const app = await createApp();
    const res = await app.request("/management.html");
    expect(res.status).toBe(403);
    expect(verifyMock).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("denies a verified identity with no PlatformStaff grant", async () => {
    verifyMock.mockResolvedValue({ payload: { email: "nobody@example.com" } });
    findUserMock.mockResolvedValue(null);
    const app = await createApp();
    const res = await app.request("/management.html", {
      headers: { "cf-access-jwt-assertion": "fake-jwt" },
    });
    expect(res.status).toBe(403);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("denies a revoked PlatformStaff grant", async () => {
    verifyMock.mockResolvedValue({ payload: { email: "staff@example.com" } });
    findUserMock.mockResolvedValue({ id: "user_1", email: "staff@example.com" });
    findStaffMock.mockResolvedValue({ role: "operator", revokedAt: new Date() });
    const app = await createApp();
    const res = await app.request("/management.html", {
      headers: { "cf-access-jwt-assertion": "fake-jwt" },
    });
    expect(res.status).toBe(403);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("proxies to CLIProxyAPI for a verified staff grant, with the management key injected", async () => {
    verifyMock.mockResolvedValue({ payload: { email: "staff@example.com" } });
    findUserMock.mockResolvedValue({ id: "user_1", email: "staff@example.com" });
    findStaffMock.mockResolvedValue({ role: "operator", revokedAt: null });
    fetchMock.mockResolvedValue(
      new Response("<html><body>console</body></html>", {
        status: 200,
        headers: { "content-type": "text/html" },
      }),
    );

    const app = await createApp();
    const res = await app.request("/management.html", {
      headers: { "cf-access-jwt-assertion": "fake-jwt" },
    });

    expect(res.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [upstreamUrl, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(upstreamUrl).toContain("/management.html");
    const headers = init.headers as Headers;
    expect(headers.get("authorization")).toBe("Bearer test-management-key");

    const body = await res.text();
    expect(body).toContain("Test Brand Admin");
  });
});
