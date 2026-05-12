import IORedis, { type Redis as IORedisClient } from "ioredis";
import type { CacheClient, ScanOptions, SetOptions } from "./types";

/**
 * ioredis adapter — wraps a standard TCP Redis client (self-hosted Redis,
 * Dragonfly, Vercel KV, Redis Cloud, anything Redis-protocol-compatible).
 *
 * Unlike @upstash/redis, ioredis doesn't auto-(de)serialize JSON. This
 * adapter wraps every write to stringify non-string values, and every read
 * to attempt JSON.parse — falling back to the raw string if parse fails.
 * That gives callers the same structured-value contract as the Upstash
 * adapter.
 *
 * Connection: defaults to process.env.REDIS_URL. Caller can inject an
 * existing client (useful for tests + when the consumer already manages the
 * connection pool).
 */
export class IoredisCacheClient implements CacheClient {
  private client: IORedisClient;

  constructor(client?: IORedisClient | string) {
    if (typeof client === "string" || client === undefined) {
      const url = (typeof client === "string" ? client : process.env.REDIS_URL) ?? "";
      if (!url) {
        throw new Error(
          "[cache:ioredis] REDIS_URL not configured. Pass a connection string or an ioredis client.",
        );
      }
      this.client = new IORedis(url, {
        // Don't auto-reconnect forever; surface failures to callers via
        // graceful-cache-miss handling in the strategies.
        maxRetriesPerRequest: 3,
        enableOfflineQueue: false,
        lazyConnect: false,
      });
    } else {
      this.client = client;
    }
  }

  async get<T>(key: string): Promise<T | null> {
    const raw = await this.client.get(key);
    if (raw === null) return null;
    // Try to parse JSON; if it fails, return the raw string cast to T.
    try {
      return JSON.parse(raw) as T;
    } catch {
      return raw as unknown as T;
    }
  }

  async set(key: string, value: unknown, opts?: SetOptions): Promise<"OK" | null> {
    const payload = typeof value === "string" ? value : JSON.stringify(value);

    // Map @upstash/redis options shape onto ioredis variadic args.
    const args: Array<string | number> = [];
    if (opts?.ex !== undefined) args.push("EX", opts.ex);
    if (opts?.px !== undefined) args.push("PX", opts.px);
    if (opts?.nx) args.push("NX");
    if (opts?.xx) args.push("XX");

    let result: string | null;
    if (args.length === 0) {
      result = await this.client.set(key, payload);
    } else {
      // ioredis types make variadic SET awkward; this is the documented call shape.
      result = await (this.client.set as (...a: unknown[]) => Promise<string | null>)(
        key,
        payload,
        ...args,
      );
    }
    return result === "OK" ? "OK" : null;
  }

  async del(...keys: string[]): Promise<number> {
    if (keys.length === 0) return 0;
    return await this.client.del(...keys);
  }

  async ping(): Promise<string> {
    return await this.client.ping();
  }

  async scan(cursor: string | number, options?: ScanOptions): Promise<[string, string[]]> {
    const args: Array<string | number> = [];
    if (options?.match) args.push("MATCH", options.match);
    if (options?.count !== undefined) args.push("COUNT", options.count);
    if (options?.type) args.push("TYPE", options.type);
    const [next, keys] = (await (
      this.client.scan as (...a: unknown[]) => Promise<[string, string[]]>
    )(String(cursor), ...args)) as [string, string[]];
    return [next, keys];
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
    return await (this.client.eval as (...a: unknown[]) => Promise<unknown>)(
      script,
      keys.length,
      ...keys,
      ...args,
    );
  }

  /**
   * Expose the underlying ioredis client for callers that need protocol-level
   * commands (LPUSH, BRPOPLPUSH, etc.) NOT covered by CacheClient. Treat as
   * an escape hatch — extending CacheClient is preferred when the new method
   * is reused.
   */
  unsafeUnderlying(): IORedisClient {
    return this.client;
  }
}
