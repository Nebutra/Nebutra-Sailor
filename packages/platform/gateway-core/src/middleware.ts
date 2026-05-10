import { getRateLimiter } from "@nebutra/rate-limit";
import type { MiddlewareHandler } from "hono";
import { resolveApiKey } from "./auth/api-key-resolver.js";
import { checkBalance } from "./auth/balance-guard.js";
import type { ResolvedApiKey } from "./types.js";

// ---------------------------------------------------------------------------
// Config — dependency-injected, no global singletons
// ---------------------------------------------------------------------------

interface BalanceRedis {
  get: (key: string) => Promise<string | null>;
  set: (key: string, value: string, opts?: { ex?: number }) => Promise<unknown>;
  del: (key: string) => Promise<unknown>;
}

interface ApiKeyPrisma {
  aPIKey: {
    findUnique: (args: {
      where: { keyHash: string };
      include?: { organization?: { select?: { plan?: boolean } } };
    }) => Promise<{
      id: string;
      organizationId: string;
      createdById: string | null;
      scopes: string[];
      rateLimitRps: number;
      revokedAt: Date | null;
      expiresAt: Date | null;
      organization: { plan: string };
    } | null>;
    update: (args: { where: { id: string }; data: { lastUsedAt: Date } }) => Promise<unknown>;
  };
}

export interface GatewayMiddlewareConfig {
  redis: BalanceRedis;
  prisma: ApiKeyPrisma;
  getCreditBalance: (organizationId: string) => Promise<number>;
}

// ---------------------------------------------------------------------------
// Context variables set by the middleware for downstream handlers
// ---------------------------------------------------------------------------

export interface GatewayContextVars {
  resolvedApiKey: ResolvedApiKey;
  gatewayStartTime: number;
  gatewayRequestId: string;
}

// ---------------------------------------------------------------------------
// Middleware factory
// ---------------------------------------------------------------------------

/**
 * Creates a Hono middleware that composes:
 *  1. API key authentication (Bearer sk-sailor-*)
 *  2. Plan-based rate limiting
 *  3. Credit balance pre-check
 *
 * All dependencies are injected via `config` — no global singletons.
 *
 * On success the middleware sets `resolvedApiKey`, `gatewayRequestId`,
 * and `gatewayStartTime` on the Hono context for downstream handlers.
 */
export function createGatewayAuthMiddleware(
  config: GatewayMiddlewareConfig,
): MiddlewareHandler<{ Variables: GatewayContextVars }> {
  return async (c, next) => {
    // --- Request metadata ---------------------------------------------------
    const requestId = crypto.randomUUID();
    c.set("gatewayRequestId", requestId);
    c.set("gatewayStartTime", Date.now());

    // --- 1. Extract & validate API key --------------------------------------
    const authHeader = c.req.header("authorization");
    if (!authHeader?.startsWith("Bearer sk-sailor-")) {
      return c.json({ error: "Missing or invalid API key" }, 401);
    }

    const token = authHeader.slice(7); // Strip "Bearer "

    let resolvedKey: ResolvedApiKey;
    try {
      resolvedKey = await resolveApiKey(token, {
        redis: config.redis,
        prisma: config.prisma,
      });
    } catch (err) {
      return c.json({ error: err instanceof Error ? err.message : "Unauthorized" }, 401);
    }

    c.set("resolvedApiKey", resolvedKey);

    // --- 2. Rate limit per API key ------------------------------------------
    const rateLimiter = getRateLimiter(resolvedKey.plan);
    const rateResult = await rateLimiter.consume(`gateway:${resolvedKey.id}`, 1);

    if (!rateResult.allowed) {
      c.header("Retry-After", String(rateResult.retryAfter));
      c.header("X-RateLimit-Remaining", "0");
      c.header("X-RateLimit-Reset", String(rateResult.resetAt));
      return c.json({ error: "Rate limit exceeded" }, 429);
    }

    c.header("X-RateLimit-Remaining", String(rateResult.remaining));

    // --- 3. Balance pre-check -----------------------------------------------
    try {
      await checkBalance(resolvedKey.organizationId, config.redis, config.getCreditBalance);
    } catch (err) {
      return c.json(
        {
          error: err instanceof Error ? err.message : "Insufficient credits",
        },
        402,
      );
    }

    await next();
  };
}
