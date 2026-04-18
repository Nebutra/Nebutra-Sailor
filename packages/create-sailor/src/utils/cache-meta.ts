/**
 * Cache provider registry — single source of truth for the create-sailor CLI.
 *
 * L2 depth: the `@nebutra/cache` package in the monorepo is already a real
 * provider-agnostic implementation. This registry just drives CLI prompts
 * and env-var injection — it does NOT generate wrapper code.
 */

export type CacheProviderId = "upstash-redis" | "vercel-kv" | "redis" | "dragonfly" | "none";

export type CacheRegion = "global" | "cn" | "both";

export interface CacheProviderMeta {
  id: CacheProviderId;
  name: string;
  region: CacheRegion;
  envVars: string[];
  docs: string;
  description: string;
}

export const CACHE_PROVIDERS: CacheProviderMeta[] = [
  {
    id: "upstash-redis",
    name: "Upstash Redis",
    region: "both",
    envVars: ["UPSTASH_REDIS_REST_URL", "UPSTASH_REDIS_REST_TOKEN"],
    docs: "https://upstash.com/docs/redis",
    description: "Serverless Redis",
  },
  {
    id: "vercel-kv",
    name: "Vercel KV",
    region: "global",
    envVars: ["KV_URL", "KV_REST_API_URL", "KV_REST_API_TOKEN", "KV_REST_API_READ_ONLY_TOKEN"],
    docs: "https://vercel.com/docs/storage/vercel-kv",
    description: "Vercel native KV",
  },
  {
    id: "redis",
    name: "Redis (self-hosted)",
    region: "both",
    envVars: ["REDIS_URL"],
    docs: "https://redis.io/docs/",
    description: "Self-hosted Redis",
  },
  {
    id: "dragonfly",
    name: "Dragonfly",
    region: "global",
    envVars: ["DRAGONFLY_URL"],
    docs: "https://www.dragonflydb.io/docs",
    description: "Drop-in Redis replacement, faster",
  },
  {
    id: "none",
    name: "None",
    region: "both",
    envVars: [],
    docs: "",
    description: "Skip cache package",
  },
];

export function getCacheProvider(id: string): CacheProviderMeta | undefined {
  return CACHE_PROVIDERS.find((p) => p.id === id);
}

export const CACHE_PROVIDERS_BY_REGION = CACHE_PROVIDERS.reduce<
  Record<CacheRegion, CacheProviderMeta[]>
>(
  (acc, p) => {
    if (!acc[p.region]) acc[p.region] = [];
    acc[p.region].push(p);
    return acc;
  },
  {} as Record<CacheRegion, CacheProviderMeta[]>,
);
