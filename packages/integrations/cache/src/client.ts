import { IoredisCacheClient } from "./ioredis";
import type { CacheBackend, CacheClient } from "./types";
import { UpstashRedisCacheClient } from "./upstash";

let cacheInstance: CacheClient | null = null;
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
 * Get the active cache client. Lazy-initialised on first call so importing
 * @nebutra/cache during build-time route analysis (no env) doesn't crash.
 */
export function getCacheClient(): CacheClient {
  if (cacheInstance) return cacheInstance;

  const backend = detectBackend();
  if (backend === "ioredis") {
    cacheInstance = new IoredisCacheClient();
  } else {
    cacheInstance = new UpstashRedisCacheClient();
  }
  backendDetected = backend;
  return cacheInstance;
}

/** Report which backend the singleton resolved to (or null pre-init). */
export function getCacheBackend(): CacheBackend | null {
  return backendDetected;
}

/**
 * Back-compat alias for the previous `getRedis()` API.
 *
 * Old call sites:
 *
 *   const redis = getRedis();
 *   await redis.get("key");
 *   await redis.set("key", val, { ex: 60 });
 *
 * Still work because CacheClient exposes get / set / del with the same
 * signatures the Upstash client used. Strategies that imported `Redis` for
 * its type now see CacheClient.
 */
export function getRedis(): CacheClient {
  return getCacheClient();
}

/**
 * Redis client proxy — lazy-initialised, safe to import at module top level.
 *
 * Typed as CacheClient (not the raw @upstash/redis Redis) so consumers stay
 * inside the audited method surface (get/set/del). Code that needs protocol-
 * level commands should construct an IoredisCacheClient and call
 * `unsafeUnderlying()` explicitly.
 */
export const redis = new Proxy({} as CacheClient, {
  get(_target, prop) {
    const client = getCacheClient();
    const value = Reflect.get(client, prop, client);
    return typeof value === "function" ? value.bind(client) : value;
  },
});

// Keep the `Redis` type re-export for callers that imported it from this
// module pre-multi-backend. Now an alias for CacheClient (see types.ts).
export type { Redis } from "./types";
