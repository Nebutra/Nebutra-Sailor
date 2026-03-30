import { Redis } from "@upstash/redis";
import { createLock } from "./lockCache.js";

let redis: Redis | null = null;

function getRedis(): Redis {
  if (!redis) {
    redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL ?? "",
      token: process.env.UPSTASH_REDIS_REST_TOKEN ?? "",
    });
  }
  return redis;
}

export interface StampedeOptions {
  /** Cache TTL in seconds */
  ttl: number;
  /** Lock TTL in seconds */
  lockTTL?: number;
  /** Key prefix */
  prefix?: string;
}

/**
 * Cache with stampede prevention
 * Uses distributed lock to prevent multiple processes from
 * regenerating the same cache entry simultaneously
 */
export class StampedeCache {
  private prefix: string;
  private ttl: number;
  private lockTTL: number;
  private lock = createLock();

  constructor(options: StampedeOptions) {
    this.prefix = options.prefix || "stampede";
    this.ttl = options.ttl;
    this.lockTTL = options.lockTTL || 30;
  }

  private key(k: string): string {
    return `${this.prefix}:${k}`;
  }

  /**
   * Get or set with stampede prevention
   */
  async getOrSet<T>(key: string, fetcher: () => Promise<T>, ttl?: number): Promise<T> {
    const redis = getRedis();
    const cacheKey = this.key(key);

    // Try to get from cache first
    const cached = await redis.get<T>(cacheKey);
    if (cached !== null) {
      return cached;
    }

    // Cache miss - acquire lock to regenerate
    const lockKey = `${cacheKey}:lock`;
    const result = await this.lock.withLock<T>(lockKey, { ttl: this.lockTTL }, async () => {
      // Double-check cache (another process might have set it)
      const rechecked = await redis.get<T>(cacheKey);
      if (rechecked !== null) {
        return rechecked;
      }

      // Fetch and cache
      const value = await fetcher();
      await redis.set(cacheKey, value, { ex: ttl || this.ttl });
      return value;
    });

    // If we couldn't get the lock, wait and retry
    if (result === null) {
      await new Promise((resolve) => setTimeout(resolve, 100));
      const eventual = await redis.get<T>(cacheKey);
      if (eventual !== null) {
        return eventual;
      }
      // Last resort - just fetch without caching
      return fetcher();
    }

    return result;
  }
}

/**
 * Create a stampede-protected cache
 */
export function createStampedeCache(options: StampedeOptions): StampedeCache {
  return new StampedeCache(options);
}
