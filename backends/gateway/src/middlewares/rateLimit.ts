import { getRedis } from "@nebutra/cache";
import {
  createRedisRateLimiter,
  getApiWeight,
  getRateLimiter,
  PLAN_LIMITS,
} from "@nebutra/rate-limit";
import type { Context, Next } from "hono";

type PlanKey = keyof typeof PLAN_LIMITS;
type RateLimiter = ReturnType<typeof getRateLimiter> | ReturnType<typeof createRedisRateLimiter>;

function resolvePlanKey(plan: unknown): PlanKey {
  if (plan === "PRO" || plan === "ENTERPRISE") return plan;
  return "FREE";
}

/**
 * Rate limiting middleware using token bucket algorithm
 * Keys are composed of: tenant:organization:user:ip
 */
export async function rateLimitMiddleware(c: Context, next: Next) {
  const tenant = c.get("tenant");
  const method = c.req.method;
  const path = new URL(c.req.url).pathname;

  // Build rate limit key
  const keyParts = [
    tenant?.organizationId || "anonymous",
    tenant?.userId || "anonymous",
    tenant?.ip || "unknown",
  ];
  const key = keyParts.join(":");

  // Get API weight for this endpoint
  const weight = getApiWeight(method, path);

  // Get rate limiter for tenant's plan
  const planKey = resolvePlanKey(tenant?.plan);
  let limiter: RateLimiter;
  try {
    if (!process.env.UPSTASH_REDIS_URL || !process.env.UPSTASH_REDIS_TOKEN) {
      throw new Error("Redis rate limit store is not configured");
    }

    const redisClient = getRedis();
    const redisAdapter = {
      get: (key: string) => redisClient.get(key),
      set: (key: string, value: unknown, opts?: { ex?: number }) =>
        opts?.ex ? redisClient.set(key, value, { ex: opts.ex }) : redisClient.set(key, value),
    };
    limiter = createRedisRateLimiter(PLAN_LIMITS[planKey], redisAdapter);
  } catch {
    limiter = getRateLimiter(planKey);
  }

  // Try to consume tokens
  const result = await limiter.consume(key, weight);

  // Add standard rate limit headers (draft-ietf-httpapi-ratelimit-headers)
  c.header("X-RateLimit-Limit", limiter.maxTokens.toString());
  c.header("X-RateLimit-Remaining", result.remaining.toString());
  c.header("X-RateLimit-Reset", result.resetAt.toString());

  if (!result.allowed) {
    c.header("Retry-After", (result.retryAfter || 1).toString());
    return c.json(
      {
        error: "Too Many Requests",
        message: "Rate limit exceeded. Please try again later.",
        retryAfter: result.retryAfter,
      },
      429,
    );
  }

  await next();
}

/**
 * Lightweight rate limit for specific heavy endpoints
 */
export function createEndpointRateLimit(maxPerMinute: number) {
  const requests = new Map<string, { count: number; resetAt: number }>();

  return async (c: Context, next: Next) => {
    const tenant = c.get("tenant");
    const key = tenant?.userId || tenant?.ip || "anonymous";
    const now = Date.now();

    let record = requests.get(key);

    if (!record || now > record.resetAt) {
      record = { count: 0, resetAt: now + 60000 };
      requests.set(key, record);
    }

    record.count++;

    if (record.count > maxPerMinute) {
      const retryAfter = Math.ceil((record.resetAt - now) / 1000);
      c.header("Retry-After", retryAfter.toString());
      return c.json(
        {
          error: "Too Many Requests",
          message: `Maximum ${maxPerMinute} requests per minute exceeded.`,
          retryAfter,
        },
        429,
      );
    }

    await next();
  };
}
