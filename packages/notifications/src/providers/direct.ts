import { logger } from "@nebutra/logger";
import type { NotificationProviderRuntimeMetadata } from "../runtime.js";
import type {
  ChannelResult,
  ChatDispatcher,
  DirectProviderConfig,
  EmailDispatcher,
  InAppFeedOptions,
  InAppFeedResult,
  InAppNotification,
  InAppNotificationStore,
  NotificationChannel,
  NotificationPayload,
  NotificationPreference,
  NotificationProvider,
  NotificationProviderType,
  NotificationResult,
  PreferenceStore,
  PushDispatcher,
  SMSDispatcher,
} from "../types.js";

// =============================================================================
// Direct Provider — Self-hosted notification dispatchers
// =============================================================================
// This provider delegates to pluggable dispatchers for each channel.
// Useful for custom implementations or when you don't want managed infrastructure.
// =============================================================================

export class DirectProvider implements NotificationProvider {
  readonly name: NotificationProviderType = "direct";
  private inAppStore: InAppNotificationStore;
  private emailDispatcher: EmailDispatcher | undefined;
  private pushDispatcher: PushDispatcher | undefined;
  private smsDispatcher: SMSDispatcher | undefined;
  private chatDispatcher: ChatDispatcher | undefined;
  private preferenceStore: PreferenceStore;
  private runtimeMetadata: NotificationProviderRuntimeMetadata;

  constructor(config: DirectProviderConfig) {
    const hasInjectedInAppStore = config.inAppStore !== undefined;
    const hasInjectedPreferenceStore = config.preferenceStore !== undefined;

    this.inAppStore = config.inAppStore ?? new InMemoryInAppStore();
    this.emailDispatcher = config.emailDispatcher;
    this.pushDispatcher = config.pushDispatcher;
    this.smsDispatcher = config.smsDispatcher;
    this.chatDispatcher = config.chatDispatcher;
    this.preferenceStore = config.preferenceStore ?? new InMemoryPreferenceStore();
    this.runtimeMetadata = {
      provider: this.name,
      preferenceStoreMode: hasInjectedPreferenceStore ? "adapter" : "memory",
      inAppStoreMode: hasInjectedInAppStore ? "adapter" : "memory",
    };

    logger.info("[notifications:direct] Provider initialized", {
      hasEmailDispatcher: !!this.emailDispatcher,
      hasPushDispatcher: !!this.pushDispatcher,
      hasSmsDispatcher: !!this.smsDispatcher,
      hasChatDispatcher: !!this.chatDispatcher,
      preferenceStoreMode: this.runtimeMetadata.preferenceStoreMode,
      inAppStoreMode: this.runtimeMetadata.inAppStoreMode,
    });
  }

  /**
   * Expose runtime capabilities so apps can enable writable settings only
   * when durable adapters are explicitly connected.
   */
  getRuntimeMetadata(): NotificationProviderRuntimeMetadata {
    return this.runtimeMetadata;
  }

  /**
   * Send a notification across the requested channels.
   */
  async send(payload: NotificationPayload): Promise<NotificationResult> {
    const notificationId = payload.id ?? crypto.randomUUID();

    logger.info("[notifications:direct] Sending notification", {
      id: notificationId,
      type: payload.type,
      recipientId: payload.recipientId,
      channels: payload.channels,
    });

    // Check preferences — don't send if user has disabled this channel
    const preferences = await this.preferenceStore.getAll(payload.recipientId, payload.tenantId);
    const enabledChannels = new Set(
      preferences
        .filter((p) => p.enabled && !p.disabledCategories?.includes(payload.type))
        .map((p) => p.channel),
    );

    const channelResults = await Promise.all(
      payload.channels.map((channel) =>
        this.dispatchToChannel(channel, payload, notificationId, enabledChannels),
      ),
    );

    const allAccepted = channelResults.every((r) => r.sent);
    const errors = channelResults.flatMap((result) => (result.error ? [result.error] : []));

    return {
      id: notificationId,
      accepted: allAccepted,
      provider: this.name,
      channelResults,
      ...(errors.length > 0 ? { errors } : {}),
    };
  }

  /**
   * Send multiple notifications.
   */
  async sendBatch(payloads: NotificationPayload[]): Promise<NotificationResult[]> {
    logger.info("[notifications:direct] Batch sending", { count: payloads.length });
    return Promise.all(payloads.map((p) => this.send(p)));
  }

  /**
   * Get notification preferences for a user.
   */
  async getPreferences(userId: string, tenantId?: string): Promise<NotificationPreference[]> {
    try {
      const preferences = await this.preferenceStore.getAll(userId, tenantId);
      return preferences;
    } catch (error) {
      logger.warn("[notifications:direct] Failed to get preferences", {
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
      logger.info("[notifications:direct] Updating preferences", {
        userId,
        tenantId,
        count: preferences.length,
      });

      await this.preferenceStore.updateBatch(userId, preferences, tenantId);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      logger.error("[notifications:direct] Failed to update preferences", {
        userId,
        error: errorMessage,
      });
      throw new Error(`Failed to update preferences: ${errorMessage}`);
    }
  }

  /**
   * Mark an in-app notification as read.
   */
  async markAsRead(notificationId: string, userId: string, tenantId?: string): Promise<void> {
    try {
      logger.info("[notifications:direct] Marking as read", {
        notificationId,
        userId,
        tenantId,
      });

      await this.inAppStore.markAsRead(notificationId, userId, tenantId);
    } catch (error) {
      logger.warn("[notifications:direct] Failed to mark as read", {
        error: error instanceof Error ? error.message : "Unknown error",
      });
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
    try {
      logger.info("[notifications:direct] Marking batch as read", {
        count: notificationIds.length,
        userId,
        tenantId,
      });

      await this.inAppStore.markAsReadBatch(notificationIds, userId, tenantId);
    } catch (error) {
      logger.warn("[notifications:direct] Failed to mark batch as read", {
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  /**
   * Mark all unread in-app notifications as read for a user.
   */
  async markAllAsRead(userId: string, tenantId?: string): Promise<number> {
    try {
      logger.info("[notifications:direct] Marking all as read", { userId, tenantId });

      if (this.inAppStore.markAllAsRead) {
        return await this.inAppStore.markAllAsRead(userId, tenantId);
      }

      const feed = await this.inAppStore.getByUserId(
        userId,
        { limit: 1000, unreadOnly: true },
        tenantId,
      );
      await this.inAppStore.markAsReadBatch(
        feed.notifications.map((notification) => notification.id),
        userId,
        tenantId,
      );

      return feed.notifications.length;
    } catch (error) {
      logger.warn("[notifications:direct] Failed to mark all as read", {
        error: error instanceof Error ? error.message : "Unknown error",
      });
      return 0;
    }
  }

  /**
   * Get in-app notifications for a user.
   */
  async getInAppNotifications(
    userId: string,
    options?: InAppFeedOptions,
    tenantId?: string,
  ): Promise<InAppFeedResult> {
    try {
      logger.info("[notifications:direct] Getting in-app feed", {
        userId,
        tenantId,
        limit: options?.limit,
      });

      return await this.inAppStore.getByUserId(userId, options, tenantId);
    } catch (error) {
      logger.error("[notifications:direct] Failed to get in-app feed", {
        userId,
        error: error instanceof Error ? error.message : "Unknown error",
      });

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
    logger.info("[notifications:direct] Closing provider");
    // Clean up any resources held by dispatchers/stores
  }

  // ── Helpers ─────────────────────────────────────────────────────────────

  /**
   * Dispatch to a single channel based on type.
   */
  private async dispatchToChannel(
    channel: NotificationChannel,
    payload: NotificationPayload,
    notificationId: string,
    enabledChannels: Set<string>,
  ): Promise<ChannelResult> {
    const base = { channel } as ChannelResult;

    // Check if channel is enabled
    if (!enabledChannels.has(channel)) {
      logger.debug("[notifications:direct] Channel disabled for user", {
        channel,
        userId: payload.recipientId,
      });
      return { ...base, sent: false, error: "Channel disabled by user" } as ChannelResult;
    }

    try {
      switch (channel) {
        case "in_app":
          return await this.dispatchInApp(base, payload, notificationId);
        case "email":
          return await this.dispatchEmail(base, payload, notificationId);
        case "push":
          return await this.dispatchPush(base, payload, notificationId);
        case "sms":
          return await this.dispatchSMS(base, payload, notificationId);
        case "chat":
          return await this.dispatchChat(base, payload, notificationId);
        default:
          return { ...base, sent: false, error: `Unknown channel: ${channel}` };
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      logger.error("[notifications:direct] Dispatch error", {
        channel,
        error: errorMessage,
      });
      return { ...base, sent: false, error: errorMessage } as ChannelResult;
    }
  }

  private async dispatchInApp(
    base: ChannelResult,
    payload: NotificationPayload,
    _notificationId: string,
  ): Promise<ChannelResult> {
    const title =
      payload.overrides?.in_app?.title ??
      (payload.data.title as string | undefined) ??
      payload.type;
    const body = payload.overrides?.in_app?.body ?? (payload.data.body as string | undefined) ?? "";

    const notification = await this.inAppStore.create({
      userId: payload.recipientId,
      ...(payload.tenantId !== undefined ? { tenantId: payload.tenantId } : {}),
      type: payload.type,
      title,
      body,
      data: payload.data,
      read: false,
    });

    return {
      ...base,
      sent: true,
      messageId: notification.id,
    };
  }

  private async dispatchEmail(
    base: ChannelResult,
    payload: NotificationPayload,
    _notificationId: string,
  ): Promise<ChannelResult> {
    if (!this.emailDispatcher) {
      return { ...base, sent: false, error: "Email dispatcher not configured" };
    }

    const subject =
      payload.overrides?.email?.subject ??
      (payload.data.subject as string | undefined) ??
      payload.type;
    const body = payload.overrides?.email?.body ?? (payload.data.body as string | undefined) ?? "";
    const to =
      (payload.data.email as string | undefined) ?? (payload.data.to as string | undefined) ?? "";

    if (!to) {
      return { ...base, sent: false, error: "No email address provided" };
    }

    const result = await this.emailDispatcher.send(to, subject, body, payload.data.html as string);
    return {
      ...base,
      sent: result.sent,
      ...(result.messageId ? { messageId: result.messageId } : {}),
      ...(result.error ? { error: result.error } : {}),
    };
  }

  private async dispatchPush(
    base: ChannelResult,
    payload: NotificationPayload,
    _notificationId: string,
  ): Promise<ChannelResult> {
    if (!this.pushDispatcher) {
      return { ...base, sent: false, error: "Push dispatcher not configured" };
    }

    const title =
      payload.overrides?.push?.title ?? (payload.data.title as string | undefined) ?? payload.type;
    const body = payload.overrides?.push?.body ?? (payload.data.body as string | undefined) ?? "";

    const result = await this.pushDispatcher.send(
      payload.recipientId,
      title,
      body,
      payload.data as Record<string, string>,
    );
    return {
      ...base,
      sent: result.sent,
      ...(result.messageId ? { messageId: result.messageId } : {}),
      ...(result.error ? { error: result.error } : {}),
    };
  }

  private async dispatchSMS(
    base: ChannelResult,
    payload: NotificationPayload,
    _notificationId: string,
  ): Promise<ChannelResult> {
    if (!this.smsDispatcher) {
      return { ...base, sent: false, error: "SMS dispatcher not configured" };
    }

    const phoneNumber =
      (payload.data.phone as string | undefined) ??
      (payload.data.phoneNumber as string | undefined) ??
      "";
    const body = payload.overrides?.sms?.body ?? (payload.data.body as string | undefined) ?? "";

    if (!phoneNumber) {
      return { ...base, sent: false, error: "No phone number provided" };
    }

    const result = await this.smsDispatcher.send(phoneNumber, body);
    return {
      ...base,
      sent: result.sent,
      ...(result.messageId ? { messageId: result.messageId } : {}),
      ...(result.error ? { error: result.error } : {}),
    };
  }

  private async dispatchChat(
    base: ChannelResult,
    payload: NotificationPayload,
    _notificationId: string,
  ): Promise<ChannelResult> {
    if (!this.chatDispatcher) {
      return { ...base, sent: false, error: "Chat dispatcher not configured" };
    }

    const webhookUrl = (payload.data.webhookUrl as string | undefined) ?? "";
    const text =
      payload.overrides?.chat?.text ?? (payload.data.text as string | undefined) ?? payload.type;

    if (!webhookUrl) {
      return { ...base, sent: false, error: "No webhook URL provided" };
    }

    const result = await this.chatDispatcher.send(webhookUrl, text, payload.data);
    return {
      ...base,
      sent: result.sent,
      ...(result.messageId ? { messageId: result.messageId } : {}),
      ...(result.error ? { error: result.error } : {}),
    };
  }
}

// ── In-Memory Implementations ───────────────────────────────────────────────

/**
 * In-memory in-app notification store for development/testing.
 * In production, implement this interface with a real database.
 */
class InMemoryInAppStore implements InAppNotificationStore {
  private notifications = new Map<string, InAppNotification[]>();

  async create(
    notification: Omit<InAppNotification, "id" | "createdAt" | "updatedAt">,
  ): Promise<InAppNotification> {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    const full: InAppNotification = {
      id,
      createdAt: now,
      updatedAt: now,
      ...notification,
    };

    const key = `${notification.userId}:${notification.tenantId || "default"}`;
    if (!this.notifications.has(key)) {
      this.notifications.set(key, []);
    }

    this.notifications.get(key)?.push(full);
    return full;
  }

  async markAsRead(notificationId: string, userId: string, tenantId?: string): Promise<void> {
    const key = `${userId}:${tenantId || "default"}`;
    const notifications = this.notifications.get(key) || [];
    const notification = notifications.find((n) => n.id === notificationId);
    if (notification) {
      notification.read = true;
      notification.updatedAt = new Date().toISOString();
    }
  }

  async markAsReadBatch(
    notificationIds: string[],
    userId: string,
    tenantId?: string,
  ): Promise<void> {
    for (const id of notificationIds) {
      await this.markAsRead(id, userId, tenantId);
    }
  }

  async getByUserId(
    userId: string,
    options?: InAppFeedOptions,
    tenantId?: string,
  ): Promise<InAppFeedResult> {
    const key = `${userId}:${tenantId || "default"}`;
    const notifications = (this.notifications.get(key) || []).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );

    const limit = options?.limit ?? 20;
    const offset = options?.offset ?? 0;

    let filtered = notifications;
    if (options?.unreadOnly) {
      filtered = notifications.filter((n) => !n.read);
    }

    const paginated = filtered.slice(offset, offset + limit);
    const unreadCount = notifications.filter((n) => !n.read).length;

    return {
      notifications: paginated,
      total: filtered.length,
      unreadCount,
    };
  }

  async deleteOld(beforeDate: Date, tenantId?: string): Promise<number> {
    let deleted = 0;

    for (const [key, notifications] of this.notifications) {
      if (tenantId && !key.endsWith(tenantId)) continue;

      const before = notifications.filter((n) => new Date(n.createdAt) < beforeDate);
      deleted += before.length;

      this.notifications.set(
        key,
        notifications.filter((n) => new Date(n.createdAt) >= beforeDate),
      );
    }

    return deleted;
  }

  async markAllAsRead(userId: string, tenantId?: string): Promise<number> {
    const key = `${userId}:${tenantId || "default"}`;
    const notifications = this.notifications.get(key) || [];
    let changed = 0;

    for (const notification of notifications) {
      if (!notification.read) {
        notification.read = true;
        notification.updatedAt = new Date().toISOString();
        changed += 1;
      }
    }

    return changed;
  }
}

/**
 * In-memory preference store for development/testing.
 * In production, implement this interface with a real database.
 */
class InMemoryPreferenceStore implements PreferenceStore {
  private preferences = new Map<string, NotificationPreference[]>();

  async getAll(userId: string, tenantId?: string): Promise<NotificationPreference[]> {
    const key = `${userId}:${tenantId || "default"}`;
    return this.preferences.get(key) || getDefaultPreferences(userId, tenantId);
  }

  async getByChannel(
    userId: string,
    channel: string,
    tenantId?: string,
  ): Promise<NotificationPreference | null> {
    const all = await this.getAll(userId, tenantId);
    return all.find((p) => p.channel === channel) || null;
  }

  async updateBatch(
    userId: string,
    preferences: Partial<NotificationPreference>[],
    tenantId?: string,
  ): Promise<void> {
    const key = `${userId}:${tenantId || "default"}`;
    const existing = await this.getAll(userId, tenantId);

    const updated = existing.map((pref) => {
      const update = preferences.find((p) => p.channel === pref.channel);
      return update
        ? {
            ...pref,
            ...update,
            updatedAt: new Date().toISOString(),
          }
        : pref;
    });

    this.preferences.set(key, updated);
  }
}

// ── Utility Functions ───────────────────────────────────────────────────────

function getDefaultPreferences(userId: string, tenantId?: string): NotificationPreference[] {
  const channels: Array<"in_app" | "email" | "push" | "sms" | "chat"> = [
    "in_app",
    "email",
    "push",
    "sms",
    "chat",
  ];

  return channels.map((channel) => ({
    userId,
    tenantId,
    channel,
    enabled: true,
    frequency: "immediate",
    updatedAt: new Date().toISOString(),
  }));
}
