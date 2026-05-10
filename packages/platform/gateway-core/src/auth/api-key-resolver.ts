import { createHash } from "node:crypto";
import type { ResolvedApiKey } from "../types.js";

const API_KEY_PREFIX = "sk-sailor-";
const REDIS_KEY_PREFIX = "apikey:";
const CACHE_TTL_SECONDS = 300; // 5 minutes

interface ApiKeyDeps {
  redis: {
    get: (key: string) => Promise<string | null>;
    set: (key: string, value: string, opts?: { ex?: number }) => Promise<unknown>;
    del: (key: string) => Promise<unknown>;
  };
  prisma: {
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
  };
}

function hashApiKey(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/**
 * Resolves and validates an `sk-sailor-*` Bearer token.
 *
 * 1. Validates prefix
 * 2. SHA-256 hashes the full token
 * 3. Checks Redis cache (`apikey:<hash>`)
 * 4. Falls back to Prisma DB lookup on cache miss
 * 5. Rejects revoked / expired keys
 * 6. Caches the resolved key in Redis (5 min TTL)
 * 7. Fire-and-forget updates `lastUsedAt`
 */
export async function resolveApiKey(token: string, deps: ApiKeyDeps): Promise<ResolvedApiKey> {
  // 1. Validate prefix
  if (!token.startsWith(API_KEY_PREFIX)) {
    throw new Error("Invalid API key format");
  }

  // 2. Hash the full token
  const keyHash = hashApiKey(token);
  const cacheKey = `${REDIS_KEY_PREFIX}${keyHash}`;

  // 3. Check Redis cache
  const cached = await deps.redis.get(cacheKey);
  if (cached) {
    return JSON.parse(cached) as ResolvedApiKey;
  }

  // 4. Prisma DB fallback
  const dbKey = await deps.prisma.aPIKey.findUnique({
    where: { keyHash },
    include: { organization: { select: { plan: true } } },
  });

  // 7. Not found
  if (!dbKey) {
    throw new Error("Invalid API key");
  }

  // 5. Check revoked
  if (dbKey.revokedAt) {
    throw new Error("API key has been revoked");
  }

  // 6. Check expired
  if (dbKey.expiresAt && dbKey.expiresAt.getTime() < Date.now()) {
    throw new Error("API key has expired");
  }

  // 8. Build ResolvedApiKey
  const resolved: ResolvedApiKey = {
    id: dbKey.id,
    organizationId: dbKey.organizationId,
    userId: dbKey.createdById,
    scopes: dbKey.scopes,
    rateLimitRps: dbKey.rateLimitRps,
    plan: dbKey.organization.plan,
  };

  // 9. Cache in Redis with 5 min TTL
  await deps.redis.set(cacheKey, JSON.stringify(resolved), {
    ex: CACHE_TTL_SECONDS,
  });

  // 10. Fire-and-forget lastUsedAt update
  void deps.prisma.aPIKey.update({
    where: { id: dbKey.id },
    data: { lastUsedAt: new Date() },
  });

  return resolved;
}
