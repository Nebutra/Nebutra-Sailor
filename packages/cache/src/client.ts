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

export { Redis };
