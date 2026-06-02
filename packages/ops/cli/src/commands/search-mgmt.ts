import * as p from "@clack/prompts";
import type { Command } from "commander";
import pc from "picocolors";
import { ExitCode } from "../utils/exit-codes";
import { debug, output, status } from "../utils/output";

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

/**
 * Fetch helper for the gateway search API.
 * Mirrors the auth-fetch pattern in admin.ts: builds a request to
 * `${NEBUTRA_API_URL}/api/v1/...` with a Bearer token from the environment.
 */
async function searchApiFetch(
  path: string,
  init: { method?: string; body?: Record<string, unknown> } = {},
): Promise<{ ok: boolean; status: number; data?: unknown; error?: string }> {
  const apiUrl = process.env.NEBUTRA_API_URL || "http://localhost:3100";
  const token = process.env.NEBUTRA_API_TOKEN;

  if (!token) {
    return {
      ok: false,
      status: 401,
      error: "NEBUTRA_API_TOKEN environment variable not set. Set it to a valid bearer token.",
    };
  }

  const url = new URL(path, apiUrl).toString();
  const method = init.method || "GET";
  const body = init.body ? JSON.stringify(init.body) : undefined;

  try {
    const response = await fetch(url, {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      ...(body && { body }),
    });

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      const message =
        (data &&
          typeof data === "object" &&
          "error" in data &&
          (data as { error?: string }).error) ||
        `HTTP ${response.status}`;
      return { ok: false, status: response.status, error: String(message) };
    }

    return { ok: true, status: response.status, data };
  } catch (error) {
    return {
      ok: false,
      status: 0,
      error: `Network error: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
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
  // There is no provider-admin endpoint to enumerate indexes through the
  // gateway, so this is an honest not-wired preview rather than fabricated data.
  if (options.format === "json") {
    output(
      {
        status: "not_implemented",
        feature: "search indexes",
        reason: "no provider-admin endpoint exposed by the gateway",
      },
      { format: "json" },
    );
  } else {
    status("`search indexes` is a preview — not wired to a backend in this build.", "warn");
    status(
      "Listing indexes requires a provider-admin API the gateway does not expose. " +
        "Use `nebutra search query <index> <term>` to exercise a known index instead.",
      "info",
    );
  }

  process.exit(ExitCode.INCOMPATIBLE);
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
      process.exit(ExitCode.CANCELLED);
    }
  }

  if (!opts.yes && !opts.dryRun && !index) {
    status("Full reindex requires --yes confirmation", "error");
    process.exit(ExitCode.INVALID_ARGS);
  }

  const targetIndex = index || "all";
  status(`Reindexing ${pc.cyan(targetIndex)}...`, "info");

  if (opts.dryRun) {
    status(`Would POST /api/v1/search/sync to reindex ${targetIndex}`, "info");
    return;
  }

  const result = await searchApiFetch("/api/v1/search/sync", {
    method: "POST",
    body: index ? { index } : {},
  });

  if (!result.ok) {
    status(`Reindex failed: ${result.error}`, "error");
    process.exit(ExitCode.NETWORK_ERROR);
  }

  if (opts.format === "json") {
    output(result.data ?? { status: result.status }, { format: "json" });
  } else {
    status(`Reindex dispatched for ${pc.cyan(targetIndex)}`, "success");
    const message =
      result.data &&
      typeof result.data === "object" &&
      "message" in result.data &&
      (result.data as { message?: string }).message;
    if (message) {
      status(String(message), "info");
    }
  }
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

  let filters: Record<string, string | number | boolean> | undefined;
  if (options.filters) {
    try {
      filters = JSON.parse(options.filters) as Record<string, string | number | boolean>;
    } catch (_error) {
      status("--filters must be valid JSON", "error");
      process.exit(ExitCode.INVALID_ARGS);
    }
  }

  const result = await searchApiFetch("/api/v1/search", {
    method: "POST",
    body: {
      index,
      query,
      hitsPerPage: options.limit ?? 10,
      ...(filters && { filters }),
    },
  });

  if (!result.ok) {
    status(`Search failed: ${result.error}`, "error");
    process.exit(ExitCode.NETWORK_ERROR);
  }

  const data = result.data;
  const hits =
    data &&
    typeof data === "object" &&
    "hits" in data &&
    Array.isArray((data as { hits?: unknown }).hits)
      ? (data as { hits: Array<Record<string, unknown>> }).hits
      : [];

  if (options.format === "json") {
    output(data ?? { index, query, hits: [] }, { format: "json" });
  } else {
    status(`Found ${pc.cyan(String(hits.length))} result(s) for "${query}"`, "success");
    for (const hit of hits) {
      const title = hit.title ?? hit.name ?? hit.id ?? "(no title)";
      const score = hit._score ?? hit.score;
      const prefix = score !== undefined ? `${pc.dim(String(score))}: ` : "";
      status(`${prefix}${String(title)}`, "info");
    }
  }
}

/**
 * `nebutra search stats` — Index statistics
 */
async function handleStats(options: SearchCommandOptions): Promise<void> {
  // No provider-admin endpoint exposes index statistics through the gateway,
  // so this is an honest not-wired preview rather than fabricated counts.
  if (options.format === "json") {
    output(
      {
        status: "not_implemented",
        feature: "search stats",
        reason: "no provider-admin endpoint exposed by the gateway",
      },
      { format: "json" },
    );
  } else {
    status("`search stats` is a preview — not wired to a backend in this build.", "warn");
    status(
      "Index statistics require a provider-admin API the gateway does not expose. " +
        "Use `nebutra search status` to confirm provider configuration.",
      "info",
    );
  }

  process.exit(ExitCode.INCOMPATIBLE);
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
