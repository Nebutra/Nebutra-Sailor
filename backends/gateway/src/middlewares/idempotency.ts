/**
 * Idempotency middleware for safe mutation replay.
 *
 * Clients supply an `Idempotency-Key` header (UUID v4).  On first receipt the
 * response is computed, stored in Redis for 24 h, and returned.  On replay the
 * cached response is served immediately — no side effects re-executed.
 *
 * Spec alignment: https://datatracker.ietf.org/doc/draft-ietf-httpapi-idempotency-key-header/
 *
 * Key design decisions:
 *  - Only active on POST/PUT/PATCH (GET/HEAD/DELETE are inherently idempotent)
 *  - Cache key scoped to: tenant + idempotency-key — prevents cross-tenant replay
 *  - Lock set atomically (SET NX) before processing to prevent concurrent duplicates
 *  - 24 h TTL per Stripe convention (industry standard for payment idempotency)
 */

import { getRedis } from "@nebutra/cache";
import { logger } from "@nebutra/logger";
import type { Context, Next } from "hono";

// Mutating methods that benefit from idempotency
const IDEMPOTENT_METHODS = new Set(["POST", "PUT", "PATCH"]);

// Paths that are explicitly exempt (webhooks must never be cached)
const EXEMPT_PREFIX = ["/api/webhooks", "/api/health", "/api/system"];

const TTL_SECONDS = 86_400; // 24 hours
const LOCK_TTL_SECONDS = 30; // max processing time before lock expires

interface CachedResponse {
  status: number;
  body: unknown;
  headers: Record<string, string>;
}

function getCacheKey(tenantId: string, idempotencyKey: string): string {
  return `idempotency:${tenantId}:${idempotencyKey}`;
}

function getLockKey(tenantId: string, idempotencyKey: string): string {
  return `idempotency:lock:${tenantId}:${idempotencyKey}`;
}

/**
 * Idempotency middleware — attach to any route group handling mutations.
 *
 * Usage:
 *   app.use("/api/v1/*", idempotencyMiddleware);
 */
export async function idempotencyMiddleware(c: Context, next: Next): Promise<Response> {
  const method = c.req.method.toUpperCase();

  // Only intercept mutating methods
  if (!IDEMPOTENT_METHODS.has(method)) {
    await next();
    return c.res;
  }

  // Skip exempt paths
  const path = new URL(c.req.url).pathname;
  if (EXEMPT_PREFIX.some((p) => path.startsWith(p))) {
    await next();
    return c.res;
  }

  const idempotencyKey = c.req.header("Idempotency-Key");

  // No key supplied — continue without idempotency protection
  if (!idempotencyKey) {
    await next();
    return c.res;
  }

  // Validate key format (must be UUID v4)
  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (!UUID_RE.test(idempotencyKey)) {
    return c.json(
      {
        error: "Invalid Idempotency-Key",
        message: "Idempotency-Key must be a valid UUID v4 (xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx).",
      },
      400,
    );
  }

  const tenant = c.get("tenant");
  const tenantId = tenant?.organizationId ?? tenant?.userId ?? "anonymous";
  const redis = getRedis();

  const cacheKey = getCacheKey(tenantId, idempotencyKey);
  const lockKey = getLockKey(tenantId, idempotencyKey);

  // ── Check for existing response ──────────────────────────────────────────
  const cached = await redis.get<CachedResponse>(cacheKey);
  if (cached) {
    logger.debug("Idempotency cache hit", { idempotencyKey, tenantId });

    const response = c.json(cached.body, cached.status as Parameters<typeof c.json>[1]);
    // Restore original headers and mark as replayed
    for (const [k, v] of Object.entries(cached.headers)) {
      response.headers.set(k, v);
    }
    response.headers.set("Idempotency-Replayed", "true");
    return response;
  }

  // ── Acquire processing lock (SET NX) ────────────────────────────────────
  const acquired = await redis.set(lockKey, "1", {
    nx: true,
    ex: LOCK_TTL_SECONDS,
  });

  if (!acquired) {
    // Another request with the same key is still in flight
    return c.json(
      {
        error: "Conflict",
        message:
          "A request with this Idempotency-Key is already being processed. Retry after a moment.",
      },
      409,
    );
  }

  try {
    // ── Process the request ────────────────────────────────────────────────
    await next();

    const res = c.res;
    const status = res.status;

    // Only cache successful (2xx) and client error (4xx) responses.
    // Never cache 5xx — the operation may have partially succeeded.
    if (status < 500) {
      let body: unknown;
      try {
        const clone = res.clone();
        body = await clone.json();
      } catch {
        body = null;
      }

      // Capture safe response headers for replay
      const replayHeaders: Record<string, string> = {};
      for (const key of ["Content-Type", "X-Request-Id"]) {
        const val = res.headers.get(key);
        if (val) replayHeaders[key] = val;
      }

      const payload: CachedResponse = { status, body, headers: replayHeaders };
      await redis.set(cacheKey, payload, { ex: TTL_SECONDS });

      logger.debug("Idempotency response cached", {
        idempotencyKey,
        tenantId,
        status,
      });
    }
  } finally {
    // Always release the lock
    await redis.del(lockKey);
  }

  return c.res;
}
