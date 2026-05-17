import { Redis } from "@upstash/redis";
import { getRedisConfig } from "./env.js";
import type { CacheClient, ScanOptions, SetOptions } from "./types.js";

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

  async ping(): Promise<string> {
    return (await (this.client as unknown as { ping: () => Promise<string> }).ping()) ?? "PONG";
  }

  async scan(cursor: string | number, options?: ScanOptions): Promise<[string, string[]]> {
    const result = await (
      this.client.scan as (
        c: string | number,
        o?: ScanOptions,
      ) => Promise<[string | number, string[]]>
    )(cursor, options);
    return [String(result[0]), result[1]];
  }

  async incr(key: string): Promise<number> {
    return await this.client.incr(key);
  }

  async incrby(key: string, n: number): Promise<number> {
    return await this.client.incrby(key, n);
  }

  async expire(key: string, seconds: number): Promise<number> {
    return await this.client.expire(key, seconds);
  }

  async eval(script: string, keys: string[], args: Array<string | number>): Promise<unknown> {
    return await this.client.eval(script, keys, args as never);
  }
}
