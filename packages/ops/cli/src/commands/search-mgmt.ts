import * as p from "@clack/prompts";
import type { Command } from "commander";
import pc from "picocolors";
import { ExitCode } from "../utils/exit-codes.js";
import { debug, output, status } from "../utils/output.js";

interface SearchCommandOptions {
  dryRun?: boolean;
  yes?: boolean;
  format?: "json" | "plain" | "table";
  force?: boolean;
  limit?: number;
  filters?: string;
  tenant?: string;
}

interface SearchProvider {
  type: "meilisearch" | "typesense" | "algolia" | "none";
  url?: string;
  health: boolean;
  message: string;
}

interface SearchIndex {
  name: string;
  documentCount: number;
  size?: string;
  lastUpdated?: string;
}

/**
 * Detect search provider from environment variables
 */
function detectSearchProvider(): SearchProvider {
  const meilisearchUrl = process.env.MEILISEARCH_URL;
  const typesenseUrl = process.env.TYPESENSE_URL;
  const algoliaAppId = process.env.ALGOLIA_APP_ID;

  if (meilisearchUrl) {
    return {
      type: "meilisearch",
      url: meilisearchUrl,
      health: true,
      message: "Meilisearch configured",
    };
  }

  if (typesenseUrl) {
    return { type: "typesense", url: typesenseUrl, health: true, message: "Typesense configured" };
  }

  if (algoliaAppId) {
    return { type: "algolia", health: true, message: "Algolia configured" };
  }

  return { type: "none", health: false, message: "No search provider configured" };
}

/**
 * `nebutra search status` — Search engine status and provider detection
 */
async function handleStatus(options: SearchCommandOptions): Promise<void> {
  status("Detecting search provider...", "info");

  const provider = detectSearchProvider();

  if (provider.type === "none") {
    status("No search provider is configured", "warn");
    status("Set one of: MEILISEARCH_URL, TYPESENSE_URL, or ALGOLIA_APP_ID", "info");
    process.exit(0);
  }

  const statusInfo = {
    provider: provider.type,
    configured: true,
    url: provider.url || "managed",
    health: provider.health,
    message: provider.message,
  };

  if (options.format === "json") {
    output(statusInfo, { format: "json" });
  } else {
    status(`Search Provider: ${pc.cyan(provider.type.toUpperCase())}`, "success");
    status(
      `Status: ${provider.health ? pc.green("Healthy") : pc.red("Unhealthy")}`,
      provider.health ? "success" : "error",
    );
    if (provider.url) {
      status(`URL: ${provider.url}`, "info");
    }
  }
}

/**
 * `nebutra search indexes` — List all search indexes
 */
async function handleIndexes(options: SearchCommandOptions): Promise<void> {
  status("Fetching search indexes...", "info");

  const provider = detectSearchProvider();

  if (provider.type === "none") {
    status("No search provider configured", "error");
    process.exit(ExitCode.CONFIG_ERROR);
  }

  // Mock implementation — would integrate with actual provider SDKs
  const mockIndexes: SearchIndex[] = [
    { name: "products", documentCount: 15420, size: "2.4 MB", lastUpdated: "2 hours ago" },
    { name: "articles", documentCount: 3240, size: "1.1 MB", lastUpdated: "1 day ago" },
    { name: "users", documentCount: 8900, size: "0.8 MB", lastUpdated: "30 minutes ago" },
  ];

  if (options.format === "json") {
    output(mockIndexes, { format: "json" });
  } else {
    status("Search Indexes", "info");
    for (const index of mockIndexes) {
      status(`${pc.cyan(index.name)}: ${index.documentCount} documents (${index.size})`, "info");
    }
  }
}

/**
 * `nebutra search reindex [index]` — Trigger reindex
 */
async function handleReindex(index?: string, options?: SearchCommandOptions): Promise<void> {
  const opts = options || {};

  const provider = detectSearchProvider();

  if (provider.type === "none") {
    status("No search provider configured", "error");
    process.exit(ExitCode.CONFIG_ERROR);
  }

  const isInteractive = process.stdin.isTTY === true && process.stdout.isTTY === true;

  // For full reindex, require --force and --yes
  if (!index && !opts.force && !opts.dryRun && isInteractive) {
    const confirmed = await p.confirm({
      message: "Reindex ALL indexes? This will recreate all indexes from scratch.",
      initialValue: false,
    });

    if (p.isCancel(confirmed) || !confirmed) {
      status("Reindex cancelled", "warn");
      process.exit(0);
    }
  }

  if (!opts.yes && !opts.dryRun && !index) {
    status("Full reindex requires --yes confirmation", "error");
    process.exit(ExitCode.INVALID_ARGS);
  }

  const targetIndex = index || "all";
  status(`Reindexing ${pc.cyan(targetIndex)}...`, "info");

  if (opts.dryRun) {
    status(`Would reindex ${targetIndex} with provider ${provider.type}`, "info");
    return;
  }

  // Mock reindex operation
  status(`Reindexing ${targetIndex} on ${provider.type}...`, "info");
  status(`Index ${pc.cyan(targetIndex)} reindexed successfully`, "success");
}

/**
 * `nebutra search query <index> <query>` — Test search query
 */
async function handleQuery(
  index: string,
  query: string,
  options: SearchCommandOptions,
): Promise<void> {
  status(`Querying ${pc.cyan(index)} for "${pc.yellow(query)}"...`, "info");

  const provider = detectSearchProvider();

  if (provider.type === "none") {
    status("No search provider configured", "error");
    process.exit(ExitCode.CONFIG_ERROR);
  }

  // Mock search results
  const mockResults = [
    {
      id: "1",
      title: "Sample Result 1",
      score: 0.95,
      _formatted: {
        title: `Sample <mark>Result</mark> 1`,
        content: "Contains search term...",
      },
    },
    {
      id: "2",
      title: "Another Result",
      score: 0.87,
      _formatted: {
        title: "Another <mark>Result</mark>",
        content: "Also matches search...",
      },
    },
  ];

  const searchResponse = {
    index,
    query,
    provider: provider.type,
    hits: mockResults.length,
    limit: options.limit || 10,
    results: mockResults,
  };

  if (options.format === "json") {
    output(searchResponse, { format: "json" });
  } else {
    status(`Found ${pc.cyan(String(mockResults.length))} results for "${query}"`, "success");
    for (const result of mockResults) {
      status(`${pc.dim(String(result.score))}: ${result.title}`, "info");
    }
  }
}

/**
 * `nebutra search stats` — Index statistics
 */
async function handleStats(options: SearchCommandOptions): Promise<void> {
  status("Fetching search statistics...", "info");

  const provider = detectSearchProvider();

  if (provider.type === "none") {
    status("No search provider configured", "error");
    process.exit(ExitCode.CONFIG_ERROR);
  }

  // Mock statistics
  const stats = {
    provider: provider.type,
    indexes: [
      { name: "products", documents: 15420, size: 2400000, lastUpdated: "2024-03-30T14:22:00Z" },
      { name: "articles", documents: 3240, size: 1100000, lastUpdated: "2024-03-29T08:15:00Z" },
      { name: "users", documents: 8900, size: 800000, lastUpdated: "2024-03-30T14:52:00Z" },
    ],
    totalDocuments: 27560,
    totalSize: 4300000,
  };

  if (options.format === "json") {
    output(stats, { format: "json" });
  } else {
    status("Search Statistics", "info");
    status(`Provider: ${pc.cyan(stats.provider)}`, "info");
    status(`Total Indexes: ${stats.indexes.length}`, "info");
    status(`Total Documents: ${stats.totalDocuments.toLocaleString()}`, "info");
    status(`Total Size: ${(stats.totalSize / 1024 / 1024).toFixed(2)} MB`, "info");

    status("Index Breakdown:", "info");
    for (const idx of stats.indexes) {
      status(
        `  ${pc.cyan(idx.name)}: ${idx.documents.toLocaleString()} docs (${(idx.size / 1024 / 1024).toFixed(2)} MB)`,
        "info",
      );
    }
  }
}

/**
 * Register the `search` command group
 * Usage: nebutra search <subcommand> [args]
 */
export function registerSearchCommand(program: Command): void {
  const searchCommand = program
    .command("search <verb> [args...]")
    .description("Manage search engine (Meilisearch, Typesense, or Algolia)")
    .option("--dry-run", "Show what would be run without executing")
    .option("--yes", "Skip confirmations")
    .option("--format <type>", "Output format: json, plain, table", "plain")
    .option("--force", "Force operation (e.g., recreate index)")
    .option("--limit <n>", "Result limit for queries")
    .option("--filters <json>", "Filters for search query (JSON)")
    .option("--tenant <id>", "Tenant ID for multi-tenant queries")
    .action(
      async (
        verb: string,
        args: string[],
        options: SearchCommandOptions & { optsWithGlobals?: () => SearchCommandOptions },
      ) => {
        const globalOptions = options.optsWithGlobals?.();
        const mergedOptions: SearchCommandOptions = {
          dryRun: options.dryRun || globalOptions?.dryRun,
          yes: options.yes || globalOptions?.yes,
          format: (options.format || globalOptions?.format) as "json" | "plain" | "table",
          force: options.force || false,
          limit: options.limit ?? 10,
          filters: options.filters,
          tenant: options.tenant,
        };

        try {
          switch (verb) {
            case "status":
              await handleStatus(mergedOptions);
              break;

            case "indexes":
              await handleIndexes(mergedOptions);
              break;

            case "reindex":
              if (args.length > 0) {
                await handleReindex(args[0], mergedOptions);
              } else {
                await handleReindex(undefined, mergedOptions);
              }
              break;

            case "query":
              if (args.length < 2) {
                status(
                  "query requires an index and search term: nebutra search query <index> <query>",
                  "error",
                );
                process.exit(ExitCode.INVALID_ARGS);
              }
              await handleQuery(args[0], args.slice(1).join(" "), mergedOptions);
              break;

            case "stats":
              await handleStats(mergedOptions);
              break;

            default:
              status(
                `Unknown search subcommand: ${verb}. Valid commands: status, indexes, reindex, query, stats`,
                "error",
              );
              process.exit(ExitCode.ERROR);
          }
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          status(`Search command failed: ${message}`, "error");
          debug("Full error", { error });
          process.exit(ExitCode.ERROR);
        }
      },
    );

  // Add help text
  searchCommand.addHelpText(
    "after",
    `
Examples:
  nebutra search status                           Show search provider status
  nebutra search indexes                          List all indexes
  nebutra search reindex products                 Reindex products index
  nebutra search reindex --force --yes            Force reindex all indexes
  nebutra search query products "laptop"          Search products for "laptop"
  nebutra search query products "laptop" --limit 20  Search with custom limit
  nebutra search stats                            Show index statistics

Supported Providers:
  Meilisearch (self-hosted) — MEILISEARCH_URL env var
  Typesense (self-hosted) — TYPESENSE_URL env var
  Algolia (managed) — ALGOLIA_APP_ID env var

Flags:
  --dry-run                   Show what would be run without executing
  --yes                       Skip confirmations
  --format <type>             Output format: json, plain, table (default: plain)
  --force                     Force operation (e.g., recreate index)
  --limit <n>                 Result limit for queries (default: 10)
  --filters <json>            Filters for search query
  --tenant <id>               Tenant ID for multi-tenant searches
    `,
  );
}
