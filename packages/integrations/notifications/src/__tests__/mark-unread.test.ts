import { describe, expect, it } from "vitest";
import { NotificationNotFoundError, NotificationUnsupportedOperationError } from "../errors";
import { createPrismaNotificationStores, type PrismaNotificationClient } from "../prisma";
import { DirectProvider } from "../providers/direct";
import type { InAppNotification, InAppNotificationStore } from "../types";

// ── DirectProvider + built-in in-memory store ──────────────────────────────

async function seedNotification(provider: DirectProvider): Promise<string> {
  const result = await provider.send({
    type: "billing.invoice",
    recipientId: "user_1",
    tenantId: "tenant_a",
    channels: ["in_app"],
    data: { title: "Invoice paid", body: "Receipt attached" },
  });

  const inApp = result.channelResults.find((channel) => channel.channel === "in_app");
  if (!inApp?.messageId) throw new Error("in_app dispatch did not return a message id");
  return inApp.messageId;
}

describe("markAsUnread — DirectProvider", () => {
  it("flips a read notification back to unread and restores the unread count", async () => {
    const provider = new DirectProvider({ provider: "direct" });
    const id = await seedNotification(provider);

    await provider.markAsRead(id, "user_1", "tenant_a");
    const afterRead = await provider.getInAppNotifications("user_1", {}, "tenant_a");
    expect(afterRead.unreadCount).toBe(0);
    expect(afterRead.notifications[0]?.read).toBe(true);

    await provider.markAsUnread(id, "user_1", "tenant_a");
    const afterUnread = await provider.getInAppNotifications("user_1", {}, "tenant_a");

    expect(afterUnread.unreadCount).toBe(1);
    expect(afterUnread.notifications[0]?.read).toBe(false);
  });

  it("rejects another tenant's id instead of reporting a write", async () => {
    const provider = new DirectProvider({ provider: "direct" });
    const id = await seedNotification(provider);

    await provider.markAsRead(id, "user_1", "tenant_a");

    await expect(provider.markAsUnread(id, "user_1", "tenant_b")).rejects.toBeInstanceOf(
      NotificationNotFoundError,
    );

    const tenantA = await provider.getInAppNotifications("user_1", {}, "tenant_a");
    expect(tenantA.notifications[0]?.read).toBe(true);
  });

  it("rejects an id that does not exist for the caller", async () => {
    const provider = new DirectProvider({ provider: "direct" });
    await seedNotification(provider);

    await expect(
      provider.markAsUnread("does-not-exist", "user_1", "tenant_a"),
    ).rejects.toBeInstanceOf(NotificationNotFoundError);
  });

  it("throws rather than silently succeeding when the store cannot express unread", async () => {
    const storeWithoutUnread: InAppNotificationStore = {
      async create(notification) {
        const now = new Date().toISOString();
        return { id: "n1", createdAt: now, updatedAt: now, ...notification } as InAppNotification;
      },
      async markAsRead() {},
      async markAsReadBatch() {},
      async getByUserId() {
        return { notifications: [], total: 0, unreadCount: 0 };
      },
      async deleteOld() {
        return 0;
      },
    };

    const provider = new DirectProvider({ provider: "direct", inAppStore: storeWithoutUnread });

    await expect(provider.markAsUnread("n1", "user_1", "tenant_a")).rejects.toBeInstanceOf(
      NotificationUnsupportedOperationError,
    );
  });
});

// ── Prisma-backed store ────────────────────────────────────────────────────

describe("markAsUnread — Prisma in-app store", () => {
  it("writes read: false scoped to the id, user and tenant", async () => {
    const calls: unknown[] = [];
    const prisma = {
      notification: {
        updateMany: async (input: unknown) => {
          calls.push(input);
          return { count: 1 };
        },
      },
      notificationPreference: {},
    } as unknown as PrismaNotificationClient;

    const { inAppStore } = createPrismaNotificationStores(prisma);
    await inAppStore.markAsUnread?.("n1", "user_1", "tenant_a");

    expect(calls).toEqual([
      {
        where: { id: { in: ["n1"] }, userId: "user_1", tenantId: "tenant_a" },
        data: { read: false },
      },
    ]);
  });

  it("throws when the scoped update matches no row", async () => {
    const prisma = {
      notification: {
        updateMany: async () => ({ count: 0 }),
      },
      notificationPreference: {},
    } as unknown as PrismaNotificationClient;

    const { inAppStore } = createPrismaNotificationStores(prisma);

    await expect(inAppStore.markAsUnread?.("n1", "user_1", "tenant_a")).rejects.toBeInstanceOf(
      NotificationNotFoundError,
    );
  });
});
