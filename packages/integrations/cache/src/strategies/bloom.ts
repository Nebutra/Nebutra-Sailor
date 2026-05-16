/**
 * Redis-backed Bloom filter — wraps the `bloom-filters` npm package
 * (Yoshua's library, ~28K weekly downloads, pure JS, TypeScript types).
 *
 * Why a Bloom filter:
 *   - Membership tests in O(1) with bounded false-positive rate, ~10 bits
 *     per element regardless of value size.
 *   - Order-of-magnitude cheaper than `SET` for large dedup sets:
 *       100M elements + 1% false positive = ~120 MB
 *       100M elements + Redis SET = ~6 GB
 *   - AI SaaS use cases: prompt dedup (don't re-charge identical prompts
 *     in the same minute), notification "have you seen this" checks,
 *     email already-registered preflight, click-tracking dedup.
 *
 * Persistence: we serialize the filter to a single Redis key as JSON. On
 * each `add()` we re-serialize and `SET` it — fine for low-write,
 * high-read workloads (the typical Bloom shape). For very hot writes,
 * batch via `addMany()` to amortize the serialization cost.
 *
 * Trade-off vs the `RedisBloom` module: this works on stock Redis /
 * Upstash / Dragonfly without requiring the BF.* commands. Cheaper to
 * deploy, no module dependency. The cost is the read-modify-write cycle
 * on every add — fine for the typical "did we see this before" workload
 * but not for high-throughput counting.
 */

import bloomFilters from "bloom-filters";
import { getCacheClient } from "../client";

const { BloomFilter } = bloomFilters;
type BloomFilterInstance = InstanceType<typeof BloomFilter>;

export interface BloomFilterOptions {
  /** Redis key holding the serialized filter. */
  key: string;
  /** Expected element count. The filter sizes itself accordingly. */
  capacity: number;
  /** Acceptable false-positive rate. 0.01 = 1% is a good default. */
  errorRate?: number;
  /** TTL in seconds — filter resets after expiry. Omit for no expiry. */
  ttlSeconds?: number;
}

export interface RedisBloomFilter {
  /** Add an item. Returns true if the item was likely already present. */
  add(item: string): Promise<boolean>;
  /** Add multiple items in one round-trip. Returns count newly added. */
  addMany(items: readonly string[]): Promise<number>;
  /** Test for membership. False = definitely not in set; true = probably in set. */
  has(item: string): Promise<boolean>;
  /** Wipe the filter (deletes the Redis key). */
  clear(): Promise<void>;
  /** Approximate filter size (number of items added since last clear). */
  approxSize(): Promise<number>;
}

interface SerializedFilter {
  /**
   * `bloom-filters` ships a `saveAsJSON()` / `fromJSON()` round-trip. Shape
   * is `{ _size, _nbHashes, _filter: number[], _seed, _type }`. We treat
   * this as opaque — the package owns the schema.
   */
  filter: unknown;
  /** Best-effort cardinality counter for telemetry (not authoritative). */
  count: number;
}

async function load(
  key: string,
  opts: BloomFilterOptions,
): Promise<{ filter: BloomFilterInstance; count: number }> {
  const cache = await getCacheClient();
  const raw = await cache.get(key);
  if (!raw) {
    const filter = BloomFilter.create(opts.capacity, opts.errorRate ?? 0.01);
    return { filter, count: 0 };
  }

  try {
    const parsed: SerializedFilter =
      typeof raw === "string" ? JSON.parse(raw) : (raw as SerializedFilter);
    // `bloom-filters` types `fromJSON` as `(json: JSON)` (a typo for `any`
    // in their .d.ts) — cast through `any` to bypass the bogus constraint.
    return {
      // biome-ignore lint/suspicious/noExplicitAny: third-party typing bug
      filter: BloomFilter.fromJSON(parsed.filter as any),
      count: parsed.count ?? 0,
    };
  } catch {
    // Corrupt/legacy value — start over rather than crashing the caller.
    return { filter: BloomFilter.create(opts.capacity, opts.errorRate ?? 0.01), count: 0 };
  }
}

async function save(
  key: string,
  filter: BloomFilterInstance,
  count: number,
  ttlSeconds?: number,
): Promise<void> {
  const cache = await getCacheClient();
  const payload: SerializedFilter = { filter: filter.saveAsJSON(), count };
  const serialized = JSON.stringify(payload);
  await (ttlSeconds ? cache.set(key, serialized, { ex: ttlSeconds }) : cache.set(key, serialized));
}

export function createBloomFilter(opts: BloomFilterOptions): RedisBloomFilter {
  const { key } = opts;

  return {
    async add(item: string): Promise<boolean> {
      const { filter, count } = await load(key, opts);
      const wasPresent = filter.has(item);
      if (!wasPresent) {
        filter.add(item);
        await save(key, filter, count + 1, opts.ttlSeconds);
      }
      return wasPresent;
    },

    async addMany(items: readonly string[]): Promise<number> {
      if (items.length === 0) return 0;
      const { filter, count } = await load(key, opts);
      let added = 0;
      for (const item of items) {
        if (!filter.has(item)) {
          filter.add(item);
          added++;
        }
      }
      if (added > 0) {
        await save(key, filter, count + added, opts.ttlSeconds);
      }
      return added;
    },

    async has(item: string): Promise<boolean> {
      const { filter } = await load(key, opts);
      return filter.has(item);
    },

    async clear(): Promise<void> {
      const cache = await getCacheClient();
      await cache.del(key);
    },

    async approxSize(): Promise<number> {
      const { count } = await load(key, opts);
      return count;
    },
  };
}
