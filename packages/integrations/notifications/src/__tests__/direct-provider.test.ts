import { describe, expect, it } from "vitest";
import { createNotification } from "../factory";
import { DirectProvider } from "../providers/direct";
import { resolveNotificationRuntimeStatus } from "../runtime";
import { loadNotificationSettingsSnapshot } from "../settings";
import type {
  InAppFeedOptions,
  InAppFeedResult,
  InAppNotification,
  InAppNotificationStore,
  NotificationPreference,
  PreferenceStore,
} from "../types";

class AdapterPreferenceStore implements PreferenceStore {
  constructor(private readonly preferences: NotificationPreference[]) {}

  async getAll(userId: string, tenantId?: string): Promise<NotificationPreference[]> {
    return this.preferences.filter(
      (preference) => preference.userId === userId && preference.tenantId === tenantId,
    );
  }

  async getByChannel(
    userId: string,
    channel: string,
    tenantId?: string,
  ): Promise<NotificationPreference | null> {
    return (
      this.preferences.find(
        (preference) =>
          preference.userId === userId &&
          preference.tenantId === tenantId &&
          preference.channel === channel,
      ) ?? null
    );
  }

  async updateBatch(
    userId: string,
    preferences: Partial<NotificationPreference>[],
    tenantId?: string,
  ): Promise<void> {
    for (const update of preferences) {
      const index = this.preferences.findIndex(
        (preference) =>
          preference.userId === userId &&
          preference.tenantId === tenantId &&
          preference.channel === update.channel,
      );

      if (index >= 0) {
        const current = this.preferences[index];
        if (!current) {
          continue;
        }

        this.preferences[index] = {
          ...current,
          ...update,
          updatedAt: "2026-04-27T00:00:00.000Z",
        };
      }
    }
  }
}

class AdapterInAppStore implements InAppNotificationStore {
  constructor(private readonly notifications: InAppNotification[]) {}

  async create(
    notification: Omit<InAppNotification, "id" | "createdAt" | "updatedAt">,
  ): Promise<InAppNotification> {
    const created = {
      ...notification,
      id: `notification_${this.notifications.length + 1}`,
      createdAt: "2026-04-27T00:00:00.000Z",
      updatedAt: "2026-04-27T00:00:00.000Z",
    };
    this.notifications.push(created);
    return created;
  }

  async markAsRead(notificationId: string, userId: string, tenantId?: string): Promise<void> {
    const notification = this.notifications.find(
      (item) => item.id === notificationId && item.userId === userId && item.tenantId === tenantId,
    );
    if (notification) {
      notification.read = true;
      notification.updatedAt = "2026-04-27T00:01:00.000Z";
    }
  }

  async markAsReadBatch(
    notificationIds: string[],
    userId: string,
    tenantId?: string,
  ): Promise<void> {
    await Promise.all(notificationIds.map((id) => this.markAsRead(id, userId, tenantId)));
  }

  async getByUserId(
    userId: string,
    options?: InAppFeedOptions,
    tenantId?: string,
  ): Promise<InAppFeedResult> {
    const filtered = this.notifications.filter(
      (notification) => notification.userId === userId && notification.tenantId === tenantId,
    );
    const unread = filtered.filter((notification) => !notification.read);
    const items = options?.unreadOnly ? unread : filtered;

    const offset = options?.offset ?? 0;
    const limit = options?.limit ?? 20;

    return {
      notifications: items.slice(offset, offset + limit),
      total: items.length,
      unreadCount: unread.length,
    };
  }

  async deleteOld(): Promise<number> {
    return 0;
  }
}

describe("DirectProvider", () => {
  it("persists in-app notifications with tenant isolation and read state", async () => {
    const provider = new DirectProvider({ provider: "direct" });

    const result = await provider.send(
      createNotification(
        "invoice.paid",
        "user_1",
        ["in_app"],
        { title: "Invoice paid", body: "Receipt is ready" },
        "tenant_a",
      ),
    );

    expect(result.accepted).toBe(true);
    expect(result.channelResults).toEqual([
      expect.objectContaining({ channel: "in_app", sent: true }),
    ]);

    const tenantAFeed = await provider.getInAppNotifications("user_1", undefined, "tenant_a");
    const tenantBFeed = await provider.getInAppNotifications("user_1", undefined, "tenant_b");

    expect(tenantAFeed.total).toBe(1);
    expect(tenantAFeed.unreadCount).toBe(1);
    expect(tenantAFeed.notifications[0]).toEqual(
      expect.objectContaining({
        tenantId: "tenant_a",
        title: "Invoice paid",
        read: false,
      }),
    );
    expect(tenantBFeed.total).toBe(0);

    const notification = tenantAFeed.notifications[0];
    if (!notification) {
      throw new Error("Expected tenant_a feed to include the created notification");
    }

    await provider.markAsRead(notification.id, "user_1", "tenant_a");

    const updatedFeed = await provider.getInAppNotifications("user_1", undefined, "tenant_a");
    expect(updatedFeed.unreadCount).toBe(0);
    expect(updatedFeed.notifications[0]?.read).toBe(true);
  });

  it("supports provider-level batch and all-read inbox mutations", async () => {
    const provider = new DirectProvider({ provider: "direct" });

    await provider.sendBatch([
      createNotification(
        "workspace.invitation",
        "user_batch",
        ["in_app"],
        {
          title: "Invite 1",
          body: "First invite",
        },
        "tenant_a",
      ),
      createNotification(
        "workspace.mention",
        "user_batch",
        ["in_app"],
        {
          title: "Mention 1",
          body: "First mention",
        },
        "tenant_a",
      ),
      createNotification(
        "workspace.invitation",
        "user_batch",
        ["in_app"],
        {
          title: "Other tenant",
          body: "Should remain unread",
        },
        "tenant_b",
      ),
    ]);

    const tenantAFeed = await provider.getInAppNotifications("user_batch", undefined, "tenant_a");
    const tenantAIds = tenantAFeed.notifications.map((notification) => notification.id);

    const firstTenantANotificationId = tenantAIds[0];
    if (!firstTenantANotificationId) {
      throw new Error("Expected a tenant A notification to mark as read.");
    }

    await provider.markAsReadBatch([firstTenantANotificationId], "user_batch", "tenant_a");

    const afterBatch = await provider.getInAppNotifications("user_batch", undefined, "tenant_a");
    expect(afterBatch.unreadCount).toBe(1);

    const changedCount = await provider.markAllAsRead("user_batch", "tenant_a");
    expect(changedCount).toBe(1);

    const afterAll = await provider.getInAppNotifications("user_batch", undefined, "tenant_a");
    const otherTenant = await provider.getInAppNotifications("user_batch", undefined, "tenant_b");

    expect(afterAll.unreadCount).toBe(0);
    expect(otherTenant.unreadCount).toBe(1);
  });

  it("honors channel preferences before dispatching", async () => {
    const provider = new DirectProvider({ provider: "direct" });

    await provider.updatePreferences(
      "user_2",
      [{ channel: "email", enabled: false, disabledCategories: ["invoice.paid"] }],
      "tenant_a",
    );

    const result = await provider.send(
      createNotification(
        "invoice.paid",
        "user_2",
        ["email"],
        { email: "user@example.com", subject: "Invoice paid", body: "Receipt is ready" },
        "tenant_a",
      ),
    );

    expect(result.accepted).toBe(false);
    expect(result.channelResults).toEqual([
      expect.objectContaining({
        channel: "email",
        sent: false,
        error: "Channel disabled by user",
      }),
    ]);
  });

  it("reports memory runtime for the default fallback provider", () => {
    const provider = new DirectProvider({ provider: "direct" });

    expect(resolveNotificationRuntimeStatus({ provider })).toEqual(
      expect.objectContaining({
        mode: "preview",
        canManagePreferences: false,
        canViewInbox: false,
        missing: ["Persistent preference storage", "Persistent in-app inbox storage"],
      }),
    );
  });

  it("reports self-hosted runtime when durable adapters are injected", async () => {
    const provider = new DirectProvider({
      provider: "direct",
      preferenceStore: new AdapterPreferenceStore([
        {
          userId: "user_3",
          tenantId: "tenant_a",
          channel: "in_app",
          enabled: true,
          frequency: "immediate",
          updatedAt: "2026-04-27T00:00:00.000Z",
        },
      ]),
      inAppStore: new AdapterInAppStore([
        {
          id: "notification_1",
          userId: "user_3",
          tenantId: "tenant_a",
          type: "workspace.invitation",
          title: "Invitation",
          body: "You were invited to Acme.",
          read: false,
          createdAt: "2026-04-27T00:00:00.000Z",
          updatedAt: "2026-04-27T00:00:00.000Z",
        },
      ]),
    });

    expect(resolveNotificationRuntimeStatus({ provider })).toEqual(
      expect.objectContaining({
        mode: "self_hosted",
        canManagePreferences: true,
        canViewInbox: true,
        canMarkInboxRead: true,
        missing: [],
      }),
    );

    const snapshot = await loadNotificationSettingsSnapshot({
      userId: "user_3",
      tenantId: "tenant_a",
      provider,
    });

    expect(snapshot.preferenceSource).toBe("provider");
    expect(snapshot.inboxSource).toBe("provider");
    expect(snapshot.inboxItems).toEqual([
      expect.objectContaining({
        id: "notification_1",
        groupId: "workspace",
        read: false,
      }),
    ]);
  });
});
