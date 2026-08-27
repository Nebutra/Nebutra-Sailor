const REDIS_KEY_PREFIX = "credit:balance:";
const SPEND_WINDOW_PREFIX = "credit:window:";
const CACHE_TTL_SECONDS = 30;

/**
 * Width of the spend window. Admission counts what a tenant has committed
 * inside the current window, and the key expires on its own — so there is
 * nothing to release, and a request that dies mid-flight cannot leave a
 * reservation stranded against the tenant.
 *
 * A reserve-then-release design would track in-flight cost more precisely, but
 * every exit path in the proxy would have to release, including one that only
 * finishes after the handler has returned its streaming Response. A missed
 * release there locks a tenant out until a TTL expires. This trades that
 * precision for having no leak to miss.
 */
const SPEND_WINDOW_SECONDS = 60;

interface BalanceRedis {
  get: (key: string) => Promise<string | null>;
  set: (key: string, value: string, opts?: { ex?: number }) => Promise<unknown>;
  del: (key: string) => Promise<unknown>;
  /**
   * Present only where the adapter exposes it. Without `eval` the guard falls
   * back to the read-and-compare behaviour, which cannot bound concurrency —
   * see `admitSpend`.
   */
  eval?: (script: string, keys: string[], args: Array<string | number>) => Promise<unknown>;
}

type GetCreditBalanceFn = (organizationId: string) => Promise<number>;

const ADMIT_SCRIPT = `
local committed = redis.call('INCRBYFLOAT', KEYS[1], ARGV[1])
redis.call('EXPIRE', KEYS[1], ARGV[3])
if tonumber(committed) > tonumber(ARGV[2]) then
  redis.call('INCRBYFLOAT', KEYS[1], '-' .. ARGV[1])
  return 0
end
return 1
`;

async function readBalance(
  organizationId: string,
  redis: BalanceRedis,
  getCreditBalance: GetCreditBalanceFn,
): Promise<number> {
  const cacheKey = `${REDIS_KEY_PREFIX}${organizationId}`;
  const cached = await redis.get(cacheKey);
  if (cached !== null) {
    return Number.parseFloat(cached);
  }
  const balance = await getCreditBalance(organizationId);
  await redis.set(cacheKey, String(balance), { ex: CACHE_TTL_SECONDS });
  return balance;
}

/**
 * Checks that an organization has a positive credit balance.
 *
 * Kept for callers that have no cost estimate to offer. It admits on
 * `balance > 0` and therefore cannot bound concurrent spend; prefer
 * `admitSpend`.
 */
export async function checkBalance(
  organizationId: string,
  redis: BalanceRedis,
  getCreditBalance: GetCreditBalanceFn,
): Promise<void> {
  const balance = await readBalance(organizationId, redis, getCreditBalance);
  if (balance <= 0) {
    throw new Error("Insufficient credit balance");
  }
}

/**
 * Admit a request only if the tenant's committed spend this window, plus this
 * request's worst case, still fits inside their balance.
 *
 * `INCRBYFLOAT` then compare, both inside one script, is what makes this
 * different from reading a balance and deciding in the caller. With a plain
 * read every request inside the balance cache's 30s window sees the same
 * positive number and is admitted — a hundred concurrent requests all pass on
 * the same cent. Here each one moves the shared counter before it is checked,
 * so only those that actually fit get through, and a rejected one puts its
 * share back.
 *
 * Throws when the request does not fit. Nothing to release: the window key
 * expires on its own.
 */
export async function admitSpend(
  organizationId: string,
  estimatedCost: number,
  redis: BalanceRedis,
  getCreditBalance: GetCreditBalanceFn,
): Promise<void> {
  const balance = await readBalance(organizationId, redis, getCreditBalance);
  if (balance <= 0) {
    throw new Error("Insufficient credit balance");
  }

  // No estimate, or an adapter without eval: the balance check above is all
  // there is. Weaker, and deliberately not silent about being weaker.
  if (!redis.eval || !(estimatedCost > 0)) return;

  const admitted = await redis.eval(
    ADMIT_SCRIPT,
    [`${SPEND_WINDOW_PREFIX}${organizationId}`],
    [String(estimatedCost), String(balance), SPEND_WINDOW_SECONDS],
  );

  if (Number(admitted) !== 1) {
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
