import { Redis } from "@upstash/redis";

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

export interface LockOptions {
  /** Lock TTL in seconds (auto-release) */
  ttl: number;
  /** Retry attempts */
  retries?: number;
  /** Retry delay in ms */
  retryDelay?: number;
}

/**
 * Distributed lock using Redis
 */
export class DistributedLock {
  private prefix = "lock";

  private key(k: string): string {
    return `${this.prefix}:${k}`;
  }

  /**
   * Acquire a lock
   */
  async acquire(lockKey: string, options: LockOptions): Promise<string | null> {
    const redis = getRedis();
    const lockId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const retries = options.retries || 0;
    const retryDelay = options.retryDelay || 100;

    for (let i = 0; i <= retries; i++) {
      // SET NX with TTL
      const result = await redis.set(this.key(lockKey), lockId, {
        nx: true,
        ex: options.ttl,
      });

      if (result === "OK") {
        return lockId;
      }

      if (i < retries) {
        await new Promise((resolve) => setTimeout(resolve, retryDelay));
      }
    }

    return null;
  }

  /**
   * Release a lock (only if we own it)
   */
  async release(lockKey: string, lockId: string): Promise<boolean> {
    const redis = getRedis();
    const currentLockId = await redis.get(this.key(lockKey));

    if (currentLockId === lockId) {
      await redis.del(this.key(lockKey));
      return true;
    }

    return false;
  }

  /**
   * Execute with lock
   */
  async withLock<T>(
    lockKey: string,
    options: LockOptions,
    fn: () => Promise<T>,
  ): Promise<T | null> {
    const lockId = await this.acquire(lockKey, options);
    if (!lockId) {
      return null;
    }

    try {
      return await fn();
    } finally {
      await this.release(lockKey, lockId);
    }
  }
}

/**
 * Create a distributed lock instance
 */
export function createLock(): DistributedLock {
  return new DistributedLock();
}
