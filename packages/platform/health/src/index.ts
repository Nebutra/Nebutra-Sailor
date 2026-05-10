/**
 * Health Check Utilities for Nebutra Services
 *
 * Provides standardized health checks for:
 * - Database connectivity
 * - Redis connectivity
 * - External service availability
 */

export interface HealthCheckResult {
  status: "healthy" | "degraded" | "unhealthy";
  timestamp: string;
  version?: string;
  checks: {
    [key: string]: {
      status: "pass" | "fail" | "warn";
      latency_ms?: number;
      message?: string;
    };
  };
}

export interface HealthChecker {
  name: string;
  check: () => Promise<{
    status: "pass" | "fail" | "warn";
    latency_ms: number;
    message?: string;
  }>;
}

// ============================================
// Health Check Registry
// ============================================

const checkers: HealthChecker[] = [];

export function registerHealthCheck(checker: HealthChecker): void {
  checkers.push(checker);
}

// ============================================
// Built-in Health Checks
// ============================================

/**
 * Database health check using Prisma
 */
export function createDatabaseCheck(prisma: {
  $queryRaw: (query: TemplateStringsArray, ...values: unknown[]) => Promise<unknown>;
}): HealthChecker {
  return {
    name: "database",
    check: async () => {
      const start = Date.now();
      try {
        await prisma.$queryRaw`SELECT 1`;
        return {
          status: "pass",
          latency_ms: Date.now() - start,
        };
      } catch (error) {
        return {
          status: "fail",
          latency_ms: Date.now() - start,
          message: error instanceof Error ? error.message : "Database connection failed",
        };
      }
    },
  };
}

/**
 * Redis health check using Upstash
 */
export function createRedisCheck(redis: { ping: () => Promise<string> }): HealthChecker {
  return {
    name: "redis",
    check: async () => {
      const start = Date.now();
      try {
        const pong = await redis.ping();
        const result: {
          status: "pass" | "fail" | "warn";
          latency_ms: number;
          message?: string;
        } = {
          status: pong === "PONG" ? "pass" : "warn",
          latency_ms: Date.now() - start,
        };
        if (pong !== "PONG") {
          result.message = `Unexpected response: ${pong}`;
        }
        return result;
      } catch (error) {
        return {
          status: "fail",
          latency_ms: Date.now() - start,
          message: error instanceof Error ? error.message : "Redis connection failed",
        };
      }
    },
  };
}

/**
 * HTTP endpoint health check
 */
export function createHttpCheck(
  name: string,
  url: string,
  options: { timeout?: number; expectedStatus?: number } = {},
): HealthChecker {
  const { timeout = 5000, expectedStatus = 200 } = options;

  return {
    name,
    check: async () => {
      const start = Date.now();
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      try {
        const response = await fetch(url, {
          method: "GET",
          signal: controller.signal,
        });

        clearTimeout(timeoutId);
        const latency = Date.now() - start;

        if (response.status === expectedStatus) {
          return { status: "pass", latency_ms: latency };
        }

        return {
          status: "warn",
          latency_ms: latency,
          message: `Expected status ${expectedStatus}, got ${response.status}`,
        };
      } catch (error) {
        clearTimeout(timeoutId);
        return {
          status: "fail",
          latency_ms: Date.now() - start,
          message: error instanceof Error ? error.message : "HTTP check failed",
        };
      }
    },
  };
}

/**
 * Memory usage check
 */
export function createMemoryCheck(thresholdMB: number = 512): HealthChecker {
  return {
    name: "memory",
    check: async () => {
      const start = Date.now();
      const usage = process.memoryUsage();
      const heapUsedMB = Math.round(usage.heapUsed / 1024 / 1024);

      if (heapUsedMB < thresholdMB * 0.8) {
        return {
          status: "pass",
          latency_ms: Date.now() - start,
          message: `${heapUsedMB}MB used`,
        };
      }

      if (heapUsedMB < thresholdMB) {
        return {
          status: "warn",
          latency_ms: Date.now() - start,
          message: `${heapUsedMB}MB used (approaching threshold)`,
        };
      }

      return {
        status: "fail",
        latency_ms: Date.now() - start,
        message: `${heapUsedMB}MB used (exceeds ${thresholdMB}MB threshold)`,
      };
    },
  };
}

// ============================================
// Main Health Check Runner
// ============================================

export async function runHealthChecks(
  additionalCheckers: HealthChecker[] = [],
): Promise<HealthCheckResult> {
  const allCheckers = [...checkers, ...additionalCheckers];
  const results: HealthCheckResult["checks"] = {};

  await Promise.all(
    allCheckers.map(async (checker) => {
      try {
        results[checker.name] = await checker.check();
      } catch (error) {
        results[checker.name] = {
          status: "fail",
          message: error instanceof Error ? error.message : "Check threw exception",
        };
      }
    }),
  );

  // Determine overall status
  const statuses = Object.values(results).map((r) => r.status);
  let overallStatus: HealthCheckResult["status"] = "healthy";

  if (statuses.some((s) => s === "fail")) {
    overallStatus = "unhealthy";
  } else if (statuses.some((s) => s === "warn")) {
    overallStatus = "degraded";
  }

  const result: HealthCheckResult = {
    status: overallStatus,
    timestamp: new Date().toISOString(),
    checks: results,
  };

  const version = process.env.npm_package_version;
  if (version) {
    result.version = version;
  }

  return result;
}

// ============================================
// Hono/Express Middleware
// ============================================

interface HonoLike {
  json: (data: unknown, status?: number) => unknown;
}

/**
 * Health check endpoint handler for Hono
 */
export function healthEndpoint(checkers: HealthChecker[] = []) {
  return async (c: HonoLike) => {
    const result = await runHealthChecks(checkers);
    const statusCode = result.status === "healthy" ? 200 : result.status === "degraded" ? 200 : 503;

    return c.json(result, statusCode);
  };
}

/**
 * Liveness probe (simple ping)
 */
export function livenessEndpoint() {
  return (c: HonoLike) => {
    return c.json({ status: "ok", timestamp: new Date().toISOString() });
  };
}

/**
 * Readiness probe (with dependency checks)
 */
export function readinessEndpoint(checkers: HealthChecker[] = []) {
  return async (c: HonoLike) => {
    const result = await runHealthChecks(checkers);
    const statusCode = result.status === "unhealthy" ? 503 : 200;

    return c.json(
      {
        ready: result.status !== "unhealthy",
        checks: result.checks,
      },
      statusCode,
    );
  };
}
