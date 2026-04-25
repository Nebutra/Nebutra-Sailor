/**
 * Health Endpoint Integration Tests
 *
 * Tests apps/api-gateway/src/routes/misc/health.ts using Hono's
 * app.request() pattern with a mocked @nebutra/db module.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

// ---------------------------------------------------------------------------
// Mock @nebutra/db BEFORE importing the health route.
// The route uses a dynamic import inside checkDatabase(), so we mock the
// module factory — vi.mock() hoists and intercepts both static and dynamic
// imports of the same specifier.
// ---------------------------------------------------------------------------

const mockQueryRaw = vi.fn();
const mockPing = vi.fn();

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
  }),
}));

import { healthRoutes } from "../routes/misc/health.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getHealth() {
  return healthRoutes.request("/health", { method: "GET" });
}

// ---------------------------------------------------------------------------
// Reset mocks before each test
// ---------------------------------------------------------------------------

beforeEach(() => {
  vi.clearAllMocks();
  mockPing.mockResolvedValue("PONG");
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
