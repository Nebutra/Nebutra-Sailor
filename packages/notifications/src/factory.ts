import { logger } from "@nebutra/logger";
import type {
  NotificationConfig,
  NotificationProvider,
  NotificationProviderType,
} from "./types.js";

// =============================================================================
// Notification Factory — Provider-agnostic notification creation
// =============================================================================
// The factory resolves the correct provider at runtime based on:
//   1. Explicit config passed to `createNotificationProvider()`
//   2. `NOTIFICATION_PROVIDER` environment variable
//   3. Auto-detection based on available env vars (NOVU_API_KEY preferred)
//
// This lets customers switch backends without changing application code.
// =============================================================================

let defaultProvider: NotificationProvider | null = null;

/**
 * Detect which provider to use based on available environment variables.
 */
function detectProvider(): NotificationProviderType {
  if (process.env.NOVU_API_KEY) return "novu";
  return "direct";
}

/**
 * Create a notification provider instance.
 *
 * @example
 * ```ts
 * // Auto-detect from environment
 * const notifications = await createNotificationProvider();
 *
 * // Explicit Novu
 * const notifications = await createNotificationProvider({
 *   provider: "novu",
 *   apiKey: "your-api-key",
 * });
 *
 * // Direct with custom dispatchers
 * const notifications = await createNotificationProvider({
 *   provider: "direct",
 *   emailDispatcher: myEmailService,
 *   inAppStore: myDatabase,
 * });
 * ```
 */
export async function createNotificationProvider(
  config?: NotificationConfig,
): Promise<NotificationProvider> {
  const providerType =
    config?.provider ??
    (process.env.NOTIFICATION_PROVIDER as NotificationProviderType | undefined) ??
    detectProvider();

  logger.info("[notifications] Creating provider", { provider: providerType });

  switch (providerType) {
    case "novu": {
      const { NovuProvider } = await import("./providers/novu.js");
      const novuConfig = config as Exclude<NotificationConfig, { provider: "direct" }> | undefined;
      return new NovuProvider({
        provider: "novu",
        ...(novuConfig?.apiKey !== undefined ? { apiKey: novuConfig.apiKey } : {}),
        ...(novuConfig?.baseUrl !== undefined ? { baseUrl: novuConfig.baseUrl } : {}),
      });
    }

    case "direct": {
      const { DirectProvider } = await import("./providers/direct.js");
      const directConfig = config as Exclude<NotificationConfig, { provider: "novu" }> | undefined;
      return new DirectProvider({
        provider: "direct",
        ...(directConfig?.inAppStore !== undefined ? { inAppStore: directConfig.inAppStore } : {}),
        ...(directConfig?.emailDispatcher !== undefined
          ? { emailDispatcher: directConfig.emailDispatcher }
          : {}),
        ...(directConfig?.pushDispatcher !== undefined
          ? { pushDispatcher: directConfig.pushDispatcher }
          : {}),
        ...(directConfig?.smsDispatcher !== undefined
          ? { smsDispatcher: directConfig.smsDispatcher }
          : {}),
        ...(directConfig?.chatDispatcher !== undefined
          ? { chatDispatcher: directConfig.chatDispatcher }
          : {}),
        ...(directConfig?.preferenceStore !== undefined
          ? { preferenceStore: directConfig.preferenceStore }
          : {}),
      });
    }

    default:
      throw new Error(`Unknown notification provider: ${providerType as string}`);
  }
}

/**
 * Get or create the default (singleton) notification provider.
 * Uses lazy initialisation so import-time side effects are avoided.
 */
export async function getNotificationProvider(): Promise<NotificationProvider> {
  if (!defaultProvider) {
    defaultProvider = await createNotificationProvider();
  }
  return defaultProvider;
}

/**
 * Replace the default notification provider (useful in tests).
 */
export function setNotificationProvider(provider: NotificationProvider): void {
  defaultProvider = provider;
}

/**
 * Gracefully shut down the default notification provider.
 */
export async function closeNotificationProvider(): Promise<void> {
  if (defaultProvider) {
    await defaultProvider.close();
    defaultProvider = null;
  }
}

// =============================================================================
// Convenience: createNotification helper
// =============================================================================

import type { NotificationPayload } from "./types.js";

/**
 * Build a `NotificationPayload` with auto-generated ID.
 */
export function createNotification(
  type: string,
  recipientId: string,
  channels: Array<"in_app" | "email" | "push" | "sms" | "chat">,
  data: Record<string, unknown>,
  tenantId?: string,
): NotificationPayload {
  return {
    id: crypto.randomUUID(),
    type,
    recipientId,
    ...(tenantId !== undefined ? { tenantId } : {}),
    channels,
    data,
  };
}
