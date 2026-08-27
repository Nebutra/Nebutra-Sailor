// Barrel — client-safe surface only.
//
// `./ioredis` and `./upstash` are NOT re-exported here so they don't get
// pulled into client bundles via `@nebutra/cache`. Server code that needs
// the concrete backend classes (`IoredisCacheClient`, `UpstashRedisCacheClient`)
// must import them from the dedicated subpaths:
//
//   import { IoredisCacheClient } from "@nebutra/cache/ioredis";
//   import { UpstashRedisCacheClient } from "@nebutra/cache/upstash";
//
// 99% of callers should use `getRedis()` / the `redis` proxy from `./client`
// and never touch backend classes directly.

export * from "./client.js";
export * from "./env.js";
export * from "./strategies/bloom.js";
export * from "./strategies/lazyRefresh.js";
export * from "./strategies/lockCache.js";
export * from "./strategies/stampede.js";
export * from "./strategies/ttlCache.js";
export type * from "./types.js";
