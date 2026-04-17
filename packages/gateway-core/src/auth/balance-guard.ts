const REDIS_KEY_PREFIX = "credit:balance:";
const CACHE_TTL_SECONDS = 30;

interface BalanceRedis {
  get: (key: string) => Promise<string | null>;
  set: (key: string, value: string, opts?: { ex?: number }) => Promise<unknown>;
  del: (key: string) => Promise<unknown>;
}

type GetCreditBalanceFn = (organizationId: string) => Promise<number>;

/**
 * Checks that an organization has a positive credit balance.
 *
 * 1. Checks Redis cache `credit:balance:<orgId>`
 * 2. On miss, calls `getCreditBalance` and caches for 30s
 * 3. Throws if balance <= 0
 */
export async function checkBalance(
  organizationId: string,
  redis: BalanceRedis,
  getCreditBalance: GetCreditBalanceFn,
): Promise<void> {
  const cacheKey = `${REDIS_KEY_PREFIX}${organizationId}`;

  // 1. Check Redis cache
  const cached = await redis.get(cacheKey);

  let balance: number;

  if (cached !== null) {
    balance = parseFloat(cached);
  } else {
    // 2. Fetch from billing service
    balance = await getCreditBalance(organizationId);

    // 3. Cache the balance
    await redis.set(cacheKey, String(balance), { ex: CACHE_TTL_SECONDS });
  }

  // 4. Reject if insufficient
  if (balance <= 0) {
    throw new Error("Insufficient credit balance");
  }
}

/**
 * Invalidates the cached credit balance for an organization.
 * Call this after a top-up or billing event.
 */
export async function invalidateBalanceCache(
  organizationId: string,
  redis: BalanceRedis,
): Promise<void> {
  await redis.del(`${REDIS_KEY_PREFIX}${organizationId}`);
}
