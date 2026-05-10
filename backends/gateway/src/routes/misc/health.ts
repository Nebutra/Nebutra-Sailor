import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";

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
    await Promise.race([
      fn(),
      new Promise<never>((_, r) => setTimeout(() => r(new Error("timeout")), ms)),
    ]);
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
    await getRedis().ping();
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
