import { getRedis } from "@nebutra/cache";
import { logger } from "@nebutra/logger";
import {
  createRedisRateLimiter,
  getApiWeight,
  getRateLimiter,
  PLAN_LIMITS,
  type RateLimitResult,
} from "@nebutra/rate-limit";
import type { Context, Next } from "hono";

type PlanKey = keyof typeof PLAN_LIMITS;
type RateLimiter = ReturnType<typeof getRateLimiter> | ReturnType<typeof createRedisRateLimiter>;

// Log the store failure once per process, not once per request: a broken
// Redis turns every request into a warning otherwise.
let warnedStoreFailure = false;

function hasRedisRateLimitStore() {
  const url = process.env.UPSTASH_REDIS_REST_URL ?? process.env.UPSTASH_REDIS_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.UPSTASH_REDIS_TOKEN;
  return Boolean(url && token);
}

function resolvePlanKey(plan: unknown): PlanKey {
  if (plan === "PRO" || plan === "ENTERPRISE") return plan;
  return "FREE";
}

/**
 * Rate limiting middleware using token bucket algorithm
 * Keys are composed of: tenant:user:ip
 */
export async function rateLimitMiddleware(c: Context, next: Next) {
  const tenant = c.get("tenant");
  const method = c.req.method;
  const path = new URL(c.req.url).pathname;

  // Build rate limit key
  const keyParts = [
    tenant?.tenantId || "anonymous",
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
    if (!hasRedisRateLimitStore()) {
      throw new Error("Redis rate limit store is not configured");
    }

    const redisClient = await getRedis();
    const redisAdapter = {
      get: (key: string) => redisClient.get(key),
      set: (key: string, value: unknown, opts?: { ex?: number }) =>
        opts?.ex ? redisClient.set(key, value, { ex: opts.ex }) : redisClient.set(key, value),
      // One atomic EVAL per request instead of GET+SET. Halves the billed
      // commands on Upstash and closes the read-modify-write race.
      eval: (script: string, keys: string[], args: Array<string | number>) =>
        redisClient.eval(script, keys, args),
    };
    limiter = createRedisRateLimiter(PLAN_LIMITS[planKey], redisAdapter);
  } catch {
    limiter = getRateLimiter(planKey);
  }

  // Try to consume tokens. A store that is reachable at construction but fails
  // on the call — bad credentials, a malformed URL, an outage — must degrade to
  // the per-pod bucket, not fail the request. On 2026-09-02 the Fly origin's
  // Redis config was broken and every rate-limited route answered 500 while
  // health, which skips this middleware, kept reporting 200.
  let result: RateLimitResult;
  try {
    result = await limiter.consume(key, weight);
  } catch (err) {
    if (!warnedStoreFailure) {
      warnedStoreFailure = true;
      logger.warn("Rate limit store failed; falling back to the in-memory bucket", { err });
    }
    limiter = getRateLimiter(planKey);
    result = await limiter.consume(key, weight);
  }

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
