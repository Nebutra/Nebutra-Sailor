import { Redis } from "@upstash/redis";
import { getRedisConfig } from "../env";

let redis: Redis | null = null;

function getRedis(): Redis {
  if (!redis) {
    redis = new Redis(getRedisConfig());
  }
  return redis;
}

interface CachedValue<T> {
  value: T;
  expiresAt: number;
  softExpiresAt: number;
}

export interface LazyRefreshOptions {
  /** Hard TTL in seconds (cache eviction) */
  ttl: number;
  /** Soft TTL in seconds (trigger background refresh) */
  softTTL: number;
  /** Key prefix */
  prefix?: string;
}

/**
 * Cache with lazy background refresh
 * Returns stale data while refreshing in background before hard expiry
 */
export class LazyRefreshCache {
  private prefix: string;
  private ttl: number;
  private softTTL: number;
  private refreshing = new Set<string>();

  constructor(options: LazyRefreshOptions) {
    this.prefix = options.prefix || "lazy";
    this.ttl = options.ttl;
    this.softTTL = options.softTTL;
  }

  private key(k: string): string {
    return `${this.prefix}:${k}`;
  }

  /**
   * Get or set with lazy refresh
   */
  async getOrSet<T>(
    key: string,
    fetcher: () => Promise<T>,
    options?: Partial<LazyRefreshOptions>,
  ): Promise<T> {
    const redis = getRedis();
    const cacheKey = this.key(key);
    const ttl = options?.ttl || this.ttl;
    const softTTL = options?.softTTL || this.softTTL;

    const cached = await redis.get<CachedValue<T>>(cacheKey);

    if (cached) {
      const now = Date.now();

      // Check if past soft expiry - trigger background refresh
      if (now > cached.softExpiresAt && !this.refreshing.has(cacheKey)) {
        this.refreshing.add(cacheKey);

        // Background refresh (don't await)
        this.refresh(cacheKey, fetcher, ttl, softTTL).finally(() => {
          this.refreshing.delete(cacheKey);
        });
      }

      // Return existing value (even if stale)
      return cached.value;
    }

    // Cache miss - fetch synchronously
    return this.refresh(cacheKey, fetcher, ttl, softTTL);
  }

  private async refresh<T>(
    cacheKey: string,
    fetcher: () => Promise<T>,
    ttl: number,
    softTTL: number,
  ): Promise<T> {
    const redis = getRedis();
    const value = await fetcher();
    const now = Date.now();

    const cached: CachedValue<T> = {
      value,
      expiresAt: now + ttl * 1000,
      softExpiresAt: now + softTTL * 1000,
    };

    await redis.set(cacheKey, cached, { ex: ttl });
    return value;
  }

  /**
   * Invalidate cache entry
   */
  async invalidate(key: string): Promise<void> {
    const redis = getRedis();
    await redis.del(this.key(key));
  }
}

/**
 * Create a lazy refresh cache
 */
export function createLazyRefreshCache(options: LazyRefreshOptions): LazyRefreshCache {
  return new LazyRefreshCache(options);
}
