/**
 * Health Endpoint Integration Tests
 *
 * Tests backends/gateway/src/routes/misc/health.ts using Hono's
 * app.request() pattern with a mocked @nebutra/db module.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ---------------------------------------------------------------------------
// Mock @nebutra/db BEFORE importing the health route.
// The route uses a dynamic import inside checkDatabase(), so we mock the
// module factory — vi.mock() hoists and intercepts both static and dynamic
// imports of the same specifier.
// ---------------------------------------------------------------------------

const mockQueryRaw = vi.fn();
const mockPing = vi.fn();
const mockEval = vi.fn();

vi.mock("@nebutra/db", () => ({
  getSystemDb: () => ({
    $queryRaw: mockQueryRaw,
  }),
  prisma: {
    $queryRaw: mockQueryRaw,
  },
}));

vi.mock("@nebutra/cache", () => ({
  getRedis: () => ({
    ping: mockPing,
    eval: mockEval,
  }),
}));

import { healthRoutes } from "../routes/misc/health.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getHealth() {
  return healthRoutes.request("/health", { method: "GET" });
}

function getReady() {
  return healthRoutes.request("/ready", { method: "GET" });
}

// ---------------------------------------------------------------------------
// Reset mocks before each test
// ---------------------------------------------------------------------------

beforeEach(() => {
  vi.clearAllMocks();
  mockPing.mockResolvedValue("PONG");
  mockEval.mockResolvedValue(1);
});

afterEach(() => {
  vi.useRealTimers();
});

// ===========================================================================
// GET /health — status codes
// ===========================================================================

describe("GET /health — status codes", () => {
  it("returns 200 with status: 'healthy' when the database check passes", async () => {
    mockQueryRaw.mockResolvedValueOnce([{ "?column?": 1 }]);

    const res = await getHealth();
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.status).toBe("healthy");
  });

  it("returns 503 with status: 'unhealthy' when the database throws", async () => {
    mockQueryRaw.mockRejectedValueOnce(new Error("connection refused"));
    mockPing.mockRejectedValueOnce(new Error("cache connection refused"));

    const res = await getHealth();
    const body = await res.json();

    expect(res.status).toBe(503);
    expect(body.status).toBe("unhealthy");
  });
});

// ===========================================================================
// GET /health — response structure
// ===========================================================================

describe("GET /health — response structure", () => {
  it("response body contains dependencies.database.status field", async () => {
    mockQueryRaw.mockResolvedValueOnce([{ "?column?": 1 }]);

    const res = await getHealth();
    const body = await res.json();

    expect(body.dependencies).toBeDefined();
    expect(body.dependencies.database).toBeDefined();
    expect(body.dependencies.database.status).toBeDefined();
  });

  it("response body contains dependencies.database.latencyMs field", async () => {
    mockQueryRaw.mockResolvedValueOnce([{ "?column?": 1 }]);

    const res = await getHealth();
    const body = await res.json();

    expect(body.dependencies.database.latencyMs).toBeDefined();
  });

  it("dependencies.database.status is 'up' when DB is reachable", async () => {
    mockQueryRaw.mockResolvedValueOnce([{ "?column?": 1 }]);

    const res = await getHealth();
    const body = await res.json();

    expect(body.dependencies.database.status).toBe("up");
  });

  it("dependencies.database.status is 'down' when DB throws", async () => {
    mockQueryRaw.mockRejectedValueOnce(new Error("connection timeout"));
    mockPing.mockResolvedValueOnce("PONG");

    const res = await getHealth();
    const body = await res.json();

    expect(body.dependencies.database.status).toBe("down");
  });

  it("latencyMs is a non-negative number", async () => {
    mockQueryRaw.mockResolvedValueOnce([{ "?column?": 1 }]);

    const res = await getHealth();
    const body = await res.json();

    const { latencyMs } = body.dependencies.database;
    expect(typeof latencyMs).toBe("number");
    expect(latencyMs).toBeGreaterThanOrEqual(0);
  });

  it("latencyMs is non-negative even when DB fails", async () => {
    mockQueryRaw.mockRejectedValueOnce(new Error("DB down"));

    const res = await getHealth();
    const body = await res.json();

    const { latencyMs } = body.dependencies.database;
    expect(typeof latencyMs).toBe("number");
    expect(latencyMs).toBeGreaterThanOrEqual(0);
  });

  it("clears dependency timeout timers after successful checks", async () => {
    vi.useFakeTimers();
    mockQueryRaw.mockResolvedValueOnce([{ "?column?": 1 }]);
    mockPing.mockResolvedValueOnce("PONG");

    const res = await getHealth();
    const body = await res.json();

    expect(body.status).toBe("healthy");
    expect(vi.getTimerCount()).toBe(0);
  });

  it("timestamp is a valid ISO 8601 string", async () => {
    mockQueryRaw.mockResolvedValueOnce([{ "?column?": 1 }]);

    const res = await getHealth();
    const body = await res.json();

    expect(typeof body.timestamp).toBe("string");
    // Round-tripping through Date and back should produce the same string
    expect(new Date(body.timestamp).toISOString()).toBe(body.timestamp);
  });

  it("response includes version and uptime fields", async () => {
    mockQueryRaw.mockResolvedValueOnce([{ "?column?": 1 }]);

    const res = await getHealth();
    const body = await res.json();

    expect(typeof body.version).toBe("string");
    expect(typeof body.uptime).toBe("number");
    expect(body.uptime).toBeGreaterThanOrEqual(0);
  });
});

// ===========================================================================
// GET /health — Cache-Control header
// ===========================================================================

describe("GET /health — response headers", () => {
  it("sets Cache-Control: no-cache, no-store header on healthy response", async () => {
    mockQueryRaw.mockResolvedValueOnce([{ "?column?": 1 }]);

    const res = await getHealth();

    expect(res.headers.get("Cache-Control")).toBe("no-cache, no-store");
  });

  it("sets Cache-Control: no-cache, no-store header on unhealthy response", async () => {
    mockQueryRaw.mockRejectedValueOnce(new Error("DB down"));

    const res = await getHealth();

    expect(res.headers.get("Cache-Control")).toBe("no-cache, no-store");
  });
});

// ===========================================================================
// GET /ready — readiness follows the request path, not liveness
//
// /health must stay 200 while Redis is down so Fly does not restart the
// machine. /ready is the probe monitors point at: it goes through the same
// cache client the rate limiter uses and answers 503 when that path is broken.
// ===========================================================================

describe("GET /ready", () => {
  it("returns 200 { ready: true } when the database and the rate-limit Redis both answer", async () => {
    mockQueryRaw.mockResolvedValueOnce([{ "?column?": 1 }]);
    mockEval.mockResolvedValueOnce(1);

    const res = await getReady();
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.ready).toBe(true);
    expect(body.failing).toBeUndefined();
    expect(body.checks.database.status).toBe("up");
    expect(body.checks.redis.status).toBe("up");
  });

  it("probes Redis with an EVAL through the shared cache client, the command the rate limiter issues", async () => {
    mockQueryRaw.mockResolvedValueOnce([{ "?column?": 1 }]);

    await getReady();

    expect(mockEval).toHaveBeenCalledTimes(1);
    expect(mockEval).toHaveBeenCalledWith("return 1", [], []);
    expect(mockPing).not.toHaveBeenCalled();
  });

  it("returns 503 naming redis when the EVAL fails, even though /health would still be 200", async () => {
    mockQueryRaw.mockResolvedValue([{ "?column?": 1 }]);
    mockEval.mockRejectedValue(new Error("ECONNREFUSED 127.0.0.1:6379"));

    const ready = await getReady();
    const readyBody = await ready.json();

    expect(ready.status).toBe(503);
    expect(readyBody.ready).toBe(false);
    expect(readyBody.failing).toEqual(["redis"]);
    expect(readyBody.checks.redis.status).toBe("down");
    expect(readyBody.checks.database.status).toBe("up");

    // The liveness probe keeps the machine alive through the same outage.
    mockPing.mockRejectedValueOnce(new Error("ECONNREFUSED 127.0.0.1:6379"));
    const health = await getHealth();
    const healthBody = await health.json();

    expect(health.status).toBe(200);
    expect(healthBody.status).toBe("degraded");
  });

  it("returns 503 naming redis when the EVAL answers but not with 1", async () => {
    mockQueryRaw.mockResolvedValueOnce([{ "?column?": 1 }]);
    mockEval.mockResolvedValueOnce("<html>proxy error</html>");

    const res = await getReady();
    const body = await res.json();

    expect(res.status).toBe(503);
    expect(body.failing).toEqual(["redis"]);
  });

  it("returns 503 naming database when SELECT 1 fails", async () => {
    mockQueryRaw.mockRejectedValueOnce(new Error("connection refused"));
    mockEval.mockResolvedValueOnce(1);

    const res = await getReady();
    const body = await res.json();

    expect(res.status).toBe(503);
    expect(body.ready).toBe(false);
    expect(body.failing).toEqual(["database"]);
    expect(body.checks.database.status).toBe("down");
    expect(body.checks.redis.status).toBe("up");
  });

  it("names every failing dependency when both are down", async () => {
    mockQueryRaw.mockRejectedValueOnce(new Error("connection refused"));
    mockEval.mockRejectedValueOnce(new Error("ECONNREFUSED"));

    const res = await getReady();
    const body = await res.json();

    expect(res.status).toBe(503);
    expect(body.failing).toEqual(["database", "redis"]);
  });

  it("reports non-negative latency for both checks", async () => {
    mockQueryRaw.mockResolvedValueOnce([{ "?column?": 1 }]);

    const res = await getReady();
    const body = await res.json();

    for (const name of ["database", "redis"]) {
      expect(typeof body.checks[name].latencyMs).toBe("number");
      expect(body.checks[name].latencyMs).toBeGreaterThanOrEqual(0);
    }
  });

  it("clears dependency timeout timers after the checks settle", async () => {
    vi.useFakeTimers();
    mockQueryRaw.mockResolvedValueOnce([{ "?column?": 1 }]);
    mockEval.mockResolvedValueOnce(1);

    const res = await getReady();

    expect(res.status).toBe(200);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("is never cacheable, on 200 and on 503", async () => {
    mockQueryRaw.mockResolvedValueOnce([{ "?column?": 1 }]);
    const ok = await getReady();
    expect(ok.headers.get("Cache-Control")).toBe("no-cache, no-store");

    mockQueryRaw.mockRejectedValueOnce(new Error("DB down"));
    const failed = await getReady();
    expect(failed.status).toBe(503);
    expect(failed.headers.get("Cache-Control")).toBe("no-cache, no-store");
  });
});
