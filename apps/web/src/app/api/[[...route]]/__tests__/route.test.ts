/**
 * Covers the optional-catch-all gateway mount (Sailor Convergence ADR §6).
 *
 * `@nebutra/gateway/app` is mocked rather than built for real: this proves
 * the mount's own logic (mode selection, not starting workers, forwarding
 * to app.fetch) without depending on the gateway's compiled dist output
 * being present, which is exactly the kind of coupling that would make this
 * test flaky in isolation.
 */
import { afterEach, describe, expect, it, vi } from "vitest";

const fetchMock = vi.fn(async (request: Request) => {
  const url = new URL(request.url);
  return new Response(JSON.stringify({ status: "ok", path: url.pathname }), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
});

const createGatewayAppMock = vi.fn(async (options: { startWorkers?: boolean }) => ({
  app: { fetch: fetchMock },
  areGatewayDepsInitialized: () => false,
  __options: options,
}));

vi.mock("@nebutra/gateway/app", () => ({
  createGatewayApp: createGatewayAppMock,
}));

const ORIGINAL_GATEWAY_MODE = process.env.GATEWAY_MODE;

afterEach(() => {
  vi.resetModules();
  fetchMock.mockClear();
  createGatewayAppMock.mockClear();
  if (ORIGINAL_GATEWAY_MODE === undefined) {
    delete process.env.GATEWAY_MODE;
  } else {
    process.env.GATEWAY_MODE = ORIGINAL_GATEWAY_MODE;
  }
});

describe("apps/web api/[[...route]] gateway mount", () => {
  it("embedded mode (default) serves the gateway app through app.fetch, without starting workers", async () => {
    delete process.env.GATEWAY_MODE;
    const { GET } = await import("../route");

    const res = await GET(new Request("http://localhost/api/misc/health"));

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ status: "ok", path: "/api/misc/health" });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    // The factory is asked NOT to start background workers — Next's
    // request-handling process must not host an in-process queue consumer.
    expect(createGatewayAppMock).toHaveBeenCalledWith({ startWorkers: false });
  });

  it('GATEWAY_MODE="embedded" behaves the same as the default', async () => {
    process.env.GATEWAY_MODE = "embedded";
    const { POST } = await import("../route");

    const res = await POST(
      new Request("http://localhost/api/v1/legal/consent", { method: "POST" }),
    );

    expect(res.status).toBe(200);
    expect(createGatewayAppMock).toHaveBeenCalledTimes(1);
  });

  it('GATEWAY_MODE="external" 404s without building the gateway app', async () => {
    process.env.GATEWAY_MODE = "external";
    const { GET } = await import("../route");

    const res = await GET(new Request("http://localhost/api/misc/health"));

    expect(res.status).toBe(404);
    expect(createGatewayAppMock).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("caches the built app across requests instead of rebuilding it per call", async () => {
    delete process.env.GATEWAY_MODE;
    const { GET } = await import("../route");

    await GET(new Request("http://localhost/api/misc/health"));
    await GET(new Request("http://localhost/api/system/status"));

    expect(createGatewayAppMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
