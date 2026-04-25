/**
 * Middleware Integration Tests
 *
 * Tests tenantContext, rateLimit, idempotency middlewares and health endpoints
 * using a wrapper OpenAPIHono app that mirrors the production middleware mount
 * order from index.ts.
 */

import { createHmac } from "node:crypto";
import { OpenAPIHono } from "@hono/zod-openapi";
import { beforeEach, describe, expect, it, vi } from "vitest";

// ---------------------------------------------------------------------------
// Module mocks — vi.hoisted() ensures mock fns are available when vi.mock()
// factories execute (vi.mock is hoisted above all imports by Vitest).
// ---------------------------------------------------------------------------

const {
  mockCreateAuth,
  mockRedisGet,
  mockRedisSet,
  mockRedisDel,
  mockRedisPing,
  mockRedisStore,
  mockQueryRaw,
  mockVerifyToken,
} = vi.hoisted(() => ({
  mockCreateAuth: vi.fn(),
  mockRedisGet: vi.fn(),
  mockRedisSet: vi.fn(),
  mockRedisDel: vi.fn(),
  mockRedisPing: vi.fn(),
  mockRedisStore: new Map<string, unknown>(),
  mockQueryRaw: vi.fn(),
  mockVerifyToken: vi.fn(),
}));

vi.mock("@nebutra/auth/server", () => ({
  createAuth: (...args: unknown[]) => mockCreateAuth(...args),
}));

vi.mock("@nebutra/cache", () => ({
  getRedis: () => ({
    get: mockRedisGet,
    set: mockRedisSet,
    del: mockRedisDel,
    ping: mockRedisPing,
  }),
  redis: {
    ping: mockRedisPing,
  },
}));

vi.mock("@nebutra/db", () => ({
  getSystemDb: () => ({
    $queryRaw: mockQueryRaw,
  }),
  prisma: {
    $queryRaw: mockQueryRaw,
  },
}));

vi.mock("@nebutra/logger", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

vi.mock("@nebutra/audit", () => ({
  recordAuditEvent: vi.fn(),
}));

vi.mock("../../services/circuitBreaker.js", () => ({
  aiServiceBreaker: {
    getStatus: async () => ({
      state: "CLOSED",
      failures: 0,
      successes: 0,
      openedAt: null,
    }),
  },
  billingServiceBreaker: {
    getStatus: async () => ({
      state: "CLOSED",
      failures: 0,
      successes: 0,
      openedAt: null,
    }),
  },
}));

// ---------------------------------------------------------------------------
// Imports (after mocks)
// ---------------------------------------------------------------------------

import { idempotencyMiddleware } from "@/middlewares/idempotency.js";
import { rateLimitMiddleware } from "@/middlewares/rateLimit.js";
import { tenantContextMiddleware } from "@/middlewares/tenantContext.js";
import { healthRoutes } from "../routes/misc/health.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Compute a valid HMAC service token for the given header values */
function computeServiceToken(
  secret: string,
  userId?: string,
  orgId?: string,
  role?: string,
  plan?: string,
): string {
  const canonical = `${userId ?? ""}:${orgId ?? ""}:${role ?? ""}:${plan ?? ""}`;
  return createHmac("sha256", secret).update(canonical).digest("hex");
}

// ---------------------------------------------------------------------------
// Reset state before each test
// ---------------------------------------------------------------------------

beforeEach(() => {
  vi.clearAllMocks();
  mockRedisStore.clear();
  // Mock auth provider that returns null session (unauthenticated)
  mockCreateAuth.mockResolvedValue({
    provider: "better-auth",
    getSession: vi.fn().mockResolvedValue(null),
  });
  mockRedisGet.mockImplementation(async (key: string) => mockRedisStore.get(key) ?? null);
  mockRedisSet.mockImplementation(async (key: string, value: unknown) => {
    mockRedisStore.set(key, value);
    return "OK";
  });
  mockRedisDel.mockImplementation(async (key: string) => (mockRedisStore.delete(key) ? 1 : 0));
  mockRedisPing.mockResolvedValue("PONG");
  mockQueryRaw.mockResolvedValue([{ "?column?": 1 }]);

  // Ensure SERVICE_SECRET is set for most tests
  process.env.SERVICE_SECRET = "test-secret-key-for-hmac-verification";
});

// ===========================================================================
// tenantContext middleware
// ===========================================================================

describe("tenantContextMiddleware", () => {
  function createTenantApp() {
    const app = new OpenAPIHono();
    app.use("*", tenantContextMiddleware);
    app.get("/test", (c) => {
      const tenant = c.get("tenant");
      return c.json(tenant);
    });
    app.post("/test", (c) => {
      const tenant = c.get("tenant");
      return c.json(tenant);
    });
    return app;
  }

  describe("S2S HMAC (x-service-token)", () => {
    it("populates tenant context when x-service-token HMAC is valid", async () => {
      const secret = process.env.SERVICE_SECRET ?? "";
      const userId = "user-s2s-123";
      const orgId = "org-s2s-456";
      const role = "org:admin";
      const plan = "PRO";
      const token = computeServiceToken(secret, userId, orgId, role, plan);

      const app = createTenantApp();
      const res = await app.request("/test", {
        method: "GET",
        headers: {
          "x-service-token": token,
          "x-user-id": userId,
          "x-organization-id": orgId,
          "x-role": role,
          "x-plan": plan,
        },
      });

      const body = await res.json();
      expect(res.status).toBe(200);
      expect(body.userId).toBe(userId);
      expect(body.organizationId).toBe(orgId);
      expect(body.role).toBe(role);
      expect(body.plan).toBe(plan);
    });

    it("rejects tenant headers when x-service-token HMAC is invalid", async () => {
      const app = createTenantApp();
      const res = await app.request("/test", {
        method: "GET",
        headers: {
          "x-service-token": "invalid-hmac-value",
          "x-user-id": "user-evil",
          "x-organization-id": "org-evil",
        },
      });

      const body = await res.json();
      expect(res.status).toBe(200);
      // Headers should NOT be trusted — tenant should have defaults
      expect(body.userId).toBeUndefined();
      expect(body.organizationId).toBeUndefined();
      expect(body.plan).toBe("FREE");
    });
  });

  describe("No x-service-token (untrusted headers)", () => {
    it("does NOT trust x-user-id/x-organization-id without service token", async () => {
      const app = createTenantApp();
      const res = await app.request("/test", {
        method: "GET",
        headers: {
          "x-user-id": "user-untrusted",
          "x-organization-id": "org-untrusted",
        },
      });

      const body = await res.json();
      expect(res.status).toBe(200);
      expect(body.userId).toBeUndefined();
      expect(body.organizationId).toBeUndefined();
      expect(body.plan).toBe("FREE");
    });

    it("does NOT trust legacy x-tenant-id header without service token (spoofing attempt)", async () => {
      const app = createTenantApp();
      const res = await app.request("/test", {
        method: "GET",
        headers: {
          // Attacker attempts to spoof tenant id without any HMAC proof
          "x-tenant-id": "attacker-org",
        },
      });

      const body = await res.json();
      expect(res.status).toBe(200);
      expect(body.userId).toBeUndefined();
      expect(body.organizationId).toBeUndefined();
      expect(body.plan).toBe("FREE");
    });

    it("does NOT trust x-tenant-id even when a service token is also present (alias removed)", async () => {
      const secret = process.env.SERVICE_SECRET ?? "";
      // Compute token over empty orgId — matching the canonical string
      // when only `x-tenant-id` is sent. The middleware must ignore
      // `x-tenant-id` completely regardless of whether the token validates.
      const token = computeServiceToken(secret, "user-1", "", "org:member", "FREE");

      const app = createTenantApp();
      const res = await app.request("/test", {
        method: "GET",
        headers: {
          "x-service-token": token,
          "x-user-id": "user-1",
          "x-tenant-id": "org-smuggled",
          "x-role": "org:member",
          "x-plan": "FREE",
        },
      });

      const body = await res.json();
      expect(res.status).toBe(200);
      // User is trusted (token matches the empty-org canonical),
      // but organizationId must NOT be populated from x-tenant-id.
      expect(body.userId).toBe("user-1");
      expect(body.organizationId).toBeUndefined();
    });
  });

  describe("Bearer JWT", () => {
    it("populates tenant from session when token verifies", async () => {
      mockCreateAuth.mockResolvedValueOnce({
        provider: "better-auth",
        getSession: vi.fn().mockResolvedValueOnce({
          userId: "user-jwt-789",
          organizationId: "org-jwt-101",
          role: "org:member",
          expiresAt: new Date(Date.now() + 3600000),
        }),
      });

      const app = createTenantApp();
      const res = await app.request("/test", {
        method: "GET",
        headers: {
          authorization: "Bearer valid-jwt-token",
        },
      });

      const body = await res.json();
      expect(res.status).toBe(200);
      expect(body.userId).toBe("user-jwt-789");
      expect(body.organizationId).toBe("org-jwt-101");
      expect(body.role).toBe("org:member");
    });

    it("treats request as unauthenticated when JWT verification fails", async () => {
      mockCreateAuth.mockResolvedValueOnce({
        provider: "better-auth",
        getSession: vi.fn().mockRejectedValueOnce(new Error("Token expired")),
      });

      const app = createTenantApp();
      const res = await app.request("/test", {
        method: "GET",
        headers: {
          authorization: "Bearer expired-jwt-token",
        },
      });

      const body = await res.json();
      expect(res.status).toBe(200);
      expect(body.userId).toBeUndefined();
      expect(body.organizationId).toBeUndefined();
      expect(body.plan).toBe("FREE");
    });

    it("ignores Authorization header without Bearer prefix", async () => {
      const app = createTenantApp();
      const res = await app.request("/test", {
        method: "GET",
        headers: {
          authorization: "Basic dXNlcjpwYXNz",
        },
      });

      const body = await res.json();
      expect(res.status).toBe(200);
      expect(body.userId).toBeUndefined();
      expect(mockVerifyToken).not.toHaveBeenCalled();
    });
  });

  describe("IP extraction", () => {
    it("extracts ip from x-forwarded-for header", async () => {
      const app = createTenantApp();
      const res = await app.request("/test", {
        method: "GET",
        headers: {
          "x-forwarded-for": "203.0.113.50, 70.41.3.18",
        },
      });

      const body = await res.json();
      expect(body.ip).toBe("203.0.113.50");
    });

    it("falls back to x-real-ip when x-forwarded-for is absent", async () => {
      const app = createTenantApp();
      const res = await app.request("/test", {
        method: "GET",
        headers: {
          "x-real-ip": "198.51.100.42",
        },
      });

      const body = await res.json();
      expect(body.ip).toBe("198.51.100.42");
    });
  });
});

// ===========================================================================
// rateLimitMiddleware
// ===========================================================================

describe("rateLimitMiddleware", () => {
  function createRateLimitApp() {
    const app = new OpenAPIHono();
    app.use("*", tenantContextMiddleware);
    app.use("*", rateLimitMiddleware);
    app.get("/api/v1/test", (c) => c.json({ ok: true }));
    return app;
  }

  it("passes through requests within limits", async () => {
    const app = createRateLimitApp();
    const res = await app.request("/api/v1/test", { method: "GET" });

    expect(res.status).toBe(200);
    // Should include rate limit headers
    expect(res.headers.get("X-RateLimit-Limit")).toBeDefined();
    expect(res.headers.get("X-RateLimit-Remaining")).toBeDefined();
    expect(res.headers.get("X-RateLimit-Reset")).toBeDefined();
  });

  it("returns 429 when requests exceed limits", async () => {
    const app = createRateLimitApp();

    // FREE plan: 100 max tokens, default weight 2 per request
    // Exhaust the bucket by sending many requests rapidly
    const results: Response[] = [];
    for (let i = 0; i < 60; i++) {
      results.push(await app.request("/api/v1/test", { method: "GET" }));
    }

    // At weight=2 per request, 60 requests = 120 tokens > 100 max
    // Some later requests should be 429
    const has429 = results.some((r) => r.status === 429);
    expect(has429).toBe(true);

    // Verify 429 response has correct structure
    const rejected = results.find((r) => r.status === 429);
    if (!rejected) throw new Error("Expected a 429 response");
    const body = await rejected.json();
    expect(body.error).toBe("Too Many Requests");
    expect(rejected.headers.get("Retry-After")).toBeDefined();
  });

  it("different plans have different rate limits", async () => {
    // PRO plan gets 1000 max tokens (vs FREE's 100)
    const secret = process.env.SERVICE_SECRET ?? "";
    const token = computeServiceToken(secret, "user-pro", "org-pro", "org:member", "PRO");

    const app = createRateLimitApp();

    // Send enough requests to exhaust FREE but not PRO
    const results: Response[] = [];
    for (let i = 0; i < 55; i++) {
      results.push(
        await app.request("/api/v1/test", {
          method: "GET",
          headers: {
            "x-service-token": token,
            "x-user-id": "user-pro",
            "x-organization-id": "org-pro",
            "x-role": "org:member",
            "x-plan": "PRO",
          },
        }),
      );
    }

    // With PRO plan (1000 tokens) and weight=2, 55 requests = 110 tokens
    // All should pass
    const allPassed = results.every((r) => r.status === 200);
    expect(allPassed).toBe(true);
  });
});

// ===========================================================================
// idempotencyMiddleware
// ===========================================================================

describe("idempotencyMiddleware", () => {
  function createIdempotencyApp() {
    const app = new OpenAPIHono();
    app.use("*", tenantContextMiddleware);
    app.use("*", idempotencyMiddleware);
    app.post("/api/v1/test", (c) => c.json({ result: "processed", ts: Date.now() }));
    app.get("/api/v1/test", (c) => c.json({ result: "get-response" }));
    return app;
  }

  const VALID_UUID = "550e8400-e29b-41d4-a716-446655440000";
  const ANOTHER_UUID = "6ba7b810-9dad-41d4-8b56-326614174000";

  it("returns cached response for same idempotency key", async () => {
    const app = createIdempotencyApp();

    // First request — no cache, lock succeeds, process normally
    mockRedisGet.mockResolvedValueOnce(null); // no cached response
    mockRedisSet.mockResolvedValueOnce("OK"); // lock acquired
    mockRedisDel.mockResolvedValueOnce(1); // lock released

    const res1 = await app.request("/api/v1/test", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Idempotency-Key": VALID_UUID,
      },
      body: JSON.stringify({ data: "hello" }),
    });

    expect(res1.status).toBe(200);
    const body1 = await res1.json();
    expect(body1.result).toBe("processed");

    // Verify it cached the response (set called with the response payload)
    const setCalls = mockRedisSet.mock.calls;
    const cacheCall = setCalls.find(
      (call: unknown[]) =>
        typeof call[0] === "string" && (call[0] as string).startsWith("idempotency:"),
    );
    expect(cacheCall).toBeDefined();

    // Second request — cache hit
    const cachedPayload = {
      status: 200,
      body: { result: "processed", ts: body1.ts },
      headers: { "Content-Type": "application/json" },
    };
    mockRedisGet.mockResolvedValueOnce(cachedPayload);

    const res2 = await app.request("/api/v1/test", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Idempotency-Key": VALID_UUID,
      },
      body: JSON.stringify({ data: "hello" }),
    });

    expect(res2.status).toBe(200);
    expect(res2.headers.get("Idempotency-Replayed")).toBe("true");
    const body2 = await res2.json();
    expect(body2.result).toBe("processed");
  });

  it("processes independently for different idempotency keys", async () => {
    const app = createIdempotencyApp();

    // First key — no cache, lock succeeds
    mockRedisGet.mockResolvedValueOnce(null);
    mockRedisSet.mockResolvedValueOnce("OK");
    mockRedisDel.mockResolvedValueOnce(1);

    const res1 = await app.request("/api/v1/test", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Idempotency-Key": VALID_UUID,
      },
      body: JSON.stringify({ data: "first" }),
    });
    expect(res1.status).toBe(200);

    // Second key — no cache, lock succeeds
    mockRedisGet.mockResolvedValueOnce(null);
    mockRedisSet.mockResolvedValueOnce("OK");
    mockRedisDel.mockResolvedValueOnce(1);

    const res2 = await app.request("/api/v1/test", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Idempotency-Key": ANOTHER_UUID,
      },
      body: JSON.stringify({ data: "second" }),
    });
    expect(res2.status).toBe(200);

    // Both should have been processed (no Idempotency-Replayed header)
    expect(res1.headers.get("Idempotency-Replayed")).toBeNull();
    expect(res2.headers.get("Idempotency-Replayed")).toBeNull();
  });

  it("skips idempotency for GET requests", async () => {
    const app = createIdempotencyApp();

    const res = await app.request("/api/v1/test", {
      method: "GET",
      headers: {
        "Idempotency-Key": VALID_UUID,
      },
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.result).toBe("get-response");
    // Redis should not have been called for GET
    expect(mockRedisGet).not.toHaveBeenCalled();
  });

  it("returns 400 for invalid idempotency key format", async () => {
    const app = createIdempotencyApp();

    const res = await app.request("/api/v1/test", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Idempotency-Key": "not-a-uuid",
      },
      body: JSON.stringify({ data: "test" }),
    });

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Invalid Idempotency-Key");
  });

  it("returns 409 when another request with same key is in flight", async () => {
    const app = createIdempotencyApp();

    // No cache but lock acquisition fails (another request holds the lock)
    mockRedisGet.mockResolvedValueOnce(null);
    mockRedisSet.mockResolvedValueOnce(null); // SET NX returns null when key exists

    const res = await app.request("/api/v1/test", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Idempotency-Key": VALID_UUID,
      },
      body: JSON.stringify({ data: "test" }),
    });

    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.error).toBe("Conflict");
  });

  it("processes normally when no idempotency key is provided", async () => {
    const app = createIdempotencyApp();

    const res = await app.request("/api/v1/test", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ data: "test" }),
    });

    expect(res.status).toBe(200);
    expect(mockRedisGet).not.toHaveBeenCalled();
  });
});

// ===========================================================================
// Health endpoints (no auth needed)
// ===========================================================================

describe("Health endpoints", () => {
  it("GET /health returns 200 when dependencies are up", async () => {
    mockQueryRaw.mockResolvedValueOnce([{ "?column?": 1 }]);
    mockRedisPing.mockResolvedValueOnce("PONG");

    const res = await healthRoutes.request("/health", { method: "GET" });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.status).toBe("healthy");
    expect(body.dependencies.database.status).toBe("up");
    expect(body.dependencies.cache.status).toBe("up");
  });

  it("GET /health returns 503 when all dependencies are down", async () => {
    mockQueryRaw.mockRejectedValueOnce(new Error("DB down"));
    mockRedisPing.mockRejectedValueOnce(new Error("Redis down"));

    const res = await healthRoutes.request("/health", { method: "GET" });
    const body = await res.json();

    expect(res.status).toBe(503);
    expect(body.status).toBe("unhealthy");
  });

  it("GET /health returns 200 with degraded when only cache is down", async () => {
    mockQueryRaw.mockResolvedValueOnce([{ "?column?": 1 }]);
    mockRedisPing.mockRejectedValueOnce(new Error("Redis down"));

    const res = await healthRoutes.request("/health", { method: "GET" });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.status).toBe("degraded");
    expect(body.dependencies.database.status).toBe("up");
    expect(body.dependencies.cache.status).toBe("down");
  });

  it("GET /health sets Cache-Control: no-cache, no-store", async () => {
    mockQueryRaw.mockResolvedValueOnce([{ "?column?": 1 }]);
    mockRedisPing.mockResolvedValueOnce("PONG");

    const res = await healthRoutes.request("/health", { method: "GET" });

    expect(res.headers.get("Cache-Control")).toBe("no-cache, no-store");
  });

  it("GET /health response contains expected structure", async () => {
    mockQueryRaw.mockResolvedValueOnce([{ "?column?": 1 }]);
    mockRedisPing.mockResolvedValueOnce("PONG");

    const res = await healthRoutes.request("/health", { method: "GET" });
    const body = await res.json();

    expect(typeof body.version).toBe("string");
    expect(typeof body.uptime).toBe("number");
    expect(typeof body.timestamp).toBe("string");
    expect(new Date(body.timestamp).toISOString()).toBe(body.timestamp);
    expect(body.dependencies).toBeDefined();
    expect(body.dependencies.database).toBeDefined();
    expect(body.dependencies.cache).toBeDefined();
  });
});
