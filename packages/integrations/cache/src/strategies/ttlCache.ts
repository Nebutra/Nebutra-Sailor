import { logger } from "@nebutra/logger";
import { Redis } from "@upstash/redis";
import { getRedisConfig } from "../env";

let redis: Redis | null = null;

function getRedis(): Redis {
  if (!redis) {
    redis = new Redis(getRedisConfig());
  }
  return redis;
}

export interface TTLCacheOptions {
  /** TTL in seconds */
  ttl: number;
  /** Key prefix for namespacing */
  prefix?: string;
}

/**
 * Standard TTL-based cache
 */
export class TTLCache {
  private prefix: string;
  private defaultTTL: number;

  constructor(options: TTLCacheOptions) {
    this.prefix = options.prefix || "cache";
    this.defaultTTL = options.ttl;
  }

  private key(k: string): string {
    return `${this.prefix}:${k}`;
  }

  /**
   * Get value from cache. Returns null on Redis unavailability (graceful cache miss).
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      const redis = getRedis();
      return await redis.get<T>(this.key(key));
    } catch (err) {
      logger.warn("[cache] Redis get failed — treating as cache miss", { key, err });
      return null;
    }
  }

  /**
   * Set value in cache. Silently skips on Redis unavailability.
   */
  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    try {
      const redis = getRedis();
      await redis.set(this.key(key), value, { ex: ttl || this.defaultTTL });
    } catch (err) {
      logger.warn("[cache] Redis set failed — skipping cache write", { key, err });
    }
  }

  /**
   * Delete value from cache. Silently skips on Redis unavailability.
   */
  async delete(key: string): Promise<void> {
    try {
      const redis = getRedis();
      await redis.del(this.key(key));
    } catch (err) {
      logger.warn("[cache] Redis delete failed", { key, err });
    }
  }

  /**
   * Get or set with callback
   */
  async getOrSet<T>(key: string, fetcher: () => Promise<T>, ttl?: number): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    const value = await fetcher();
    await this.set(key, value, ttl);
    return value;
  }
}

/**
 * Create a TTL cache instance
 */
export function createTTLCache(options: TTLCacheOptions): TTLCache {
  return new TTLCache(options);
}
