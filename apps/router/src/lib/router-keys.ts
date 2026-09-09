import "server-only";

import { getSystemDb } from "@nebutra/db";
import { ApiKeyRepository, hashApiKeyPlaintext } from "@nebutra/repositories";
import type { EdgeIdentity, KeyResolver } from "./openai-edge";

/**
 * The Router has one credential: a product-issued key in the shared `APIKey`
 * table, which the /v1 edge swaps for the upstream token. `ROUTER_KEY_STORE`
 * and the New-API pass-through mode are gone (D4) — there is nothing to branch
 * on and no in-memory store to fall back to.
 */

interface CacheEntry {
  identity: EdgeIdentity | null;
  expiresAt: number;
}

const POSITIVE_TTL_MS = 60_000;
const NEGATIVE_TTL_MS = 5_000;
const CACHE_CAP = 2_000;

/**
 * Build a resolver over the shared APIKey table with a small in-process cache.
 * Revocation in this process is immediate (see {@link invalidateKeyCache});
 * across instances it lags by at most POSITIVE_TTL_MS.
 */
export function createProductKeyResolver(
  repo: Pick<ApiKeyRepository, "findActiveByHash" | "touchLastUsed">,
  now: () => number = Date.now,
): KeyResolver & { invalidate: (keyHash?: string) => void } {
  const cache = new Map<string, CacheEntry>();

  const resolver = (async (plaintext: string) => {
    const keyHash = hashApiKeyPlaintext(plaintext);
    const hit = cache.get(keyHash);
    if (hit && hit.expiresAt > now()) return hit.identity;

    const active = await repo.findActiveByHash(keyHash);
    const identity: EdgeIdentity | null = active
      ? { keyId: active.id, tenantId: active.tenantId, userId: active.createdById }
      : null;

    if (cache.size >= CACHE_CAP) {
      const oldest = cache.keys().next().value;
      if (oldest) cache.delete(oldest);
    }
    cache.set(keyHash, {
      identity,
      expiresAt: now() + (identity ? POSITIVE_TTL_MS : NEGATIVE_TTL_MS),
    });
    if (identity) void repo.touchLastUsed(identity.keyId);
    return identity;
  }) as KeyResolver & { invalidate: (keyHash?: string) => void };

  resolver.invalidate = (keyHash?: string) => {
    if (keyHash) cache.delete(keyHash);
    else cache.clear();
  };
  return resolver;
}

const g = globalThis as unknown as {
  __routerKeyResolver?: ReturnType<typeof createProductKeyResolver>;
};

/** Process-wide resolver over the shared APIKey table. */
export function getKeyResolver(): KeyResolver {
  if (!g.__routerKeyResolver) {
    g.__routerKeyResolver = createProductKeyResolver(new ApiKeyRepository(getSystemDb()));
  }
  return g.__routerKeyResolver;
}

export function invalidateKeyCache(keyHash?: string): void {
  g.__routerKeyResolver?.invalidate(keyHash);
}

export function getApiKeyRepository(): ApiKeyRepository {
  return new ApiKeyRepository(getSystemDb());
}

/**
 * The APIKey row is scoped by Tenant.id, not by organization or user id.
 * Map the session to its tenant: organization tenant first, else the
 * individual tenant provisioned for the user.
 */
export async function resolveSessionTenantId(session: {
  organizationId?: string;
  userId: string;
}): Promise<string | null> {
  const db = getSystemDb();
  if (session.organizationId) {
    const org = await db.tenant.findUnique({
      where: { organizationId: session.organizationId },
      select: { id: true },
    });
    if (org) return org.id;
  }
  const personal = await db.tenant.findUnique({
    where: { userId: session.userId },
    select: { id: true },
  });
  return personal?.id ?? null;
}
