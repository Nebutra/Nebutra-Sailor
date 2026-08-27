/**
 * Sliding-window / fixed-window rate limiter — wraps `@upstash/ratelimit`.
 *
 * Why this exists (when we already have `tokenBucket.ts`):
 *   - Sliding-window gives smoother fairness than token-bucket for spiky
 *     traffic (e.g. AI inference bursts) — the same wheel modern SaaS use
 *     for OpenAI / Anthropic / GPT-aware rate limits.
 *   - `@upstash/ratelimit` is the SV-standard wheel: Vercel, Resend, Linear,
 *     and most edge-deployed 2026 SaaS converge on it. Battle-tested,
 *     supports multi-region replication and `analytics`.
 *   - We get fixed-window and token-bucket modes from the same package, so
 *     callers can pick the right algorithm per use case without writing
 *     more glue.
 *
 * Backend: `@upstash/redis` (HTTP, works in edge runtimes) when Upstash env
 * is configured, falls back to a process-local in-memory store for local
 * dev so tests don't need a live Redis.
 */

import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { buildKey, type RateLimitResult } from "./tokenBucket";

export type SlidingWindowAlgorithm =
  | { kind: "slidingWindow"; tokens: number; window: `${number} ${"s" | "m" | "h" | "d"}` }
  | { kind: "fixedWindow"; tokens: number; window: `${number} ${"s" | "m" | "h" | "d"}` }
  | {
      kind: "tokenBucket";
      tokens: number;
      window: `${number} ${"s" | "m" | "h" | "d"}`;
      refillRate: number;
    };

export interface SlidingWindowOptions {
  /** Algorithm + window config. */
  algorithm: SlidingWindowAlgorithm;
  /** Optional namespace appended after `sailor:rate-limit:`. */
  prefix?: string;
  /**
   * Enable `@upstash/ratelimit`'s built-in analytics (writes to Upstash
   * dashboard). Defaults to off — opt in per-instance for hot paths.
   */
  analytics?: boolean;
  /**
   * Optional ephemeral cache size for hot-key short-circuiting (the
   * package's recommended pattern). Defaults to 10,000 entries.
   */
  ephemeralCacheSize?: number;
}

function buildLimiter(redis: Redis, opts: SlidingWindowOptions): Ratelimit {
  const { algorithm } = opts;
  const prefix = buildKey("sw", opts.prefix ?? "default");

  switch (algorithm.kind) {
    case "slidingWindow":
      return new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(algorithm.tokens, algorithm.window),
        prefix,
        analytics: opts.analytics ?? false,
        ephemeralCache: new Map(),
      });
    case "fixedWindow":
      return new Ratelimit({
        redis,
        limiter: Ratelimit.fixedWindow(algorithm.tokens, algorithm.window),
        prefix,
        analytics: opts.analytics ?? false,
        ephemeralCache: new Map(),
      });
    case "tokenBucket":
      return new Ratelimit({
        redis,
        limiter: Ratelimit.tokenBucket(algorithm.refillRate, algorithm.window, algorithm.tokens),
        prefix,
        analytics: opts.analytics ?? false,
        ephemeralCache: new Map(),
      });
  }
}

/**
 * Resolve an `@upstash/redis` client from env. Returns `null` when Upstash
 * is not configured — caller can degrade to allow-all or to the
 * `TokenBucket` in-memory fallback in `./tokenBucket.ts`.
 */
function getUpstashRedis(): Redis | null {
  const url = process.env.UPSTASH_REDIS_REST_URL ?? process.env.UPSTASH_REDIS_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.UPSTASH_REDIS_TOKEN;
  if (!url || !token) return null;
  return new Redis({ url, token });
}

/**
 * Production-ready sliding-window rate limiter.
 *
 * Returns a `RateLimitResult`-shaped wrapper so the call site can stay
 * agnostic of which algorithm runs underneath.
 *
 * @example
 * const limiter = createSlidingWindowLimiter({
 *   algorithm: { kind: "slidingWindow", tokens: 60, window: "1 m" },
 *   prefix: "api:chat",
 * });
 * const r = await limiter.check(`user:${userId}`);
 * if (!r.allowed) return res.status(429).header("Retry-After", String(r.retryAfter));
 */
export interface SlidingWindowLimiter {
  check(identifier: string): Promise<RateLimitResult>;
  /** Reset a single key (e.g. after a manual override). */
  reset(identifier: string): Promise<void>;
}

export function createSlidingWindowLimiter(opts: SlidingWindowOptions): SlidingWindowLimiter {
  const redis = getUpstashRedis();
  if (!redis) {
    // Fail-open in dev (no Upstash env) — callers that need a real limit
    // should pair this with TokenBucket from ./tokenBucket.ts for memory
    // fallback. We log once so the missing env isn't silent in production.
    let warned = false;
    return {
      async check(): Promise<RateLimitResult> {
        if (!warned && process.env.NODE_ENV === "production") {
          // biome-ignore lint/suspicious/noConsole: one-time prod warn
          console.warn(
            "@nebutra/rate-limit: UPSTASH_REDIS_REST_URL / _TOKEN unset — sliding-window limiter is in fail-open mode.",
          );
          warned = true;
        }
        return { allowed: true, remaining: Number.POSITIVE_INFINITY, resetAt: Date.now() };
      },
      async reset() {
        // no-op
      },
    };
  }

  const limiter = buildLimiter(redis, opts);

  return {
    async check(identifier: string): Promise<RateLimitResult> {
      const result = await limiter.limit(identifier);
      const baseResult: RateLimitResult = {
        allowed: result.success,
        remaining: result.remaining,
        resetAt: result.reset,
      };
      if (!result.success) {
        const retryAfter = Math.max(0, Math.ceil((result.reset - Date.now()) / 1000));
        return { ...baseResult, retryAfter };
      }
      return baseResult;
    },
    async reset(identifier: string): Promise<void> {
      await limiter.resetUsedTokens(identifier);
    },
  };
}
