/**
 * CacheClient — provider-agnostic cache interface.
 *
 * Tracks only the methods our strategies and downstream consumers actually use
 * (audited via grep on 2026-05-12). Keeping the surface tiny lets us back the
 * interface with both `@upstash/redis` (HTTP REST) and `ioredis` (TCP) without
 * exposing protocol-specific quirks to callers.
 *
 * Adding new methods here = adding adapter impls in BOTH `upstash.ts` and
 * `ioredis.ts`. Don't bypass the interface by typing as `Redis` directly.
 */

export interface SetOptions {
  /** Expire in N seconds */
  ex?: number;
  /** Expire in N milliseconds */
  px?: number;
  /** Only set if key does not exist */
  nx?: boolean;
  /** Only set if key already exists */
  xx?: boolean;
}

export interface ScanOptions {
  match?: string;
  count?: number;
  type?: string;
}

export interface CacheClient {
  /**
   * Read a value. Returns null if the key doesn't exist or has expired.
   *
   * Generic `T` lets callers assert a return shape; adapters are responsible
   * for JSON-parsing string-only backends (ioredis) so callers see structured
   * values consistently.
   */
  get<T>(key: string): Promise<T | null>;

  /**
   * Write a value with optional TTL. Returns "OK" on success, null on
   * conditional-set rejection (NX/XX).
   *
   * Adapters serialize non-string values to JSON automatically for the
   * ioredis backend; @upstash/redis already does this.
   */
  set(key: string, value: unknown, opts?: SetOptions): Promise<"OK" | null>;

  /**
   * Delete one or more keys. Returns the number of keys actually removed.
   */
  del(...keys: string[]): Promise<number>;

  /**
   * Liveness check. Returns "PONG" on healthy connection.
   */
  ping(): Promise<string>;

  /**
   * Cursor-based key iteration. Signature mirrors `@upstash/redis`'s
   * `scan(cursor, { match, count })` and returns `[nextCursor, keys]`.
   * The ioredis adapter translates to the variadic command form internally.
   */
  scan(cursor: string | number, options?: ScanOptions): Promise<[string, string[]]>;

  /**
   * Atomically increment a counter by 1. Creates the key (initialised to 0)
   * if it doesn't exist. Returns the post-increment value.
   */
  incr(key: string): Promise<number>;

  /**
   * Atomically increment a counter by `n`. Returns the post-increment value.
   */
  incrby(key: string, n: number): Promise<number>;

  /**
   * Set a TTL (seconds) on an existing key. Returns 1 if applied, 0 if the
   * key didn't exist.
   */
  expire(key: string, seconds: number): Promise<number>;

  /**
   * Execute a Lua script server-side. Both Upstash REST and ioredis support
   * EVAL — this is the cheapest way to run an atomic multi-key transaction
   * without RTT-per-command.
   *
   * Signature follows `@upstash/redis`: keys and args are passed as separate
   * arrays. ioredis variadic translation is internal.
   */
  eval(script: string, keys: string[], args: Array<string | number>): Promise<unknown>;
}

export type CacheBackend = "upstash-redis" | "ioredis";

/**
 * @deprecated Use `CacheClient` directly. Kept as an alias so existing
 * `import { Redis } from "@nebutra/cache"` doesn't break — the underlying
 * client is now multi-backend, not specifically `@upstash/redis`.
 */
export type Redis = CacheClient;
