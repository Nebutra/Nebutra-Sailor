import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import { aiServiceBreaker, billingServiceBreaker } from "../../services/circuitBreaker.js";

const serviceStatusEnum = z.enum(["available", "unavailable", "unknown"]);
const checkStatusEnum = z.enum(["pass", "fail"]);

const checkSchema = z.object({
  name: z.string(),
  status: checkStatusEnum,
  latency: z.number().optional(),
  message: z.string().optional(),
});

const statusResponseSchema = z.object({
  status: z.enum(["healthy", "degraded", "unhealthy"]),
  timestamp: z.string(),
  version: z.string(),
  database: z.enum(["connected", "disconnected"]),
  redis: z.enum(["connected", "disconnected"]),
  services: z.object({
    ai: serviceStatusEnum,
    content: serviceStatusEnum,
    recsys: serviceStatusEnum,
    ecommerce: serviceStatusEnum,
    web3: serviceStatusEnum,
    billing: serviceStatusEnum,
    eventIngest: serviceStatusEnum,
  }),
  uptime: z.number(),
  checks: z.array(checkSchema),
});

type StatusResponse = z.infer<typeof statusResponseSchema>;

export const statusRoutes = new OpenAPIHono();

const startTime = Date.now();

// ============================================
// Status route
// ============================================

const statusRoute = createRoute({
  method: "get",
  path: "/status",
  tags: ["System"],
  summary: "Comprehensive system status",
  description:
    "Returns detailed status of all system components including database, Redis, and microservices. Used by OpenStatus monitoring.",
  responses: {
    200: {
      description: "System is healthy or degraded",
      content: {
        "application/json": {
          schema: statusResponseSchema,
        },
      },
    },
    503: {
      description: "System is unhealthy",
      content: {
        "application/json": {
          schema: statusResponseSchema,
        },
      },
    },
  },
});

statusRoutes.openapi(statusRoute, async (c) => {
  c.header("Cache-Control", "public, max-age=10, stale-while-revalidate=30");

  const checks: StatusResponse["checks"] = [];
  let overallStatus: StatusResponse["status"] = "healthy";

  // Check database connection
  const dbCheck = await checkDatabase();
  checks.push(dbCheck);
  if (dbCheck.status === "fail") {
    overallStatus = "unhealthy";
  }

  // Check Redis connection
  const redisCheck = await checkRedis();
  checks.push(redisCheck);
  if (redisCheck.status === "fail" && overallStatus === "healthy") {
    overallStatus = "degraded";
  }

  // Check microservices (non-blocking)
  const serviceChecks = await Promise.allSettled([
    checkService("ai", process.env.AI_SERVICE_URL),
    checkService("content", process.env.CONTENT_SERVICE_URL),
    checkService("recsys", process.env.RECSYS_SERVICE_URL),
    checkService("ecommerce", process.env.ECOMMERCE_SERVICE_URL),
    checkService("web3", process.env.WEB3_SERVICE_URL),
    checkService("billing", process.env.BILLING_SERVICE_URL),
    checkService("eventIngest", process.env.EVENT_INGEST_SERVICE_URL),
  ]);

  const serviceStatuses: StatusResponse["services"] = {
    ai: "unknown",
    content: "unknown",
    recsys: "unknown",
    ecommerce: "unknown",
    web3: "unknown",
    billing: "unknown",
    eventIngest: "unknown",
  };

  serviceChecks.forEach((result, index) => {
    const services = [
      "ai",
      "content",
      "recsys",
      "ecommerce",
      "web3",
      "billing",
      "eventIngest",
    ] as const;
    const serviceName = services[index];

    if (!serviceName) return;

    if (result.status === "fulfilled") {
      checks.push(result.value);
      serviceStatuses[serviceName] = result.value.status === "pass" ? "available" : "unavailable";
    } else {
      checks.push({
        name: serviceName,
        status: "fail",
        message: "Health check failed",
      });
      serviceStatuses[serviceName] = "unavailable";
    }
  });

  // Include circuit breaker states as observability checks
  const [aiBreakerStatus, billingBreakerStatus] = await Promise.all([
    aiServiceBreaker.getStatus(),
    billingServiceBreaker.getStatus(),
  ]);
  checks.push(
    {
      name: "circuit-breaker:ai",
      status: aiBreakerStatus.state === "OPEN" ? "fail" : "pass",
      message: `state=${aiBreakerStatus.state}${aiBreakerStatus.state !== "CLOSED" ? ` failures=${aiBreakerStatus.failures}` : ""}`,
    },
    {
      name: "circuit-breaker:billing",
      status: billingBreakerStatus.state === "OPEN" ? "fail" : "pass",
      message: `state=${billingBreakerStatus.state}${billingBreakerStatus.state !== "CLOSED" ? ` failures=${billingBreakerStatus.failures}` : ""}`,
    },
  );

  // Count failures
  const failedServices = checks.filter(
    (check) => check.status === "fail" && !["database", "redis"].includes(check.name),
  ).length;

  if (failedServices >= 3 && overallStatus === "healthy") {
    overallStatus = "degraded";
  }

  const response: StatusResponse = {
    status: overallStatus,
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || "0.1.0",
    database: dbCheck.status === "pass" ? "connected" : "disconnected",
    redis: redisCheck.status === "pass" ? "connected" : "disconnected",
    services: serviceStatuses,
    uptime: Math.floor((Date.now() - startTime) / 1000),
    checks,
  };

  const statusCode = overallStatus === "healthy" ? 200 : overallStatus === "degraded" ? 200 : 503;

  return c.json(response, statusCode as 200 | 503);
});

// ============================================
// Readiness route
// ============================================

const readyRoute = createRoute({
  method: "get",
  path: "/ready",
  tags: ["System"],
  summary: "Kubernetes readiness probe",
  description: "Returns whether the service is ready to accept traffic",
  responses: {
    200: {
      description: "Service is ready",
      content: {
        "application/json": {
          schema: z.object({
            ready: z.literal(true),
          }),
        },
      },
    },
    503: {
      description: "Service is not ready",
      content: {
        "application/json": {
          schema: z.object({
            ready: z.literal(false),
            reason: z.string(),
          }),
        },
      },
    },
  },
});

statusRoutes.openapi(readyRoute, async (c) => {
  const dbCheck = await checkDatabase();

  if (dbCheck.status === "fail") {
    return c.json({ ready: false as const, reason: "database unavailable" }, 503);
  }

  return c.json({ ready: true as const }, 200);
});

// ============================================
// Liveness route
// ============================================

const liveRoute = createRoute({
  method: "get",
  path: "/live",
  tags: ["System"],
  summary: "Kubernetes liveness probe",
  description: "Returns whether the service process is alive",
  responses: {
    200: {
      description: "Service is alive",
      content: {
        "application/json": {
          schema: z.object({
            live: z.literal(true),
          }),
        },
      },
    },
  },
});

statusRoutes.openapi(liveRoute, (c) => {
  return c.json({ live: true as const }, 200);
});

// ============================================
// Ping route
// ============================================

const pingRoute = createRoute({
  method: "get",
  path: "/ping",
  tags: ["System"],
  summary: "Simple uptime ping",
  description: "Returns 'pong' for uptime monitoring services",
  responses: {
    200: {
      description: "pong",
    },
  },
});

statusRoutes.openapi(pingRoute, (c) => {
  return c.text("pong") as never;
});

// ============================================
// Helper functions
// ============================================

async function checkDatabase(): Promise<StatusResponse["checks"][0]> {
  const start = Date.now();
  try {
    // Dynamic import to avoid issues when DB is not configured.
    // AUDIT(no-tenant): liveness check is not tenant-scoped.
    const { getSystemDb } = await import("@nebutra/db");
    await getSystemDb().$queryRaw`SELECT 1`;

    return {
      name: "database",
      status: "pass",
      latency: Date.now() - start,
    };
  } catch (error) {
    return {
      name: "database",
      status: "fail",
      latency: Date.now() - start,
      message: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

async function checkRedis(): Promise<StatusResponse["checks"][0]> {
  const start = Date.now();
  try {
    // Dynamic import to avoid issues when Redis is not configured
    const { getRedis } = await import("@nebutra/cache");
    const redis = getRedis();
    if (redis) {
      await redis.ping();
    } else {
      throw new Error("Redis client not configured");
    }

    return {
      name: "redis",
      status: "pass",
      latency: Date.now() - start,
    };
  } catch (error) {
    return {
      name: "redis",
      status: "fail",
      latency: Date.now() - start,
      message: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

async function checkService(name: string, url?: string): Promise<StatusResponse["checks"][0]> {
  const start = Date.now();

  if (!url) {
    return {
      name,
      status: "fail",
      message: "Service URL not configured",
    };
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(`${url}/health`, {
      signal: controller.signal,
    });

    clearTimeout(timeout);

    return {
      name,
      status: response.ok ? "pass" : "fail",
      latency: Date.now() - start,
    };
  } catch (error) {
    return {
      name,
      status: "fail",
      latency: Date.now() - start,
      message: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
