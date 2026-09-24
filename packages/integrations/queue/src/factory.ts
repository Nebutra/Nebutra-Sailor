import { logger } from "@nebutra/logger";
import { assertProviderAllowed, envPresent, resolveProviderType } from "@nebutra/provider-factory";
import type { QueueConfig, QueueProvider, QueueProviderType } from "./types";

// =============================================================================
// Queue Factory — Provider-agnostic queue creation
// =============================================================================
// The factory resolves the correct provider at runtime based on:
//   1. Explicit config passed to `createQueue()`
//   2. `QUEUE_PROVIDER` environment variable
//   3. Auto-detection based on available env vars
//
// This lets customers switch backends without changing application code.
// =============================================================================

let defaultProvider: QueueProvider | null = null;

// Provider selection is delegated to the shared @nebutra/provider-factory
// primitive (identical precedence + prod-guard across every provider-agnostic
// package); only the instantiation switch below stays queue-specific.
function resolveQueueProvider(explicit?: QueueProviderType): QueueProviderType {
  return resolveProviderType<QueueProviderType>({
    explicit,
    envVarName: "QUEUE_PROVIDER",
    detectors: [{ provider: "qstash", when: envPresent("QSTASH_TOKEN") }],
    fallback: "memory",
  });
}

function assertMemoryProviderAllowed(): void {
  assertProviderAllowed("memory", {
    disallowedInProd: ["memory"],
    overrideEnv: "ALLOW_MEMORY_QUEUE_IN_PRODUCTION",
    message:
      "Refusing to use the in-memory queue provider in production. Configure QSTASH_TOKEN, or set ALLOW_MEMORY_QUEUE_IN_PRODUCTION=true for an explicit temporary override.",
  });
}

/**
 * Create a queue provider instance.
 *
 * @example
 * ```ts
 * // Auto-detect from environment
 * const queue = await createQueue();
 *
 * // Explicit QStash
 * const queue = await createQueue({
 *   provider: "qstash",
 *   callbackBaseUrl: "https://api.nebutra.com",
 * });
 * ```
 */
export async function createQueue(config?: QueueConfig): Promise<QueueProvider> {
  const providerType = resolveQueueProvider(config?.provider);

  logger.info("[queue] Creating provider", { provider: providerType });

  switch (providerType) {
    case "qstash": {
      const { QStashProvider } = await import("./providers/qstash");
      const qstashConfig = config as Exclude<QueueConfig, { provider: "memory" }> | undefined;
      return new QStashProvider({
        callbackBaseUrl:
          qstashConfig?.callbackBaseUrl ??
          process.env.QSTASH_CALLBACK_BASE_URL ??
          process.env.API_GATEWAY_URL ??
          "http://localhost:3002",
        ...(qstashConfig?.token !== undefined ? { token: qstashConfig.token } : {}),
        ...(qstashConfig?.currentSigningKey !== undefined
          ? { currentSigningKey: qstashConfig.currentSigningKey }
          : {}),
        ...(qstashConfig?.nextSigningKey !== undefined
          ? { nextSigningKey: qstashConfig.nextSigningKey }
          : {}),
        ...(qstashConfig?.dlqEndpoint !== undefined
          ? { dlqEndpoint: qstashConfig.dlqEndpoint }
          : {}),
        ...(qstashConfig?.dlqFetcher !== undefined ? { dlqFetcher: qstashConfig.dlqFetcher } : {}),
      });
    }

    case "memory": {
      assertMemoryProviderAllowed();
      const { MemoryProvider } = await import("./providers/memory");
      return new MemoryProvider();
    }

    default:
      throw new Error(`Unknown queue provider: ${providerType as string}`);
  }
}

/**
 * Get or create the default (singleton) queue provider.
 * Uses lazy initialisation so import-time side effects are avoided.
 */
export async function getQueue(): Promise<QueueProvider> {
  if (!defaultProvider) {
    defaultProvider = await createQueue();
  }
  return defaultProvider;
}

/**
 * Replace the default queue provider (useful in tests).
 */
export function setQueue(provider: QueueProvider): void {
  defaultProvider = provider;
}

/**
 * Gracefully shut down the default queue provider.
 */
export async function closeQueue(): Promise<void> {
  if (defaultProvider) {
    await defaultProvider.close();
    defaultProvider = null;
  }
}

// =============================================================================
// Convenience: createJob helper
// =============================================================================

import type { JobOptions, JobPayload } from "./types";

/**
 * Build a `JobPayload` with auto-generated ID and timestamp.
 */
export function createJob(
  queue: string,
  type: string,
  data: Record<string, unknown>,
  options?: JobOptions,
): JobPayload {
  return {
    id: crypto.randomUUID(),
    queue,
    type,
    data,
    options,
    createdAt: new Date().toISOString(),
  };
}
