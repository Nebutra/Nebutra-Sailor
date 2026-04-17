import { Hono } from "hono";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { GatewayMiddlewareConfig } from "../middleware.js";
import { createGatewayAuthMiddleware } from "../middleware.js";
import type { ResolvedApiKey } from "../types.js";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock("../auth/api-key-resolver.js", () => ({
  resolveApiKey: vi.fn(),
}));

vi.mock("../auth/balance-guard.js", () => ({
  checkBalance: vi.fn(),
}));

vi.mock("@nebutra/rate-limit", () => ({
  getRateLimiter: vi.fn(),
}));

import { getRateLimiter } from "@nebutra/rate-limit";
import { resolveApiKey } from "../auth/api-key-resolver.js";
import { checkBalance } from "../auth/balance-guard.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const VALID_TOKEN = "sk-sailor-test-key-abc123";

const mockResolvedKey: ResolvedApiKey = {
  id: "key_001",
  organizationId: "org_123",
  userId: "user_456",
  scopes: ["chat:completions"],
  rateLimitRps: 100,
  plan: "PRO",
};

function createMockConfig(): GatewayMiddlewareConfig {
  return {
    redis: {
      get: vi.fn().mockResolvedValue(null),
      set: vi.fn().mockResolvedValue("OK"),
      del: vi.fn().mockResolvedValue(1),
    },
    prisma: {
      aPIKey: {
        findUnique: vi.fn().mockResolvedValue(null),
        update: vi.fn().mockResolvedValue({}),
      },
    },
    getCreditBalance: vi.fn().mockResolvedValue(100),
  };
}

function createTestApp(config: GatewayMiddlewareConfig) {
  const app = new Hono();
  app.use("*", createGatewayAuthMiddleware(config));
  app.all("*", (c) => c.json({ ok: true }));
  return app;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("createGatewayAuthMiddleware", () => {
  let config: GatewayMiddlewareConfig;
  let app: ReturnType<typeof Hono.prototype>;
  const mockConsume = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    config = createMockConfig();
    app = createTestApp(config);

    // Default happy-path mocks
    vi.mocked(resolveApiKey).mockResolvedValue(mockResolvedKey);
    vi.mocked(checkBalance).mockResolvedValue(undefined);
    vi.mocked(getRateLimiter).mockReturnValue({
      consume: mockConsume,
      maxTokens: 1000,
    } as never);
    mockConsume.mockResolvedValue({
      allowed: true,
      remaining: 99,
      resetAt: Date.now() + 1000,
    });
  });

  // 1. Missing Authorization header
  it("returns 401 when no Authorization header is present", async () => {
    const res = await app.request("http://localhost/v1/chat/completions", {
      method: "POST",
    });

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe("Missing or invalid API key");
  });

  // 2. Invalid Authorization header (not Bearer sk-sailor-*)
  it("returns 401 when Authorization header does not start with Bearer sk-sailor-", async () => {
    const res = await app.request("http://localhost/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: "Bearer sk-openai-abc123" },
    });

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe("Missing or invalid API key");
  });

  // 3. resolveApiKey throws (invalid/revoked/expired key)
  it("returns 401 when resolveApiKey rejects the token", async () => {
    vi.mocked(resolveApiKey).mockRejectedValue(new Error("API key has been revoked"));

    const res = await app.request("http://localhost/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${VALID_TOKEN}` },
    });

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe("API key has been revoked");
  });

  // 4. Rate limiter denies the request
  it("returns 429 with Retry-After header when rate limiter denies", async () => {
    mockConsume.mockResolvedValue({
      allowed: false,
      remaining: 0,
      resetAt: 1700000060,
      retryAfter: 30,
    });

    const res = await app.request("http://localhost/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${VALID_TOKEN}` },
    });

    expect(res.status).toBe(429);
    expect(res.headers.get("Retry-After")).toBe("30");
    expect(res.headers.get("X-RateLimit-Remaining")).toBe("0");
    expect(res.headers.get("X-RateLimit-Reset")).toBe("1700000060");

    const body = await res.json();
    expect(body.error).toBe("Rate limit exceeded");
  });

  // 5. Balance check fails
  it("returns 402 when balance check fails", async () => {
    vi.mocked(checkBalance).mockRejectedValue(new Error("Insufficient credit balance"));

    const res = await app.request("http://localhost/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${VALID_TOKEN}` },
    });

    expect(res.status).toBe(402);
    const body = await res.json();
    expect(body.error).toBe("Insufficient credit balance");
  });

  // 6. All checks pass -- downstream handler is called
  it("returns 200 and calls next() when all checks pass", async () => {
    const res = await app.request("http://localhost/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${VALID_TOKEN}` },
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
  });

  // 7. Sets resolvedApiKey on context for downstream handlers
  it("sets resolvedApiKey on Hono context for downstream handlers", async () => {
    let capturedKey: ResolvedApiKey | undefined;

    const customApp = new Hono();
    customApp.use("*", createGatewayAuthMiddleware(config));
    customApp.all("*", (c) => {
      capturedKey = c.get("resolvedApiKey");
      return c.json({ ok: true });
    });

    await customApp.request("http://localhost/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${VALID_TOKEN}` },
    });

    expect(capturedKey).toEqual(mockResolvedKey);
  });

  // 8. Sets gatewayRequestId and gatewayStartTime on context
  it("sets gatewayRequestId and gatewayStartTime on context", async () => {
    let capturedRequestId: string | undefined;
    let capturedStartTime: number | undefined;

    const customApp = new Hono();
    customApp.use("*", createGatewayAuthMiddleware(config));
    customApp.all("*", (c) => {
      capturedRequestId = c.get("gatewayRequestId");
      capturedStartTime = c.get("gatewayStartTime");
      return c.json({ ok: true });
    });

    await customApp.request("http://localhost/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${VALID_TOKEN}` },
    });

    expect(capturedRequestId).toBeDefined();
    expect(typeof capturedRequestId).toBe("string");
    expect(capturedRequestId!.length).toBeGreaterThan(0);
    expect(capturedStartTime).toBeDefined();
    expect(typeof capturedStartTime).toBe("number");
  });

  // 9. Rate-limit headers are set on successful requests
  it("sets X-RateLimit-Remaining header on successful requests", async () => {
    const res = await app.request("http://localhost/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${VALID_TOKEN}` },
    });

    expect(res.status).toBe(200);
    expect(res.headers.get("X-RateLimit-Remaining")).toBe("99");
  });

  // 10. resolveApiKey receives correct arguments
  it("passes the correct token and deps to resolveApiKey", async () => {
    await app.request("http://localhost/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${VALID_TOKEN}` },
    });

    expect(resolveApiKey).toHaveBeenCalledWith(VALID_TOKEN, {
      redis: config.redis,
      prisma: config.prisma,
    });
  });

  // 11. checkBalance receives correct arguments
  it("passes the correct orgId, redis, and getCreditBalance to checkBalance", async () => {
    await app.request("http://localhost/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${VALID_TOKEN}` },
    });

    expect(checkBalance).toHaveBeenCalledWith(
      mockResolvedKey.organizationId,
      config.redis,
      config.getCreditBalance,
    );
  });

  // 12. getRateLimiter receives the plan from resolved key
  it("calls getRateLimiter with the resolved key plan", async () => {
    await app.request("http://localhost/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${VALID_TOKEN}` },
    });

    expect(getRateLimiter).toHaveBeenCalledWith(mockResolvedKey.plan);
  });
});
