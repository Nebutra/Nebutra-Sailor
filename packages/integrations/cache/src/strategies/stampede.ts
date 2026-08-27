import pRetry from "p-retry";
import { getCacheClient } from "../client.js";
import type { CacheClient } from "../types.js";
import { createLock } from "./lockCache.js";

async function getRedis(): Promise<CacheClient> {
  return getCacheClient();
}

export interface StampedeOptions {
  /** Cache TTL in seconds */
  ttl: number;
  /** Lock TTL in seconds */
  lockTTL?: number;
  /** Retry attempts while waiting for a contended lock holder to fill cache */
  waitRetries?: number;
  /** Initial retry delay in ms while waiting for a contended cache fill */
  waitDelay?: number;
  /** Key prefix */
  prefix?: string;
}

class CacheFillPendingError extends Error {
  constructor() {
    super("cache fill pending");
    this.name = "CacheFillPendingError";
  }
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
  private waitRetries: number;
  private waitDelay: number;
  private lock = createLock();

  constructor(options: StampedeOptions) {
    this.prefix = options.prefix || "stampede";
    this.ttl = options.ttl;
    this.lockTTL = options.lockTTL || 30;
    this.waitRetries = options.waitRetries ?? 3;
    this.waitDelay = options.waitDelay ?? 100;
  }

  private key(k: string): string {
    return `${this.prefix}:${k}`;
  }

  /**
   * Get or set with stampede prevention
   */
  async getOrSet<T>(key: string, fetcher: () => Promise<T>, ttl?: number): Promise<T> {
    const redis = await getRedis();
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

    // If we couldn't get the lock, another process is regenerating. Poll with
    // exponential backoff + jitter before falling back to an uncached fetch.
    if (result === null) {
      try {
        return await pRetry(
          async () => {
            const eventual = await redis.get<T>(cacheKey);
            if (eventual !== null) return eventual;
            throw new CacheFillPendingError();
          },
          {
            retries: this.waitRetries,
            minTimeout: this.waitDelay,
            factor: 2,
            maxTimeout: Math.max(this.waitDelay, this.waitDelay * 2 ** 4),
            randomize: true,
            shouldRetry: ({ error }) => error instanceof CacheFillPendingError,
          },
        );
      } catch (error) {
        if (!(error instanceof CacheFillPendingError)) {
          throw error;
        }
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
