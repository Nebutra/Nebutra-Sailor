/**
 * Search provider registry — single source of truth for the create-sailor CLI.
 *
 * L2 depth: the `@nebutra/search` package in the monorepo is already a real
 * provider-agnostic implementation. This registry just drives CLI prompts
 * and env-var injection — it does NOT generate wrapper code.
 */

export type SearchProviderId = "meilisearch" | "typesense" | "algolia" | "pgvector" | "none";

export type SearchRegion = "global" | "cn" | "both";

export interface SearchProviderMeta {
  id: SearchProviderId;
  name: string;
  region: SearchRegion;
  envVars: string[];
  docs: string;
  description: string;
}

export const SEARCH_PROVIDERS: SearchProviderMeta[] = [
  {
    id: "meilisearch",
    name: "Meilisearch",
    region: "both",
    envVars: ["MEILISEARCH_HOST", "MEILISEARCH_MASTER_KEY"],
    docs: "https://docs.meilisearch.com",
    description: "Self-hostable search",
  },
  {
    id: "typesense",
    name: "Typesense",
    region: "both",
    envVars: ["TYPESENSE_HOST", "TYPESENSE_PORT", "TYPESENSE_PROTOCOL", "TYPESENSE_API_KEY"],
    docs: "https://typesense.org/docs",
    description: "Open-source search",
  },
  {
    id: "algolia",
    name: "Algolia",
    region: "global",
    envVars: ["ALGOLIA_APP_ID", "ALGOLIA_ADMIN_API_KEY", "ALGOLIA_SEARCH_API_KEY"],
    docs: "https://www.algolia.com/doc/",
    description: "Managed search as a service",
  },
  {
    id: "pgvector",
    name: "pgvector (Postgres)",
    region: "both",
    envVars: ["DATABASE_URL"],
    docs: "https://github.com/pgvector/pgvector",
    description: "Postgres vector + full-text",
  },
  {
    id: "none",
    name: "None",
    region: "both",
    envVars: [],
    docs: "",
    description: "Skip search package",
  },
];

export function getSearchProvider(id: string): SearchProviderMeta | undefined {
  return SEARCH_PROVIDERS.find((p) => p.id === id);
}

export const SEARCH_PROVIDERS_BY_REGION = SEARCH_PROVIDERS.reduce<
  Record<SearchRegion, SearchProviderMeta[]>
>(
  (acc, p) => {
    if (!acc[p.region]) acc[p.region] = [];
    acc[p.region].push(p);
    return acc;
  },
  {} as Record<SearchRegion, SearchProviderMeta[]>,
);
