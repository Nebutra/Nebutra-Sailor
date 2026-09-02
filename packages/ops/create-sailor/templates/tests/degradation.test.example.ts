/**
 * Gateway degradation suite — template.
 *
 * A dependency outage is a code path like any other, and it needs a test that
 * states the intended behaviour: which routes keep answering, what the health
 * endpoint reports, and which failures are logged rather than surfaced. This
 * file is the shape Nebutra-Sailor uses for that in
 * `backends/gateway/src/__tests__/degradation.test.ts`.
 *
 * To activate it in a scaffold:
 *
 *   1. Move it to `backends/gateway/src/__tests__/degradation.test.ts` — drop
 *      the `.example` so the gateway's vitest `include` picks it up.
 *   2. Point the imports in `buildGateway()` at your middleware chain and
 *      health routes, mounted in the same order and on the same path scopes as
 *      your `index.ts`. Do not import `index.ts` itself if its module body
 *      boots telemetry or route groups; compose the pieces instead.
 *   3. Point the `vi.mock()` specifiers at whatever your gateway imports for
 *      cache, database and logging. The doubles below match the
 *      `@nebutra/cache` client surface (get/set/del/eval/ping/incr/incrby/expire).
 *   4. Replace `s2sHeaders` with however your tenant middleware resolves a
 *      tenant in tests, so rate-limit and metering keys are real, not
 *      "anonymous".
 *
 * Scenarios, one `describe` each:
 *
 *   (a) Redis constructs but every command fails (malformed URL, bad token,
 *       outage): rate-limited routes answer from the in-memory bucket and
 *       carry rate-limit headers; health is 200 degraded with cache down.
 *   (b) Redis credentials missing entirely: same outcome as (a).
 *   (c) Redis healthy: remaining tokens decrease across requests and the
 *       limiter issues exactly one EVAL per request.
 *   (d) Database down: health is 200 degraded with database down; routes that
 *       do not touch the database keep answering; with Redis also down health
 *       is 503 unhealthy while those routes still answer.
 *
 * When you add a readiness route, it belongs here next to the health route.
 */

import { Hono } from "hono";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { s2sHeaders, TEST_SERVICE_SECRET } from "./helpers/s2s-token.js";

// ---------------------------------------------------------------------------
// Module mocks. Hoisted handles survive `vi.resetModules()`, which re-runs the
// factories below; each re-run hands back the same vi.fn instances.
// ---------------------------------------------------------------------------

const { getRedis, queryRaw, logger } = vi.hoisted(() => ({
  getRedis: vi.fn<() => Promise<unknown>>(),
  queryRaw: vi.fn<() => Promise<unknown>>(),
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

vi.mock("@nebutra/cache", () => ({
  getRedis: () => getRedis(),
}));

vi.mock("@nebutra/db", () => ({
  getSystemDb: () => ({ $queryRaw: queryRaw }),
  prisma: { $queryRaw: queryRaw },
}));

vi.mock("@nebutra/logger", () => ({ logger }));

// tenantContext imports the auth provider factory statically. It is only
// invoked for Bearer tokens, which this suite never sends; mocking it keeps
// the provider SDKs out of the module graph.
vi.mock("@nebutra/auth/server", () => ({
  createAuth: vi.fn(),
}));

// ---------------------------------------------------------------------------
// Redis doubles
// ---------------------------------------------------------------------------

type RedisDouble = {
  get: ReturnType<typeof vi.fn>;
  set: ReturnType<typeof vi.fn>;
  del: ReturnType<typeof vi.fn>;
  eval: ReturnType<typeof vi.fn>;
  ping: ReturnType<typeof vi.fn>;
  incr: ReturnType<typeof vi.fn>;
  incrby: ReturnType<typeof vi.fn>;
  expire: ReturnType<typeof vi.fn>;
};

/**
 * A client that constructs but fails every command. This is what a malformed
 * URL, a bad token or an outage looks like from the caller: `getRedis()`
 * resolves, the first command rejects.
 */
function brokenRedis(): RedisDouble {
  const rejecting = () => vi.fn(async () => Promise.reject(new TypeError("Invalid URL")));
  return {
    get: rejecting(),
    set: rejecting(),
    del: rejecting(),
    eval: rejecting(),
    ping: rejecting(),
    incr: rejecting(),
    incrby: rejecting(),
    expire: rejecting(),
  };
}

/**
 * A working client with just enough state to answer the chain: the token
 * bucket EVAL decrements by the request cost and reports what is left, the
 * counters increment, everything else is a key-value map. No refill — the
 * assertions want determinism, not a second bucket implementation.
 */
function healthyRedis(): RedisDouble {
  const buckets = new Map<string, number>();
  const kv = new Map<string, unknown>();
  return {
    eval: vi.fn(async (_script: string, keys: string[], args: Array<string | number>) => {
      const key = keys[0] ?? "";
      // ARGV: now (ms), maxTokens, refillRate, refillInterval (ms), cost, ttl (s)
      const now = Number(args[0]);
      const maxTokens = Number(args[1]);
      const cost = Number(args[4]);
      const tokens = (buckets.get(key) ?? maxTokens) - cost;
      buckets.set(key, Math.max(tokens, 0));
      return [tokens >= 0 ? 1 : 0, Math.max(tokens, 0), now];
    }),
    get: vi.fn(async (key: string) => kv.get(key) ?? null),
    set: vi.fn(async (key: string, value: unknown) => {
      kv.set(key, value);
      return "OK";
    }),
    del: vi.fn(async (key: string) => (kv.delete(key) ? 1 : 0)),
    incr: vi.fn(async (key: string) => {
      const next = Number(kv.get(key) ?? 0) + 1;
      kv.set(key, next);
      return next;
    }),
    incrby: vi.fn(async (key: string, by: number) => {
      const next = Number(kv.get(key) ?? 0) + by;
      kv.set(key, next);
      return next;
    }),
    expire: vi.fn(async () => 1),
    ping: vi.fn(async () => "PONG"),
  };
}

// ---------------------------------------------------------------------------
// App under test — adapt the imports and mounts to your gateway.
// ---------------------------------------------------------------------------

async function buildGateway() {
  vi.resetModules();

  const [
    { tenantContextMiddleware },
    { usageMeteringMiddleware },
    { idempotencyMiddleware },
    { rateLimitMiddleware },
    { shouldSkipGlobalRateLimit },
    { healthRoutes },
  ] = await Promise.all([
    import("../middlewares/tenantContext.js"),
    import("../middlewares/usageMetering.js"),
    import("../middlewares/idempotency.js"),
    import("../middlewares/rateLimit.js"),
    import("../middlewares/rateLimitSkip.js"),
    import("../routes/misc/health.js"),
  ]);

  const handled = vi.fn();
  const app = new Hono();

  // Same mounts, same order, same path scopes as index.ts.
  app.use("*", tenantContextMiddleware);
  app.use("/api/v1/*", usageMeteringMiddleware);
  app.use("/api/v1/*", idempotencyMiddleware);
  app.use("/api/*", async (c, next) => {
    const path = new URL(c.req.url).pathname;
    if (shouldSkipGlobalRateLimit(path)) return next();
    return rateLimitMiddleware(c, next);
  });

  app.route("/api/misc", healthRoutes);
  app.get("/api/v1/things", (c) => {
    handled();
    return c.json({ items: [] });
  });
  app.post("/api/v1/things", (c) => {
    handled();
    return c.json({ id: "thing_1" }, 201);
  });

  return { app, handled };
}

type Gateway = Awaited<ReturnType<typeof buildGateway>>;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const REDIS_ENV = [
  "UPSTASH_REDIS_REST_URL",
  "UPSTASH_REDIS_REST_TOKEN",
  "UPSTASH_REDIS_URL",
  "UPSTASH_REDIS_TOKEN",
] as const;

function redisConfigured(present: boolean) {
  for (const name of REDIS_ENV) vi.stubEnv(name, undefined);
  if (present) {
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "https://x.upstash.io");
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "t");
  }
}

/** A resolved tenant, so rate-limit and metering keys are real, not "anonymous". */
function tenantHeaders() {
  return s2sHeaders({
    userId: "user_degradation",
    orgId: "org_degradation",
    role: "org:member",
    plan: "FREE",
  });
}

async function getThings(app: Gateway["app"]) {
  return app.request("/api/v1/things", { method: "GET", headers: await tenantHeaders() });
}

async function getHealth(app: Gateway["app"]) {
  return app.request("/api/misc/health", { method: "GET" });
}

/** Metering writes behind `void (async () => …)()`; let the microtasks drain. */
const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

const FREE_LIMIT = "100";

beforeEach(() => {
  vi.stubEnv("SERVICE_SECRET", TEST_SERVICE_SECRET);
  queryRaw.mockResolvedValue([{ "?column?": 1 }]);
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.clearAllMocks();
});

// ===========================================================================
// (a) Redis constructs but every command fails
// ===========================================================================

describe("Redis constructs but every command fails (TypeError: Invalid URL)", () => {
  let redis: RedisDouble;
  let gateway: Gateway;

  beforeEach(async () => {
    redisConfigured(true);
    redis = brokenRedis();
    getRedis.mockResolvedValue(redis);
    gateway = await buildGateway();
  });

  it("GET /api/v1/things answers from the route, rate-limited by the in-memory bucket", async () => {
    const res = await getThings(gateway.app);

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ items: [] });
    expect(gateway.handled).toHaveBeenCalledOnce();

    // The store was tried and failed — this is the fallback, not a skip.
    expect(redis.eval).toHaveBeenCalled();
    expect(res.headers.get("x-ratelimit-limit")).toBe(FREE_LIMIT);
    const remaining = Number(res.headers.get("x-ratelimit-remaining"));
    expect(remaining).toBeGreaterThanOrEqual(0);
    expect(remaining).toBeLessThan(Number(FREE_LIMIT));
    expect(res.headers.get("x-ratelimit-reset")).toMatch(/^\d+$/);
  });

  it("keeps serving after repeated failures — the fallback is per request, not per process", async () => {
    const first = await getThings(gateway.app);
    const second = await getThings(gateway.app);

    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    expect(gateway.handled).toHaveBeenCalledTimes(2);
    expect(Number(second.headers.get("x-ratelimit-remaining"))).toBeLessThan(
      Number(first.headers.get("x-ratelimit-remaining")),
    );
  });

  it("logs the metering write failure instead of surfacing it", async () => {
    const res = await getThings(gateway.app);
    await flush();

    expect(res.status).toBe(200);
    expect(redis.incr).toHaveBeenCalledOnce();
    expect(logger.warn).toHaveBeenCalledWith(
      "Usage metering write failed",
      expect.objectContaining({ tenantId: "org_degradation" }),
    );
  });

  it("GET /api/misc/health reports cache down and stays 200 degraded", async () => {
    const res = await getHealth(gateway.app);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.status).toBe("degraded");
    expect(body.dependencies.cache.status).toBe("down");
    expect(body.dependencies.database.status).toBe("up");
  });

  it.todo(
    "POST /api/v1/things with an Idempotency-Key needs a decided behaviour while Redis is down — an idempotency store with no fallback surfaces the outage as a 500; fail-closed (503 + Retry-After) or fail-open is a product call, pin it here once made",
  );
});

// ===========================================================================
// (b) Redis credentials are missing entirely
// ===========================================================================

describe("Redis credentials are missing entirely", () => {
  let gateway: Gateway;

  beforeEach(async () => {
    redisConfigured(false);
    // What @nebutra/cache's getRedisConfig() throws when no URL/token is set.
    getRedis.mockRejectedValue(new Error("Redis credentials not configured"));
    gateway = await buildGateway();
  });

  it("GET /api/v1/things answers from the route, rate-limited by the in-memory bucket", async () => {
    const res = await getThings(gateway.app);

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ items: [] });
    expect(gateway.handled).toHaveBeenCalledOnce();
    expect(res.headers.get("x-ratelimit-limit")).toBe(FREE_LIMIT);
    expect(Number(res.headers.get("x-ratelimit-remaining"))).toBeLessThan(Number(FREE_LIMIT));
  });

  it("does not surface the metering no-op as an error", async () => {
    const res = await getThings(gateway.app);
    await flush();

    expect(res.status).toBe(200);
    // usageMetering resolves the client once and treats "not configured" as
    // a local-dev no-op: nothing to warn about.
    expect(logger.warn).not.toHaveBeenCalledWith("Usage metering write failed", expect.anything());
  });

  it("GET /api/misc/health reports cache down and stays 200 degraded", async () => {
    const res = await getHealth(gateway.app);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.status).toBe("degraded");
    expect(body.dependencies.cache.status).toBe("down");
    expect(body.dependencies.database.status).toBe("up");
  });
});

// ===========================================================================
// (c) Redis is healthy
// ===========================================================================

describe("Redis is healthy", () => {
  let redis: RedisDouble;
  let gateway: Gateway;

  beforeEach(async () => {
    redisConfigured(true);
    redis = healthyRedis();
    getRedis.mockResolvedValue(redis);
    gateway = await buildGateway();
  });

  it("x-ratelimit-remaining decreases across two requests, one EVAL per request", async () => {
    const first = await getThings(gateway.app);
    expect(first.status).toBe(200);
    expect(redis.eval).toHaveBeenCalledTimes(1);

    const second = await getThings(gateway.app);
    expect(second.status).toBe(200);
    expect(redis.eval).toHaveBeenCalledTimes(2);

    // Default API weight is 2 tokens; FREE starts at 100.
    expect(first.headers.get("x-ratelimit-limit")).toBe(FREE_LIMIT);
    expect(first.headers.get("x-ratelimit-remaining")).toBe("98");
    expect(second.headers.get("x-ratelimit-remaining")).toBe("96");

    // The atomic script is the only rate-limit command: no GET+SET fallback ran.
    expect(redis.get).not.toHaveBeenCalled();
    expect(redis.set).not.toHaveBeenCalled();
    expect(gateway.handled).toHaveBeenCalledTimes(2);
  });

  it("meters each request once under the tenant's billing-period key", async () => {
    await getThings(gateway.app);
    await getThings(gateway.app);
    await flush();

    expect(redis.incr).toHaveBeenCalledTimes(2);
    expect(redis.incr.mock.calls[0]?.[0]).toMatch(/^usage:org_degradation:\d{4}-\d{2}:api_calls$/);
    expect(logger.warn).not.toHaveBeenCalledWith("Usage metering write failed", expect.anything());
  });

  it("GET /api/misc/health is 200 healthy with both dependencies up", async () => {
    const res = await getHealth(gateway.app);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.status).toBe("healthy");
    expect(body.dependencies.database.status).toBe("up");
    expect(body.dependencies.cache.status).toBe("up");
    expect(redis.ping).toHaveBeenCalledOnce();
  });
});

// ===========================================================================
// (d) The database is down
// ===========================================================================

describe("The database is down", () => {
  let gateway: Gateway;

  beforeEach(async () => {
    redisConfigured(true);
    getRedis.mockResolvedValue(healthyRedis());
    queryRaw.mockRejectedValue(new Error("connection refused"));
    gateway = await buildGateway();
  });

  it("GET /api/misc/health reports database down and stays 200 degraded", async () => {
    const res = await getHealth(gateway.app);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.status).toBe("degraded");
    expect(body.dependencies.database.status).toBe("down");
    expect(body.dependencies.cache.status).toBe("up");
  });

  it("routes that do not touch the database keep answering", async () => {
    const res = await getThings(gateway.app);

    expect(res.status).toBe(200);
    expect(gateway.handled).toHaveBeenCalledOnce();
  });

  it("with Redis also down, health is 503 unhealthy while the route still answers", async () => {
    getRedis.mockResolvedValue(brokenRedis());
    gateway = await buildGateway();

    const health = await getHealth(gateway.app);
    const body = await health.json();
    expect(health.status).toBe(503);
    expect(body.status).toBe("unhealthy");
    expect(body.dependencies.database.status).toBe("down");
    expect(body.dependencies.cache.status).toBe("down");

    const things = await getThings(gateway.app);
    expect(things.status).toBe(200);
    expect(things.headers.get("x-ratelimit-limit")).toBe(FREE_LIMIT);
  });
});
