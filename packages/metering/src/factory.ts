import { logger } from "@nebutra/logger";
import type {
  ClickHouseProviderConfig,
  MeteringConfig,
  MeteringProvider,
  MeteringProviderType,
} from "./types";

// =============================================================================
// Metering Factory — Provider-agnostic metering creation
// =============================================================================
// The factory resolves the correct provider at runtime based on:
//   1. Explicit config passed to `createMetering()`
//   2. `METERING_PROVIDER` environment variable
//   3. Auto-detection based on available env vars (CLICKHOUSE_HTTP_URL)
//
// This lets customers switch backends without changing application code.
// =============================================================================

let defaultProvider: MeteringProvider | null = null;

/**
 * Detect which provider to use based on available environment variables.
 */
function detectProvider(): MeteringProviderType {
  if (process.env.CLICKHOUSE_HTTP_URL) return "clickhouse";
  return "memory";
}

/**
 * Create a metering provider instance.
 *
 * @example
 * ```ts
 * // Auto-detect from environment
 * const metering = await createMetering();
 *
 * // Explicit ClickHouse
 * const metering = await createMetering({
 *   provider: "clickhouse",
 *   httpUrl: "http://clickhouse.local:8123",
 * });
 *
 * // Explicit memory (dev/test)
 * const metering = await createMetering({
 *   provider: "memory",
 * });
 * ```
 */
export async function createMetering(config?: MeteringConfig): Promise<MeteringProvider> {
  const providerType =
    config?.provider ??
    (process.env.METERING_PROVIDER as MeteringProviderType | undefined) ??
    detectProvider();

  logger.info("[metering] Creating provider", { provider: providerType });

  switch (providerType) {
    case "clickhouse": {
      const { ClickHouseProvider } = await import("./providers/clickhouse");
      const chConfig = config as Exclude<MeteringConfig, { provider: "memory" }> | undefined;
      return new ClickHouseProvider({
        httpUrl: chConfig?.httpUrl,
        username: chConfig?.username,
        password: chConfig?.password,
        database: chConfig?.database,
        batchSize: chConfig?.batchSize,
        flushIntervalMs: chConfig?.flushIntervalMs,
      } as Omit<ClickHouseProviderConfig, "provider">);
    }

    case "memory": {
      const { MemoryProvider } = await import("./providers/memory");
      return new MemoryProvider();
    }

    default:
      throw new Error(`Unknown metering provider: ${providerType as string}`);
  }
}

/**
 * Get or create the default (singleton) metering provider.
 * Uses lazy initialisation so import-time side effects are avoided.
 */
export async function getMetering(): Promise<MeteringProvider> {
  if (!defaultProvider) {
    defaultProvider = await createMetering();
  }
  return defaultProvider;
}

/**
 * Replace the default metering provider (useful in tests).
 */
export function setMetering(provider: MeteringProvider): void {
  defaultProvider = provider;
}

/**
 * Gracefully shut down the default metering provider.
 */
export async function closeMetering(): Promise<void> {
  if (defaultProvider) {
    await defaultProvider.close();
    defaultProvider = null;
  }
}
