import { logger } from "@nebutra/logger";
import type { WebhookConfig, WebhookProvider, WebhookProviderType } from "./types.js";

// =============================================================================
// Webhook Factory — Provider-agnostic webhook creation
// =============================================================================
// The factory resolves the correct provider at runtime based on:
//   1. Explicit config passed to `createWebhooks()`
//   2. `WEBHOOK_PROVIDER` environment variable
//   3. Auto-detection based on available env vars
//
// This lets customers switch backends without changing application code.
// =============================================================================

let defaultProvider: WebhookProvider | null = null;

/**
 * Detect which provider to use based on available environment variables.
 */
function detectProvider(): WebhookProviderType {
  if (process.env.SVIX_API_KEY) return "svix";
  return "custom";
}

/**
 * Create a webhooks provider instance.
 *
 * @example
 * ```ts
 * // Auto-detect from environment
 * const webhooks = await createWebhooks();
 *
 * // Explicit Svix
 * const webhooks = await createWebhooks({
 *   provider: "svix",
 *   apiKey: "svix_test_...",
 * });
 *
 * // Explicit Custom (self-hosted)
 * const webhooks = await createWebhooks({
 *   provider: "custom",
 *   redisUrl: "redis://localhost:6379",
 *   maxRetries: 6,
 * });
 * ```
 */
export async function createWebhooks(config?: WebhookConfig): Promise<WebhookProvider> {
  const providerType =
    config?.provider ??
    (process.env.WEBHOOK_PROVIDER as WebhookProviderType | undefined) ??
    detectProvider();

  logger.info("[webhooks] Creating provider", { provider: providerType });

  switch (providerType) {
    case "svix": {
      const { SvixProvider } = await import("./providers/svix.js");
      const svixConfig = config as Exclude<WebhookConfig, { provider: "custom" }> | undefined;
      return new SvixProvider({
        ...(svixConfig?.apiKey !== undefined ? { apiKey: svixConfig.apiKey } : {}),
        ...((svixConfig as any)?.serverUrl !== undefined
          ? { serverUrl: (svixConfig as any).serverUrl }
          : {}),
      });
    }

    case "custom": {
      const { CustomProvider } = await import("./providers/custom.js");
      const customConfig = config as Exclude<WebhookConfig, { provider: "svix" }> | undefined;
      return new CustomProvider({
        redisUrl: (customConfig as any)?.redisUrl,
        queueProvider: (customConfig as any)?.queueProvider,
        webhookBaseUrl: (customConfig as any)?.webhookBaseUrl,
        maxRetries: (customConfig as any)?.maxRetries,
        initialBackoffSec: (customConfig as any)?.initialBackoffSec,
      });
    }

    default:
      throw new Error(`Unknown webhook provider: ${providerType as string}`);
  }
}

/**
 * Get or create the default (singleton) webhooks provider.
 * Uses lazy initialisation so import-time side effects are avoided.
 */
export async function getWebhooks(): Promise<WebhookProvider> {
  if (!defaultProvider) {
    defaultProvider = await createWebhooks();
  }
  return defaultProvider;
}

/**
 * Replace the default webhooks provider (useful in tests).
 */
export function setWebhooks(provider: WebhookProvider): void {
  defaultProvider = provider;
}

/**
 * Gracefully shut down the default webhooks provider.
 */
export async function closeWebhooks(): Promise<void> {
  if (defaultProvider) {
    await defaultProvider.close();
    defaultProvider = null;
  }
}
