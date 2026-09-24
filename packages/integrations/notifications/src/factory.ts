import { logger } from "@nebutra/logger";
import type { NotificationConfig, NotificationProvider, NotificationProviderType } from "./types";

// =============================================================================
// Notification Factory — Provider-agnostic notification creation
// =============================================================================
// The factory resolves the correct provider at runtime based on:
//   1. Explicit config passed to `createNotificationProvider()`
//   2. `NOTIFICATION_PROVIDER` environment variable
//   3. Fallback to the direct provider
//
// =============================================================================

let defaultProvider: NotificationProvider | null = null;

/**
 * Detect which provider to use based on available environment variables.
 */
function detectProvider(): NotificationProviderType {
  return "direct";
}

function shouldAllowMemoryDirectProvider(
  config?: Extract<NotificationConfig, { provider: "direct" }>,
): boolean {
  if (process.env.NODE_ENV !== "production") return true;
  if (process.env.ALLOW_MEMORY_NOTIFICATIONS_IN_PRODUCTION === "true") return true;
  return Boolean(config?.inAppStore && config.preferenceStore);
}

/**
 * Create a notification provider instance.
 *
 * @example
 * ```ts
 * // Auto-detect from environment
 * const notifications = await createNotificationProvider();
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
    case "direct": {
      const { DirectProvider } = await import("./providers/direct");
      const directConfig = config;
      if (!shouldAllowMemoryDirectProvider(directConfig)) {
        throw new Error(
          "Refusing to use in-memory notification stores in production. Inject durable direct provider stores, or set ALLOW_MEMORY_NOTIFICATIONS_IN_PRODUCTION=true for an explicit temporary override.",
        );
      }
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
        ...(directConfig?.maxRetries !== undefined ? { maxRetries: directConfig.maxRetries } : {}),
        ...(directConfig?.deliveryObserver !== undefined
          ? { deliveryObserver: directConfig.deliveryObserver }
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

import type { NotificationPayload } from "./types";

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
