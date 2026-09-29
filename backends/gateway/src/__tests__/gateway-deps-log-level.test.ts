/**
 * Preview mode (no Redis/Upstash keys configured) must boot calmly.
 *
 * `buildGatewayDeps()` throws "Redis credentials not configured" when
 * neither UPSTASH_REDIS_REST_URL nor UPSTASH_REDIS_REST_TOKEN is set (see
 * packages/integrations/cache/src/env.ts). That is the expected, documented
 * state for a fresh scaffold in preview mode — src/app.ts must log it as an
 * info/warn notice, not an `error`, so `pnpm dev` on a zero-keys scaffold
 * doesn't print a red ERROR line for a working default.
 */
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("../lib/gateway-deps.js", () => ({
  buildGatewayDeps: vi.fn(async () => {
    throw new Error("Redis credentials not configured");
  }),
}));

vi.mock("../lib/para-agent-worker.js", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../lib/para-agent-worker.js")>();
  return { ...actual, registerParaAgentWorker: vi.fn() };
});

vi.mock("@nebutra/gateway-core", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@nebutra/gateway-core")>();
  return { ...actual, registerCompletionWorker: vi.fn() };
});

vi.mock("@nebutra/logger", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@nebutra/logger")>();
  return {
    ...actual,
    logger: {
      ...actual.logger,
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    },
  };
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

describe("createGatewayApp — missing Redis credentials in preview mode", {
  timeout: 60_000,
}, () => {
  it("logs a warn notice, never an error, and still boots", async () => {
    const { logger } = await import("@nebutra/logger");
    const { createGatewayApp } = await import("../app.js");

    const { app, areGatewayDepsInitialized } = await createGatewayApp({ startWorkers: false });

    expect(areGatewayDepsInitialized()).toBe(false);
    expect(logger.error).not.toHaveBeenCalledWith(
      expect.stringContaining("Failed to initialize gateway deps"),
      expect.anything(),
    );
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining("AI Gateway routes are off"));

    // App still boots and serves ordinary routes.
    const res = await app.request("/api/misc/health");
    expect(res.status).not.toBe(404);
  });
});
