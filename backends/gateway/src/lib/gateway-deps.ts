/**
 * Central dependency factory for the AI Gateway.
 *
 * Resolves Redis, Prisma, Queue, and credit helpers once at app startup
 * so both the route middleware and the completion worker can share the
 * same instances.
 */
import { getCreditBalance } from "@nebutra/billing";
import { getRedis } from "@nebutra/cache";
import { getSystemDb, type PrismaClient } from "@nebutra/db";
import { getQueue } from "@nebutra/queue";

/**
 * Simple Redis adapter matching the shape expected by `@nebutra/gateway-core`.
 * Translates the Upstash Redis API to the minimal interface used for auth
 * caching, pricing cache, and balance cache.
 */
export interface GatewayRedisAdapter {
  get: (key: string) => Promise<string | null>;
  set: (key: string, value: string, opts?: { ex?: number }) => Promise<unknown>;
  del: (key: string) => Promise<unknown>;
}

export interface GatewayDeps {
  redis: GatewayRedisAdapter;
  /**
   * System-scope Prisma client used by the AI gateway worker. The worker
   * processes completions for arbitrary tenants pulled off the queue, so
   * tenant context is derived from the job payload — not from a request.
   */
  prisma: PrismaClient;
  queue: Awaited<ReturnType<typeof getQueue>>;
  getCreditBalance: (orgId: string) => Promise<number>;
}

/**
 * Build all gateway dependencies. Intended to be called once at app startup.
 *
 * Throws only on unrecoverable configuration errors — the caller should
 * wrap this in a try/catch so a missing queue / Redis does not block boot.
 */
export async function buildGatewayDeps(): Promise<GatewayDeps> {
  const redis = getRedis();

  const redisAdapter: GatewayRedisAdapter = {
    get: async (key) => {
      const value = await redis.get(key);
      if (value === null || value === undefined) return null;
      return typeof value === "string" ? value : String(value);
    },
    set: async (key, value, opts) => {
      if (opts?.ex) {
        return redis.set(key, value, { ex: opts.ex });
      }
      return redis.set(key, value);
    },
    del: async (key) => redis.del(key),
  };

  const queue = await getQueue();

  return {
    redis: redisAdapter,
    // AUDIT(no-tenant): the AI gateway worker dequeues completion jobs for
    // arbitrary tenants; it scopes every DB write by the orgId carried in the
    // job payload, not by an ambient request context.
    prisma: getSystemDb(),
    queue,
    getCreditBalance: async (orgId: string) => {
      const result = await getCreditBalance(orgId);
      return Number(result.balance);
    },
  };
}
