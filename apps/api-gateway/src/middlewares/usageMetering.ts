/**
 * Usage metering middleware
 *
 * Records API call counts per tenant in Redis (Upstash-compatible).
 * Keys are scoped to the current billing period (month):
 *
 *   usage:{orgId}:{YYYY-MM}:api_calls  → INCR each request
 *   usage:{orgId}:{YYYY-MM}:ai_tokens  → INCRBY from response header (added by AI service)
 *
 * The metering runs fire-and-forget (non-blocking) so it never adds latency
 * to the critical path. Failures are logged but do not fail the request.
 *
 * Usage data is read by:
 *   - GET /api/v1/billing/usage  → real-time quota check
 *   - Inngest quota-enforcement job  → sends warning emails at 80% / 100%
 *   - ClickHouse ETL pipeline  → long-term usage analytics
 */

import { getRedis, type Redis } from "@nebutra/cache";
import { logger } from "@nebutra/logger";
import type { Context, Next } from "hono";

// Cached Redis reference — `undefined` means not yet resolved,
// `null` means credentials are missing (local dev no-op).
let cachedRedis: Redis | null | undefined;

/**
 * Attempt to get Redis client, returning null if not configured.
 * Wraps @nebutra/cache's getRedis() which throws on missing credentials.
 * Result is cached so the singleton is resolved at most once.
 */
function getRedisOptional(): Redis | null {
  if (cachedRedis !== undefined) return cachedRedis;

  try {
    cachedRedis = getRedis();
  } catch {
    cachedRedis = null;
  }
  return cachedRedis;
}

// ── Billing period key ─────────────────────────────────────────────────────

function billingPeriod(): string {
  const now = new Date();
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
}

// Expire keys 35 days after they are written (covers month + grace period)
const TTL_SECONDS = 35 * 24 * 60 * 60;

// ── Middleware ─────────────────────────────────────────────────────────────

/**
 * Paths that are exempt from metering (health checks, webhooks, OpenAPI spec).
 */
const EXEMPT_PREFIXES = [
  "/api/misc",
  "/api/system",
  "/misc",
  "/system",
  "/api/webhooks",
  "/api/inngest",
  "/openapi.json",
  "/docs",
];

function isExempt(path: string): boolean {
  return EXEMPT_PREFIXES.some((prefix) => path.startsWith(prefix));
}

export async function usageMeteringMiddleware(c: Context, next: Next) {
  const path = new URL(c.req.url).pathname;

  if (isExempt(path)) {
    return next();
  }

  // Run the actual request first
  await next();

  // Non-blocking background metering — never block the response
  const tenant = c.get("tenant");
  const orgId = tenant?.organizationId;

  if (!orgId) return; // anonymous calls are not metered

  const period = billingPeriod();
  const apiCallKey = `usage:${orgId}:${period}:api_calls`;

  // Best-effort: fire and forget
  void (async () => {
    try {
      const r = getRedisOptional();
      if (!r) return;

      await r.incr(apiCallKey);
      // Refresh TTL every call (cheap, idempotent)
      await r.expire(apiCallKey, TTL_SECONDS);

      // If the AI service returned a token count header, meter it too
      const tokensUsed = c.res.headers.get("X-Tokens-Used");
      if (tokensUsed) {
        const tokenKey = `usage:${orgId}:${period}:ai_tokens`;
        const count = parseInt(tokensUsed, 10);
        if (!Number.isNaN(count) && count > 0) {
          await r.incrby(tokenKey, count);
          await r.expire(tokenKey, TTL_SECONDS);
        }
      }
    } catch (err) {
      // Never let metering failures propagate to the client
      logger.warn("Usage metering write failed", { orgId, period, err });
    }
  })();
}

// ── Usage query helper (used by billing routes) ────────────────────────────

export interface UsageSnapshot {
  orgId: string;
  period: string;
  apiCalls: number;
  aiTokens: number;
}

export async function getUsageSnapshot(orgId: string, period?: string): Promise<UsageSnapshot> {
  const p = period ?? billingPeriod();

  try {
    const r = getRedisOptional();
    if (!r) {
      return { orgId, period: p, apiCalls: 0, aiTokens: 0 };
    }

    const [callsRaw, tokensRaw] = await Promise.all([
      r.get(`usage:${orgId}:${p}:api_calls`),
      r.get(`usage:${orgId}:${p}:ai_tokens`),
    ]);

    return {
      orgId,
      period: p,
      apiCalls: callsRaw ? Number(callsRaw) : 0,
      aiTokens: tokensRaw ? Number(tokensRaw) : 0,
    };
  } catch (err) {
    logger.warn("Usage snapshot read failed", { orgId, err });
    return { orgId, period: p, apiCalls: 0, aiTokens: 0 };
  }
}
