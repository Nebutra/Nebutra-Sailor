import type { CacheBackend, CacheClient } from "./types";

let cacheInstance: CacheClient | null = null;
let resolving: Promise<CacheClient> | null = null;
let backendDetected: CacheBackend | null = null;

/**
 * Detect cache backend from environment.
 *
 *   UPSTASH_REDIS_REST_URL (or UPSTASH_REDIS_URL alias) → "upstash-redis"
 *   REDIS_URL                                           → "ioredis"
 *
 * Upstash takes precedence when both are set — its REST API works in edge
 * runtimes that can't open TCP sockets, so it's the safer default.
 *
 * Explicit override: CACHE_BACKEND=upstash-redis | ioredis
 */
function detectBackend(): CacheBackend {
  const explicit = process.env.CACHE_BACKEND?.trim() as CacheBackend | undefined;
  if (explicit === "upstash-redis" || explicit === "ioredis") return explicit;

  if (process.env.UPSTASH_REDIS_REST_URL || process.env.UPSTASH_REDIS_URL) {
    return "upstash-redis";
  }
  if (process.env.REDIS_URL) return "ioredis";

  // Fall back to upstash — callers will get a clear "not configured" error
  // from getRedisConfig() if neither env is set.
  return "upstash-redis";
}

/**
 * Get the active cache client. Lazy-initialised on first call.
 *
 * Backend modules (`./ioredis`, `./upstash`) are loaded via dynamic
 * `import()` so they remain server-only — webpack/Next.js will NOT bundle
 * `ioredis`'s Node-only deps (`net`, `tls`, etc.) into client bundles
 * that transitively reach this file through the @nebutra/cache barrel.
 *
 * Originally `getCacheClient()` was synchronous and imported both
 * backends at the top of this file. That pulled `ioredis` into any
 * `"use client"` component reachable from a chain like
 * `@nebutra/auth/client → features.ts → @nebutra/feature-flags → @nebutra/cache`
 * and broke Next.js builds with `Module not found: Can't resolve 'net'`.
 */
export async function getCacheClient(): Promise<CacheClient> {
  if (cacheInstance) return cacheInstance;
  if (resolving) return resolving;

  resolving = (async () => {
    const backend = detectBackend();
    if (backend === "ioredis") {
      const { IoredisCacheClient } = await import("./ioredis");
      cacheInstance = new IoredisCacheClient();
    } else {
      const { UpstashRedisCacheClient } = await import("./upstash");
      cacheInstance = new UpstashRedisCacheClient();
    }
    backendDetected = backend;
    return cacheInstance;
  })();

  return resolving;
}

/** Report which backend the singleton resolved to (or null pre-init). */
export function getCacheBackend(): CacheBackend | null {
  return backendDetected;
}

/**
 * Back-compat alias for the previous `getRedis()` API.
 *
 * NOTE — now async. Old call sites:
 *
 *   const redis = getRedis();
 *   await redis.get("key");
 *
 * Update to:
 *
 *   const redis = await getRedis();
 *   await redis.get("key");
 *
 * Or use the `redis` Proxy below for transparent lazy-init.
 */
export async function getRedis(): Promise<CacheClient> {
  return getCacheClient();
}

/**
 * Redis client proxy — lazy-initialised, safe to import at module top level.
 *
 * Every method call awaits the backend resolution on first use, then calls
 * through. Callers write `await redis.get(key)` exactly as before — the
 * Promise the Proxy returns transparently chains backend init + method call.
 */
export const redis = new Proxy({} as CacheClient, {
  get(_target, prop: string | symbol) {
    return async (...args: unknown[]) => {
      const client = await getCacheClient();
      const fn = (client as unknown as Record<string | symbol, unknown>)[prop];
      if (typeof fn !== "function") {
        throw new Error(`Cache client has no method '${String(prop)}'`);
      }
      return (fn as (...a: unknown[]) => unknown).apply(client, args);
    };
  },
});

// Keep the `Redis` type re-export for callers that imported it from this
// module pre-multi-backend. Now an alias for CacheClient (see types.ts).
export type { Redis } from "./types";
