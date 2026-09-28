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
 * The pgvector provider has no connection of its own — `config.db` must
 * inject a `PgvectorDbAdapter` (`getSystemDb` / `getTenantDb`). Inside the
 * @nebutra/db-owning monorepo that is `@nebutra/db`'s exports; see
 * `backends/gateway/src/routes/search/index.ts` for the wiring.
 *
 * @example
 * ```ts
 * import { getSystemDb, getTenantDb } from "@nebutra/db";
 *
 * const search = await createSearch({
 *   provider: "pgvector",
 *   db: { getSystemDb, getTenantDb },
 *   tablePrefix: "nebutra_search",
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
      if (!pgvectorConfig?.db) {
        throw new Error(
          '[search] createSearch({ provider: "pgvector" }) requires `db` — inject a ' +
            "PgvectorDbAdapter (getSystemDb/getTenantDb). Inside the @nebutra/db-owning monorepo that " +
            "is @nebutra/db's exports.",
        );
      }
      return new PgvectorProvider({
        provider: "pgvector",
        db: pgvectorConfig.db,
        ...(pgvectorConfig.embeddingDim !== undefined
          ? { embeddingDim: pgvectorConfig.embeddingDim }
          : {}),
        ...(pgvectorConfig.tablePrefix !== undefined
          ? { tablePrefix: pgvectorConfig.tablePrefix }
          : {}),
      });
    }

    default:
      throw new Error(`Unknown search provider: ${providerType as string}`);
  }
}

/**
 * Get the default (singleton) search provider — set it first with
 * `setSearch()` (the pgvector provider needs `db` injected; there is no
 * env-var auto-connect). Uses lazy initialisation so import-time side
 * effects are avoided.
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
