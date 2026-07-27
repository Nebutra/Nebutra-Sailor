/**
 * Per-IP rate limiting for the unauthenticated Pebble intake routes.
 *
 * The shared `createEndpointRateLimit` keys on the tenant, which collapses to a
 * single "anonymous" bucket here — one abusive client would rate-limit every
 * Pebble user on earth. These routes key on the client IP instead.
 */

import type { Context, Next } from "hono";
import { resolveAiOriginClientIp } from "../ai/origin-headers.js";

const WINDOW_MS = 60_000;

/**
 * Entries are evicted lazily on read plus opportunistically on write, so a
 * burst of one-shot IPs cannot grow the map without bound in a long-lived
 * process.
 */
function createBucketStore() {
  const buckets = new Map<string, { count: number; resetAt: number }>();

  function sweep(now: number): void {
    if (buckets.size < 10_000) return;
    for (const [key, bucket] of buckets) {
      if (now > bucket.resetAt) buckets.delete(key);
    }
  }

  return { buckets, sweep };
}

export function createIpRateLimit(maxPerMinute: number) {
  const { buckets, sweep } = createBucketStore();

  return async (c: Context, next: Next) => {
    const now = Date.now();
    const key = resolveAiOriginClientIp(c.req.raw.headers) ?? "unknown";

    sweep(now);

    let bucket = buckets.get(key);
    if (!bucket || now > bucket.resetAt) {
      bucket = { count: 0, resetAt: now + WINDOW_MS };
      buckets.set(key, bucket);
    }

    bucket.count += 1;

    if (bucket.count > maxPerMinute) {
      const retryAfter = Math.ceil((bucket.resetAt - now) / 1000);
      c.header("Retry-After", String(retryAfter));
      return c.json(
        { error: "Too Many Requests", message: "Rate limit exceeded.", retryAfter },
        429,
      );
    }

    await next();
  };
}
