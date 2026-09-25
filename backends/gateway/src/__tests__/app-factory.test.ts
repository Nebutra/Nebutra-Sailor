/**
 * Covers the `createGatewayApp` factory extracted in src/app.ts (Sailor
 * Convergence ADR §6 — mounting the gateway inside Next).
 *
 * Three things matter for that mount:
 *   1. `startWorkers: false` (what the Next route handler passes in
 *      GATEWAY_MODE=embedded) must not register the queue-backed background
 *      workers — Next's request-handling process is not a place to host an
 *      in-process consumer loop.
 *   2. The app it returns still serves ordinary routes (misc/health)
 *      regardless of `startWorkers` — mounting must not silently drop
 *      routes.
 *   3. The default (`startWorkers` omitted, what the standalone entry
 *      src/index.ts relies on) keeps registering workers exactly as before
 *      this refactor.
 *
 * `buildGatewayDeps()` itself is mocked — it needs real Redis credentials
 * (see lib/gateway-deps.ts), which this test environment does not have, and
 * that is orthogonal to what's under test here: whether `startWorkers`
 * gates the two worker-registration calls once deps are available.
 */
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import type { GatewayDeps } from "../lib/gateway-deps.js";

const fakeDeps: GatewayDeps = {
  redis: {
    get: vi.fn(async () => null),
    set: vi.fn(async () => undefined),
    del: vi.fn(async () => undefined),
    eval: vi.fn(async () => undefined),
  },
  prisma: {} as GatewayDeps["prisma"],
  queue: { registerHandler: vi.fn() } as unknown as GatewayDeps["queue"],
  getCreditBalance: vi.fn(async () => 0),
};

vi.mock("../lib/gateway-deps.js", () => ({
  buildGatewayDeps: vi.fn(async () => fakeDeps),
}));

vi.mock("../lib/para-agent-worker.js", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../lib/para-agent-worker.js")>();
  return { ...actual, registerParaAgentWorker: vi.fn() };
});

vi.mock("@nebutra/gateway-core", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@nebutra/gateway-core")>();
  return { ...actual, registerCompletionWorker: vi.fn() };
});

beforeAll(() => {
  vi.stubEnv("NODE_ENV", "test");
});

afterEach(() => {
  vi.clearAllMocks();
});

afterAll(() => {
  vi.unstubAllEnvs();
});

describe("createGatewayApp", () => {
  it("startWorkers: false does not register background workers, but still serves routes", async () => {
    const { registerParaAgentWorker } = await import("../lib/para-agent-worker.js");
    const { registerCompletionWorker } = await import("@nebutra/gateway-core");
    const { createGatewayApp } = await import("../app.js");

    const { app, areGatewayDepsInitialized } = await createGatewayApp({ startWorkers: false });

    expect(registerParaAgentWorker).not.toHaveBeenCalled();
    expect(registerCompletionWorker).not.toHaveBeenCalled();
    // gatewayDepsInitialized only flips true once the completion worker is
    // registered — with workers skipped it must stay false.
    expect(areGatewayDepsInitialized()).toBe(false);

    // Route is still mounted and reachable — embedding must not drop routes.
    const res = await app.request("/api/misc/health");
    expect(res.status).not.toBe(404);
    const body = (await res.json()) as Record<string, unknown>;
    expect(body).toHaveProperty("status");
  });

  it("defaults to startWorkers: true (standalone-entry behavior, unchanged)", async () => {
    const { registerParaAgentWorker } = await import("../lib/para-agent-worker.js");
    const { registerCompletionWorker } = await import("@nebutra/gateway-core");
    const { createGatewayApp } = await import("../app.js");

    const { areGatewayDepsInitialized } = await createGatewayApp();

    expect(registerParaAgentWorker).toHaveBeenCalledTimes(1);
    expect(registerCompletionWorker).toHaveBeenCalledTimes(1);
    expect(areGatewayDepsInitialized()).toBe(true);
  });
});
