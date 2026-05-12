import { Redis } from "@upstash/redis";
import { getRedisConfig } from "./env";
import type { CacheClient, SetOptions } from "./types";

/**
 * Upstash Redis adapter — wraps the @upstash/redis HTTP client.
 *
 * Upstash already JSON-(de)serializes values automatically, so our wrapper is
 * almost a passthrough. The contract we expose mirrors `@upstash/redis`'s
 * options shape ({ ex, px, nx, xx }) — that was the native shape strategies
 * were written against pre-refactor.
 */
export class UpstashRedisCacheClient implements CacheClient {
  private client: Redis;

  constructor(client?: Redis) {
    this.client = client ?? new Redis(getRedisConfig());
  }

  async get<T>(key: string): Promise<T | null> {
    return (await this.client.get<T>(key)) ?? null;
  }

  async set(key: string, value: unknown, opts?: SetOptions): Promise<"OK" | null> {
    const result = await this.client.set(key, value, opts as never);
    return (result as "OK" | null) ?? null;
  }

  async del(...keys: string[]): Promise<number> {
    if (keys.length === 0) return 0;
    return await this.client.del(...keys);
  }
}

export { Redis };
