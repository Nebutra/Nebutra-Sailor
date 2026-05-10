import { logger } from "@nebutra/logger";
import type { SearchConfig, SearchProvider, SearchProviderType } from "./types.js";

// =============================================================================
// Search Factory — Provider-agnostic search creation
// =============================================================================
// The factory resolves the correct provider at runtime based on:
//   1. Explicit config passed to `createSearch()`
//   2. `SEARCH_PROVIDER` environment variable
//   3. Auto-detection based on available env vars
//
// This lets customers switch backends without changing application code.
// =============================================================================

let defaultProvider: SearchProvider | null = null;

/**
 * Detect which provider to use based on available environment variables.
 */
function detectProvider(): SearchProviderType {
  if (process.env.MEILISEARCH_URL) return "meilisearch";
  if (process.env.TYPESENSE_URL) return "typesense";
  if (process.env.ALGOLIA_APP_ID) return "algolia";
  return "meilisearch"; // Default fallback
}

/**
 * Create a search provider instance.
 *
 * @example
 * ```ts
 * // Auto-detect from environment
 * const search = await createSearch();
 *
 * // Explicit Meilisearch
 * const search = await createSearch({
 *   provider: "meilisearch",
 *   url: "http://localhost:7700",
 * });
 *
 * // Explicit Algolia
 * const search = await createSearch({
 *   provider: "algolia",
 *   appId: "YOUR_APP_ID",
 *   searchKey: "YOUR_SEARCH_KEY",
 *   adminKey: "YOUR_ADMIN_KEY",
 * });
 * ```
 */
export async function createSearch(config?: SearchConfig): Promise<SearchProvider> {
  const providerType =
    config?.provider ??
    (process.env.SEARCH_PROVIDER as SearchProviderType | undefined) ??
    detectProvider();

  logger.info("[search] Creating provider", { provider: providerType });

  switch (providerType) {
    case "meilisearch": {
      const { MeilisearchProvider } = await import("./providers/meilisearch.js");
      const meilisearchConfig = config as
        | Exclude<SearchConfig, { provider: "typesense" | "algolia" }>
        | undefined;
      const configObj: any = { provider: "meilisearch" };
      if (meilisearchConfig?.url !== undefined) configObj.url = meilisearchConfig.url;
      if (meilisearchConfig?.apiKey !== undefined) configObj.apiKey = meilisearchConfig.apiKey;
      if (meilisearchConfig?.timeout !== undefined) configObj.timeout = meilisearchConfig.timeout;
      return new MeilisearchProvider(configObj);
    }

    case "typesense": {
      const { TypesenseProvider } = await import("./providers/typesense.js");
      const typesenseConfig = config as
        | Exclude<SearchConfig, { provider: "meilisearch" | "algolia" }>
        | undefined;
      const configObj: any = { provider: "typesense" };
      if (typesenseConfig?.url !== undefined) configObj.url = typesenseConfig.url;
      if (typesenseConfig?.apiKey !== undefined) configObj.apiKey = typesenseConfig.apiKey;
      if (typesenseConfig?.timeout !== undefined) configObj.timeout = typesenseConfig.timeout;
      return new TypesenseProvider(configObj);
    }

    case "algolia": {
      const { AlgoliaProvider } = await import("./providers/algolia.js");
      const algoliaConfig = config as
        | Exclude<SearchConfig, { provider: "meilisearch" | "typesense" }>
        | undefined;
      const configObj: any = { provider: "algolia" };
      if (algoliaConfig?.appId !== undefined) configObj.appId = algoliaConfig.appId;
      if (algoliaConfig?.searchKey !== undefined) configObj.searchKey = algoliaConfig.searchKey;
      if (algoliaConfig?.adminKey !== undefined) configObj.adminKey = algoliaConfig.adminKey;
      return new AlgoliaProvider(configObj);
    }

    default:
      throw new Error(`Unknown search provider: ${providerType as string}`);
  }
}

/**
 * Get or create the default (singleton) search provider.
 * Uses lazy initialisation so import-time side effects are avoided.
 */
export async function getSearch(): Promise<SearchProvider> {
  if (!defaultProvider) {
    defaultProvider = await createSearch();
  }
  return defaultProvider;
}

/**
 * Replace the default search provider (useful in tests).
 */
export function setSearch(provider: SearchProvider): void {
  defaultProvider = provider;
}

/**
 * Gracefully shut down the default search provider.
 */
export async function closeSearch(): Promise<void> {
  if (defaultProvider) {
    await defaultProvider.close();
    defaultProvider = null;
  }
}
