import { logger } from "@nebutra/logger";
import type { SearchConfig, SearchProvider, SearchProviderType } from "./types";

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
  return "pgvector";
}

/**
 * Create a search provider instance.
 *
 * @example
 * ```ts
 * // Auto-detect from environment
 * const search = await createSearch();
 *
 * // Explicit pgvector
 * const search = await createSearch({
 *   provider: "pgvector",
 *   connectionString: "postgres://localhost/nebutra",
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
    case "pgvector": {
      const { PgvectorProvider } = await import("./providers/pgvector");
      const pgvectorConfig = config;
      return new PgvectorProvider({
        provider: "pgvector",
        ...(pgvectorConfig?.connectionString !== undefined
          ? { connectionString: pgvectorConfig.connectionString }
          : {}),
        ...(pgvectorConfig?.embeddingDim !== undefined
          ? { embeddingDim: pgvectorConfig.embeddingDim }
          : {}),
        ...(pgvectorConfig?.tablePrefix !== undefined
          ? { tablePrefix: pgvectorConfig.tablePrefix }
          : {}),
      });
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
