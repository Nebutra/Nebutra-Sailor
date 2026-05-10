import { logger } from "@nebutra/logger";
import { Novu } from "@novu/node";
import type {
  InAppFeedOptions,
  InAppFeedResult,
  InAppNotification,
  NotificationChannel,
  NotificationPayload,
  NotificationPreference,
  NotificationProvider,
  NotificationProviderType,
  NotificationResult,
  NovuProviderConfig,
} from "../types.js";

// =============================================================================
// Novu Provider — Managed notification infrastructure
// =============================================================================
// This provider uses Novu's managed platform to handle all notification channels.
// Novu handles template management, delivery guarantees, and preference management.
// =============================================================================

type NovuTriggerResponse = {
  transactionId?: string;
};

type NovuPreferenceValue = {
  enabled?: boolean;
  disabledCategories?: string[];
  frequency?: NotificationPreference["frequency"];
};

type NovuSubscriber = {
  preferences?: Record<string, NovuPreferenceValue>;
};

type NovuSubscribersApi = {
  setPreferences: (
    userId: string,
    preferences: Record<string, { enabled: boolean; disabledCategories: string[] }>,
  ) => Promise<unknown>;
};

type NovuMessageContent = string | { title?: unknown; body?: unknown };

type NovuMessage = {
  _id?: string;
  id?: string;
  templateIdentifier?: string;
  payload?: Record<string, unknown>;
  content?: NovuMessageContent;
  read?: boolean;
  status?: string;
  createdAt?: string;
  updatedAt?: string;
};

type NovuMessagesApi = {
  markAs: (
    notificationId: string,
    payload: { status: "read"; subscriberId: string },
  ) => Promise<unknown>;
  get: (
    userId: string,
    options: { limit: number; offset: number },
  ) => Promise<{
    data?: NovuMessage[];
    totalCount?: number;
  }>;
};

export class NovuProvider implements NotificationProvider {
  readonly name: NotificationProviderType = "novu";
  private novu: Novu;

  constructor(config: NovuProviderConfig) {
    const apiKey = config.apiKey ?? process.env.NOVU_API_KEY;
    if (!apiKey) {
      throw new Error(
        "Novu API key is required. Pass it in config or set NOVU_API_KEY environment variable.",
      );
    }

    // @ts-expect-error Novu SDK config type may vary by version
    this.novu = new Novu(apiKey, {
      ...(config.baseUrl && { baseUrl: config.baseUrl }),
    });

    logger.info("[notifications:novu] Provider initialized");
  }

  /**
   * Send a notification using Novu's trigger API.
   * Maps our NotificationPayload to Novu's trigger format.
   */
  async send(payload: NotificationPayload): Promise<NotificationResult> {
    try {
      const notificationId = payload.id ?? crypto.randomUUID();

      logger.info("[notifications:novu] Sending notification", {
        id: notificationId,
        type: payload.type,
        recipientId: payload.recipientId,
        channels: payload.channels,
      });

      // Novu trigger — sends to all channels configured in the template
      const response = await this.novu.trigger(payload.type, {
        to: {
          subscriberId: payload.recipientId,
          ...(payload.tenantId && { organizationId: payload.tenantId }),
        },
        payload: {
          ...payload.data,
          ...(payload.metadata && { _metadata: payload.metadata }),
        },
        overrides: this.mapOverridesToNovu(payload.overrides),
      });

      const transactionId = (response as NovuTriggerResponse).transactionId;
      const channelResults = payload.channels.map((channel) => ({
        channel,
        sent: true,
        ...(transactionId ? { messageId: transactionId } : {}),
      }));

      return {
        id: notificationId,
        accepted: true,
        provider: this.name,
        channelResults,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      logger.error("[notifications:novu] Failed to send notification", {
        recipientId: payload.recipientId,
        error: errorMessage,
      });

      return {
        id: payload.id ?? crypto.randomUUID(),
        accepted: false,
        provider: this.name,
        channelResults: payload.channels.map((channel) => ({
          channel,
          sent: false,
          error: errorMessage,
        })),
        errors: [errorMessage],
      };
    }
  }

  /**
   * Send multiple notifications.
   * Novu doesn't have a native batch API, so we send sequentially.
   */
  async sendBatch(payloads: NotificationPayload[]): Promise<NotificationResult[]> {
    logger.info("[notifications:novu] Batch sending", { count: payloads.length });
    return Promise.all(payloads.map((p) => this.send(p)));
  }

  /**
   * Get notification preferences for a user from Novu subscriber preferences.
   */
  async getPreferences(userId: string, tenantId?: string): Promise<NotificationPreference[]> {
    try {
      logger.info("[notifications:novu] Getting preferences", { userId, tenantId });

      // Fetch subscriber preferences from Novu
      const subscriber = await this.novu.subscribers.get(userId);

      if (!subscriber) {
        // Return default preferences if subscriber doesn't exist
        return getDefaultPreferences(userId, tenantId);
      }

      // Map Novu subscriber preferences to our format
      const preferences = mapNovuPreferences(asNovuSubscriber(subscriber), userId, tenantId);
      return preferences;
    } catch (error) {
      logger.warn("[notifications:novu] Failed to get preferences, returning defaults", {
        userId,
        error: error instanceof Error ? error.message : "Unknown error",
      });
      return getDefaultPreferences(userId, tenantId);
    }
  }

  /**
   * Update notification preferences for a user.
   */
  async updatePreferences(
    userId: string,
    preferences: Partial<NotificationPreference>[],
    tenantId?: string,
  ): Promise<void> {
    try {
      logger.info("[notifications:novu] Updating preferences", {
        userId,
        tenantId,
        count: preferences.length,
      });

      // Update subscriber preferences in Novu
      const preferencesMap = preferences.reduce(
        (acc, pref) => {
          if (pref.channel) {
            acc[pref.channel] = {
              enabled: pref.enabled ?? true,
              disabledCategories: pref.disabledCategories ?? [],
            };
          }
          return acc;
        },
        {} as Record<string, { enabled: boolean; disabledCategories: string[] }>,
      );

      await (this.novu.subscribers as unknown as NovuSubscribersApi).setPreferences(
        userId,
        preferencesMap,
      );

      logger.info("[notifications:novu] Preferences updated successfully", { userId });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      logger.error("[notifications:novu] Failed to update preferences", {
        userId,
        error: errorMessage,
      });
      throw new Error(`Failed to update preferences: ${errorMessage}`);
    }
  }

  /**
   * Mark an in-app notification as read.
   * Novu stores in-app messages in its notification feed.
   */
  async markAsRead(notificationId: string, userId: string, tenantId?: string): Promise<void> {
    try {
      logger.info("[notifications:novu] Marking as read", {
        notificationId,
        userId,
        tenantId,
      });

      // Mark message as read in Novu
      await (this.novu.messages as unknown as NovuMessagesApi).markAs(notificationId, {
        status: "read",
        subscriberId: userId,
      });

      logger.info("[notifications:novu] Marked as read successfully");
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      logger.warn("[notifications:novu] Failed to mark as read", { error: errorMessage });
      // Don't throw — this is not critical
    }
  }

  /**
   * Mark multiple in-app notifications as read.
   */
  async markAsReadBatch(
    notificationIds: string[],
    userId: string,
    tenantId?: string,
  ): Promise<void> {
    await Promise.all(
      notificationIds.map((notificationId) => this.markAsRead(notificationId, userId, tenantId)),
    );
  }

  /**
   * Mark all unread in-app notifications as read for a user.
   */
  async markAllAsRead(userId: string, tenantId?: string): Promise<number> {
    const feed = await this.getInAppNotifications(
      userId,
      { limit: 100, unreadOnly: true },
      tenantId,
    );
    const unreadIds = feed.notifications
      .filter((notification) => !notification.read)
      .map((notification) => notification.id);

    await this.markAsReadBatch(unreadIds, userId, tenantId);
    return unreadIds.length;
  }

  /**
   * Get in-app notifications for a user from Novu's feed.
   */
  async getInAppNotifications(
    userId: string,
    options?: InAppFeedOptions,
    tenantId?: string,
  ): Promise<InAppFeedResult> {
    try {
      logger.info("[notifications:novu] Getting in-app feed", {
        userId,
        tenantId,
        limit: options?.limit,
        offset: options?.offset,
      });

      const limit = options?.limit ?? 20;
      const offset = options?.offset ?? 0;

      // Fetch subscriber messages (in-app notifications) from Novu
      const messages = await (this.novu.messages as unknown as NovuMessagesApi).get(userId, {
        limit,
        offset,
      });

      const notifications = (messages.data || []).map((msg): InAppNotification => {
        const data = getRecord(msg.payload?.data);

        return {
          id: msg._id ?? msg.id ?? crypto.randomUUID(),
          userId,
          ...(tenantId !== undefined ? { tenantId } : {}),
          type: msg.templateIdentifier ?? "notification",
          title:
            getString(msg.payload?.title) ?? getString(getContentObject(msg.content)?.title) ?? "",
          body:
            getString(msg.payload?.body) ??
            getString(getContentObject(msg.content)?.body) ??
            (typeof msg.content === "string" ? msg.content : ""),
          ...(data ? { data } : {}),
          read: msg.read === true || msg.status === "read",
          createdAt: msg.createdAt || new Date().toISOString(),
          updatedAt: msg.updatedAt || new Date().toISOString(),
        };
      });

      const unreadCount = notifications.filter((notification) => !notification.read).length;

      return {
        notifications: options?.unreadOnly
          ? notifications.filter((notification) => !notification.read)
          : notifications,
        total: messages.totalCount || notifications.length,
        unreadCount,
      };
    } catch (error) {
      logger.error("[notifications:novu] Failed to get in-app feed", {
        userId,
        error: error instanceof Error ? error.message : "Unknown error",
      });

      // Return empty feed on error
      return {
        notifications: [],
        total: 0,
        unreadCount: 0,
      };
    }
  }

  /**
   * Graceful shutdown.
   */
  async close(): Promise<void> {
    logger.info("[notifications:novu] Closing provider");
    // Novu client doesn't need explicit cleanup
  }

  // ── Helpers ─────────────────────────────────────────────────────────────

  /**
   * Map our override format to Novu's override format.
   */
  private mapOverridesToNovu(
    overrides?: NotificationPayload["overrides"],
  ): Record<string, unknown> {
    if (!overrides) return {};

    const mapped: Record<string, unknown> = {};

    if (overrides.email) {
      mapped.email = {
        subject: overrides.email.subject,
        body: overrides.email.body,
      };
    }

    if (overrides.sms) {
      mapped.sms = {
        content: overrides.sms.body,
      };
    }

    if (overrides.push) {
      mapped.push = {
        title: overrides.push.title,
        body: overrides.push.body,
      };
    }

    if (overrides.in_app) {
      mapped.in_app = {
        title: overrides.in_app.title,
        body: overrides.in_app.body,
      };
    }

    if (overrides.chat) {
      mapped.chat = {
        text: overrides.chat.text,
      };
    }

    return mapped;
  }
}

// ── Utility Functions ───────────────────────────────────────────────────────

function getDefaultPreferences(userId: string, tenantId?: string): NotificationPreference[] {
  const channels: NotificationChannel[] = ["in_app", "email", "push", "sms", "chat"];

  return channels.map((channel) => ({
    userId,
    tenantId,
    channel,
    enabled: true,
    frequency: "immediate",
    updatedAt: new Date().toISOString(),
  }));
}

function mapNovuPreferences(
  subscriber: NovuSubscriber,
  userId: string,
  tenantId?: string,
): NotificationPreference[] {
  const preferences = subscriber.preferences || {};

  return Object.entries(preferences).map(([channel, pref]) => ({
    userId,
    tenantId,
    channel: channel as NotificationChannel,
    enabled: pref.enabled ?? true,
    disabledCategories: pref.disabledCategories ?? [],
    frequency: pref.frequency ?? "immediate",
    updatedAt: new Date().toISOString(),
  }));
}

function asNovuSubscriber(value: unknown): NovuSubscriber {
  const responseData = getRecord(getRecord(value)?.data);
  if (responseData) {
    return responseData as NovuSubscriber;
  }

  return (getRecord(value) ?? {}) as NovuSubscriber;
}

function getString(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function getRecord(value: unknown): Record<string, unknown> | undefined {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return undefined;
  }

  return value as Record<string, unknown>;
}

function getContentObject(
  content: NovuMessageContent | undefined,
): { title?: unknown; body?: unknown } | undefined {
  return typeof content === "object" && content !== null ? content : undefined;
}
