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

export * from "./client";
export * from "./env";
export * from "./strategies/lazyRefresh";
export * from "./strategies/lockCache";
export * from "./strategies/stampede";
export * from "./strategies/ttlCache";
export type * from "./types";
