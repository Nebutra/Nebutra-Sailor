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
}

export type CacheBackend = "upstash-redis" | "ioredis";
