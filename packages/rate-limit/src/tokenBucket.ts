export interface TokenBucketConfig {
  maxTokens: number;
  refillRate: number; // tokens per second
  refillInterval: number; // milliseconds
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
  retryAfter?: number;
}

// Plan-based rate limits
export const PLAN_LIMITS = {
  FREE: {
    maxTokens: 100,
    refillRate: 10,
    refillInterval: 1000,
  },
  PRO: {
    maxTokens: 1000,
    refillRate: 100,
    refillInterval: 1000,
  },
  ENTERPRISE: {
    maxTokens: 10000,
    refillRate: 1000,
    refillInterval: 1000,
  },
} as const;

// API weight for different endpoints
export const API_WEIGHTS = {
  // Light operations
  "GET:/api/content/feed": 1,
  "GET:/api/content/post": 1,

  // Medium operations
  "POST:/api/content/post": 5,
  "PUT:/api/content/post": 3,

  // Heavy operations (AI)
  "POST:/api/ai/generate": 20,
  "POST:/api/ai/embed": 10,
  "POST:/api/ai/translate": 15,

  // Default
  default: 2,
} as const;

export function getApiWeight(method: string, path: string): number {
  const key = `${method}:${path}`;
  const weight = API_WEIGHTS[key as keyof typeof API_WEIGHTS];
  return weight ?? API_WEIGHTS.default;
}

// Fixed prefix for all rate-limit keys to prevent collisions with other services
const KEY_PREFIX = "sailor:rate-limit";

/**
 * Build a namespaced Redis/storage key from raw segments.
 * Usage: buildKey(orgId, userId, ip)  →  "sailor:rate-limit:org:user:ip"
 */
export function buildKey(...segments: string[]): string {
  return [KEY_PREFIX, ...segments].join(":");
}

/**
 * In-memory token bucket implementation
 * In production, use Redis for distributed rate limiting.
 * All keys should be created via `buildKey()` to ensure the
 * "sailor:rate-limit" namespace prefix is always applied.
 */
export class TokenBucket {
  private buckets: Map<string, { tokens: number; lastRefill: number }> = new Map();

  constructor(private config: TokenBucketConfig) {}

  get maxTokens(): number {
    return this.config.maxTokens;
  }

  async consume(key: string, tokens: number = 1): Promise<RateLimitResult> {
    const namespacedKey = buildKey(key);
    const now = Date.now();
    let bucket = this.buckets.get(namespacedKey);

    if (!bucket) {
      bucket = { tokens: this.config.maxTokens, lastRefill: now };
      this.buckets.set(namespacedKey, bucket);
    }

    // Refill tokens based on time elapsed
    const elapsed = now - bucket.lastRefill;
    const refillAmount = Math.floor(
      (elapsed / this.config.refillInterval) * this.config.refillRate,
    );

    if (refillAmount > 0) {
      bucket.tokens = Math.min(this.config.maxTokens, bucket.tokens + refillAmount);
      bucket.lastRefill = now;
    }

    // Check if we have enough tokens
    if (bucket.tokens >= tokens) {
      bucket.tokens -= tokens;
      return {
        allowed: true,
        remaining: bucket.tokens,
        resetAt: now + this.config.refillInterval,
      };
    }

    // Not enough tokens
    const tokensNeeded = tokens - bucket.tokens;
    const waitTime = Math.ceil(
      (tokensNeeded / this.config.refillRate) * this.config.refillInterval,
    );

    return {
      allowed: false,
      remaining: bucket.tokens,
      resetAt: now + waitTime,
      retryAfter: Math.ceil(waitTime / 1000),
    };
  }

  // Clean up old buckets periodically
  cleanup(maxAge: number = 3600000): void {
    const now = Date.now();
    for (const [key, bucket] of this.buckets) {
      if (now - bucket.lastRefill > maxAge) {
        this.buckets.delete(key);
      }
    }
  }
}

/**
 * Create a rate limiter for a specific plan
 */
export function createRateLimiter(plan: string): TokenBucket {
  let config: TokenBucketConfig;

  if (plan === "FREE") {
    config = PLAN_LIMITS.FREE;
  } else if (plan === "PRO") {
    config = PLAN_LIMITS.PRO;
  } else if (plan === "ENTERPRISE") {
    config = PLAN_LIMITS.ENTERPRISE;
  } else {
    config = PLAN_LIMITS.FREE;
  }

  return new TokenBucket(config);
}

// Global rate limiters by plan
const rateLimiters: Map<string, TokenBucket> = new Map();

export function getRateLimiter(plan: string): TokenBucket {
  if (!rateLimiters.has(plan)) {
    rateLimiters.set(plan, createRateLimiter(plan));
  }
  return rateLimiters.get(plan) as TokenBucket;
}

/**
 * Redis-backed token bucket for distributed rate limiting.
 * Uses @nebutra/cache for Upstash Redis state.
 * Falls back gracefully — if Redis is unavailable, callers should
 * use the in-memory TokenBucket instead.
 */
export class RedisTokenBucket {
  constructor(
    private config: TokenBucketConfig,
    private redis: {
      get: (key: string) => Promise<unknown>;
      set: (key: string, value: unknown, opts?: { ex?: number }) => Promise<unknown>;
    },
  ) {}

  get maxTokens(): number {
    return this.config.maxTokens;
  }

  async consume(key: string, tokens: number = 1): Promise<RateLimitResult> {
    const namespacedKey = buildKey(key);
    const now = Date.now();

    const raw = await this.redis.get(namespacedKey);
    let bucket: { tokens: number; lastRefill: number };

    if (raw && typeof raw === "object" && "tokens" in (raw as Record<string, unknown>)) {
      bucket = raw as { tokens: number; lastRefill: number };
    } else {
      bucket = { tokens: this.config.maxTokens, lastRefill: now };
    }

    // Refill tokens based on time elapsed
    const elapsed = now - bucket.lastRefill;
    const refillAmount = Math.floor(
      (elapsed / this.config.refillInterval) * this.config.refillRate,
    );

    if (refillAmount > 0) {
      bucket = {
        tokens: Math.min(this.config.maxTokens, bucket.tokens + refillAmount),
        lastRefill: now,
      };
    }

    // Check if we have enough tokens
    if (bucket.tokens >= tokens) {
      const updated = { tokens: bucket.tokens - tokens, lastRefill: bucket.lastRefill };
      await this.redis.set(namespacedKey, updated, { ex: 3600 });
      return {
        allowed: true,
        remaining: updated.tokens,
        resetAt: now + this.config.refillInterval,
      };
    }

    // Not enough tokens — persist current state and reject
    await this.redis.set(namespacedKey, bucket, { ex: 3600 });

    const tokensNeeded = tokens - bucket.tokens;
    const waitTime = Math.ceil(
      (tokensNeeded / this.config.refillRate) * this.config.refillInterval,
    );

    return {
      allowed: false,
      remaining: bucket.tokens,
      resetAt: now + waitTime,
      retryAfter: Math.ceil(waitTime / 1000),
    };
  }
}

/**
 * Create a Redis-backed rate limiter for distributed environments.
 * Requires @nebutra/cache Redis client (Upstash).
 *
 * @example
 * ```ts
 * import { getRedis } from "@nebutra/cache";
 * import { createRedisRateLimiter, PLAN_LIMITS } from "@nebutra/rate-limit";
 *
 * const limiter = createRedisRateLimiter(PLAN_LIMITS.PRO, getRedis());
 * const result = await limiter.consume(buildKey(orgId, userId));
 * ```
 */
export function createRedisRateLimiter(
  config: TokenBucketConfig,
  redis: {
    get: (key: string) => Promise<unknown>;
    set: (key: string, value: unknown, opts?: { ex?: number }) => Promise<unknown>;
  },
): RedisTokenBucket {
  return new RedisTokenBucket(config, redis);
}

// Purge stale per-tenant buckets every 30 minutes.
// Buckets idle for >1 hour are removed; this prevents unbounded memory growth
// in long-running Node processes with many unique tenant keys.
/* v8 ignore start */
if (typeof setInterval !== "undefined") {
  setInterval(
    () => {
      for (const limiter of rateLimiters.values()) {
        limiter.cleanup(3_600_000); // 1 hour idle threshold
      }
    },
    30 * 60 * 1000, // every 30 minutes
  ).unref?.(); // don't keep the Node process alive for cleanup alone
}
/* v8 ignore stop */
