import { Redis } from "@upstash/redis";
import { getRedisConfig } from "./env";

let redisInstance: Redis | null = null;

/**
 * Get or create Redis client singleton
 */
export function getRedis(): Redis {
  if (!redisInstance) {
    const config = getRedisConfig();
    redisInstance = new Redis(config);
  }
  return redisInstance;
}

/**
 * Redis client instance (lazy initialized).
 *
 * Importing @nebutra/cache must be safe during build-time route analysis, where
 * Redis credentials are intentionally absent. Method access still delegates to
 * getRedis(), so runtime callers get the same explicit configuration error.
 */
export const redis = new Proxy({} as Redis, {
  get(_target, prop) {
    const client = getRedis();
    const value = Reflect.get(client, prop, client);
    return typeof value === "function" ? value.bind(client) : value;
  },
});

export { Redis };
