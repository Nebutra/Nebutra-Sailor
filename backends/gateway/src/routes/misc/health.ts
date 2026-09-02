import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import pTimeout from "p-timeout";

export const healthRoutes = new OpenAPIHono();

// ============================================
// Response schemas
// ============================================

const dependencyStatusSchema = z.object({
  status: z.enum(["up", "down"]),
  latencyMs: z.number(),
});

const healthResponseSchema = z.object({
  status: z.enum(["healthy", "degraded", "unhealthy"]),
  version: z.string(),
  uptime: z.number(),
  timestamp: z.string(),
  dependencies: z.object({
    database: dependencyStatusSchema,
    cache: dependencyStatusSchema,
  }),
});

// ============================================
// Route definition
// ============================================

const healthRoute = createRoute({
  method: "get",
  path: "/health",
  tags: ["System"],
  summary: "Health check",
  description:
    "Returns health status of the API gateway and its dependencies. Returns 200 for healthy/degraded, 503 for unhealthy.",
  responses: {
    200: {
      description: "Service is healthy or degraded",
      content: {
        "application/json": {
          schema: healthResponseSchema,
        },
      },
    },
    503: {
      description: "Service is unhealthy — all dependencies are down",
      content: {
        "application/json": {
          schema: healthResponseSchema,
        },
      },
    },
  },
});

// ============================================
// Helpers: dependency checks with 3s timeout
// ============================================

async function withTimeout(
  fn: () => Promise<unknown>,
  ms = 3000,
): Promise<{ status: "up" | "down"; latencyMs: number }> {
  const start = Date.now();
  try {
    await pTimeout(fn(), {
      milliseconds: ms,
      message: new Error(`Dependency check timed out after ${ms}ms`),
    });
    return { status: "up", latencyMs: Date.now() - start };
  } catch {
    return { status: "down", latencyMs: Date.now() - start };
  }
}

function checkDatabase() {
  return withTimeout(async () => {
    // AUDIT(no-tenant): liveness check is not tenant-scoped.
    const { getSystemDb } = await import("@nebutra/db");
    await getSystemDb().$queryRaw`SELECT 1`;
  });
}

function checkCache() {
  // Upstash Redis REST ping — getRedis() throws if credentials are missing,
  // which correctly marks cache as "down" → pod shows "degraded", not "unhealthy".
  return withTimeout(async () => {
    const { getRedis } = await import("@nebutra/cache");
    const r = await getRedis();
    await r.ping();
  });
}

// ============================================
// Handler
// ============================================

healthRoutes.openapi(healthRoute, async (c) => {
  c.header("Cache-Control", "no-cache, no-store");

  // Run dependency checks in parallel to minimize latency
  const [database, cache] = await Promise.all([checkDatabase(), checkCache()]);

  // Aggregate: all deps down → unhealthy (503); any dep down → degraded (200); else healthy (200).
  const depStatuses = [database.status, cache.status];
  const downCount = depStatuses.filter((s) => s === "down").length;

  const overallStatus: "healthy" | "degraded" | "unhealthy" =
    downCount === depStatuses.length ? "unhealthy" : downCount > 0 ? "degraded" : "healthy";

  const body = {
    status: overallStatus,
    version: process.env.npm_package_version ?? "1.0.0",
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    dependencies: {
      database,
      cache,
    },
  };

  const statusCode = overallStatus === "unhealthy" ? 503 : 200;

  return c.json(body, statusCode as 200 | 503);
});

// ============================================
// Readiness: GET /ready
// ============================================
//
// /health is the liveness probe Fly hits every 15s (infra/fly/gateway.toml).
// It has to stay 200 while a dependency is merely degraded, or Fly restarts a
// machine that a restart cannot fix. That also means it cannot tell the truth
// about the request path: on 2026-09-02 the Redis config behind the rate
// limiter was broken for two days, every rate-limited route answered 500, and
// /health reported 200 "degraded" the whole time.
//
// /ready is the honest one. It exercises the same dependencies a real request
// does — an EVAL through the same @nebutra/cache client the rate limiter uses,
// and a SELECT 1 through the system Prisma client — and answers 503 the moment
// either fails. Point synthetic monitors and the public status page here;
// leave Fly on /health.

const READY_DEPENDENCIES = ["database", "redis"] as const;

const readyChecksSchema = z.object({
  database: dependencyStatusSchema,
  redis: dependencyStatusSchema,
});

const readyRoute = createRoute({
  method: "get",
  path: "/ready",
  tags: ["System"],
  summary: "Readiness probe",
  description:
    "Exercises the real request-path dependencies — Redis through the rate-limit client and PostgreSQL — and returns 503 naming the failing ones when any is down. Not a liveness probe: do not point machine restarts at it.",
  responses: {
    200: {
      description: "Every request-path dependency answered",
      content: {
        "application/json": {
          schema: z.object({
            ready: z.literal(true),
            checks: readyChecksSchema,
          }),
        },
      },
    },
    503: {
      description: "At least one request-path dependency is down",
      content: {
        "application/json": {
          schema: z.object({
            ready: z.literal(false),
            failing: z.array(z.enum(READY_DEPENDENCIES)),
            checks: readyChecksSchema,
          }),
        },
      },
    },
  },
});

function checkRedisRequestPath() {
  // The rate limiter's store call is an EVAL through getRedis() — see
  // middlewares/rateLimit.ts. A PING can succeed against a proxy or a
  // misconfigured URL that EVAL then fails on, so probe with the same client
  // and the same command family: this fails exactly when the limiter's store
  // does.
  return withTimeout(async () => {
    const { getRedis } = await import("@nebutra/cache");
    const redis = await getRedis();
    const result = await redis.eval("return 1", [], []);
    if (Number(result) !== 1) {
      throw new Error(`Redis EVAL probe returned ${JSON.stringify(result)}`);
    }
  });
}

healthRoutes.openapi(readyRoute, async (c) => {
  c.header("Cache-Control", "no-cache, no-store");

  const [database, redis] = await Promise.all([checkDatabase(), checkRedisRequestPath()]);
  const checks = { database, redis };
  const failing = READY_DEPENDENCIES.filter((name) => checks[name].status === "down");

  if (failing.length > 0) {
    return c.json({ ready: false as const, failing, checks }, 503);
  }

  return c.json({ ready: true as const, checks }, 200);
});
