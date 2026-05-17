import { describe, expect, it, vi } from "vitest";
import { createPrismaNotificationStores } from "../prisma";

type NotificationRecord = {
  id: string;
  userId: string;
  tenantId: string;
  type: string;
  title: string;
  body: string;
  data: Record<string, unknown>;
  read: boolean;
  createdAt: Date;
  updatedAt: Date;
};

type PreferenceRecord = {
  id: string;
  userId: string;
  tenantId: string;
  channel: string;
  enabled: boolean;
  disabledCategories: string[];
  frequency: string;
  createdAt: Date;
  updatedAt: Date;
};

function matchesWhere(
  record: NotificationRecord | PreferenceRecord,
  where: Record<string, unknown> = {},
) {
  return Object.entries(where).every(([key, value]) => {
    const actual = record[key as keyof typeof record];

    if (key === "id" && typeof value === "object" && value && "in" in value) {
      return Array.isArray(value.in) && value.in.includes(actual);
    }

    if (key === "createdAt" && typeof value === "object" && value && "lt" in value) {
      return actual instanceof Date && actual < (value.lt as Date);
    }

    return actual === value;
  });
}

function createPrismaStub() {
  const notifications: NotificationRecord[] = [];
  const preferences: PreferenceRecord[] = [];
  let notificationIndex = 0;
  let preferenceIndex = 0;

  return {
    notification: {
      create: vi.fn(
        async ({ data }: { data: Omit<NotificationRecord, "id" | "createdAt" | "updatedAt"> }) => {
          const now = new Date(
            `2026-05-17T00:00:${String(notificationIndex).padStart(2, "0")}.000Z`,
          );
          notificationIndex += 1;
          const record: NotificationRecord = {
            id: `notif_${notificationIndex}`,
            createdAt: now,
            updatedAt: now,
            ...data,
          };
          notifications.push(record);
          return record;
        },
      ),
      count: vi.fn(
        async ({ where }: { where?: Record<string, unknown> }) =>
          notifications.filter((record) => matchesWhere(record, where)).length,
      ),
      deleteMany: vi.fn(async ({ where }: { where?: Record<string, unknown> }) => {
        const before = notifications.length;
        for (let index = notifications.length - 1; index >= 0; index -= 1) {
          if (matchesWhere(notifications[index] as NotificationRecord, where)) {
            notifications.splice(index, 1);
          }
        }
        return { count: before - notifications.length };
      }),
      findMany: vi.fn(
        async ({
          where,
          skip = 0,
          take,
        }: {
          where?: Record<string, unknown>;
          orderBy?: Record<string, unknown>;
          skip?: number;
          take?: number;
        }) => {
          const result = notifications
            .filter((record) => matchesWhere(record, where))
            .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
          return typeof take === "number" ? result.slice(skip, skip + take) : result.slice(skip);
        },
      ),
      updateMany: vi.fn(
        async ({
          where,
          data,
        }: {
          where?: Record<string, unknown>;
          data: Partial<NotificationRecord>;
        }) => {
          let count = 0;
          for (const record of notifications) {
            if (matchesWhere(record, where)) {
              Object.assign(record, data, { updatedAt: new Date("2026-05-17T01:00:00.000Z") });
              count += 1;
            }
          }
          return { count };
        },
      ),
    },
    notificationPreference: {
      findFirst: vi.fn(
        async ({ where }: { where?: Record<string, unknown> }) =>
          preferences.find((record) => matchesWhere(record, where)) ?? null,
      ),
      findMany: vi.fn(async ({ where }: { where?: Record<string, unknown> }) =>
        preferences
          .filter((record) => matchesWhere(record, where))
          .sort((a, b) => a.channel.localeCompare(b.channel)),
      ),
      upsert: vi.fn(
        async ({
          where,
          create,
          update,
        }: {
          where: { userId_tenantId_channel: { userId: string; tenantId: string; channel: string } };
          create: Omit<PreferenceRecord, "id" | "createdAt" | "updatedAt">;
          update: Partial<PreferenceRecord>;
        }) => {
          const target = where.userId_tenantId_channel;
          const existing = preferences.find((record) => matchesWhere(record, target));

          if (existing) {
            Object.assign(existing, update, { updatedAt: new Date("2026-05-17T01:00:00.000Z") });
            return existing;
          }

          preferenceIndex += 1;
          const now = new Date("2026-05-17T00:00:00.000Z");
          const record: PreferenceRecord = {
            id: `pref_${preferenceIndex}`,
            createdAt: now,
            updatedAt: now,
            ...create,
          };
          preferences.push(record);
          return record;
        },
      ),
    },
  };
}

describe("createPrismaNotificationStores", () => {
  it("persists and reads tenant-scoped in-app notifications through Prisma", async () => {
    const prisma = createPrismaStub();
    const { inAppStore } = createPrismaNotificationStores(prisma);

    const first = await inAppStore.create({
      userId: "user_alpha",
      tenantId: "org_alpha",
      type: "workspace.invitation",
      title: "Workspace invitation",
      body: "You were invited.",
      data: { href: "/settings/team" },
      read: false,
    });
    await inAppStore.create({
      userId: "user_alpha",
      tenantId: "org_beta",
      type: "billing.invoice.paid",
      title: "Invoice paid",
      body: "Different tenant.",
      data: {},
      read: false,
    });
    const second = await inAppStore.create({
      userId: "user_alpha",
      tenantId: "org_alpha",
      type: "billing.invoice.paid",
      title: "Invoice paid",
      body: "Same tenant.",
      data: {},
      read: false,
    });

    await inAppStore.markAsReadBatch([first.id], "user_alpha", "org_alpha");

    const feed = await inAppStore.getByUserId("user_alpha", { limit: 10 }, "org_alpha");

    expect(prisma.notification.updateMany).toHaveBeenCalledWith({
      where: { id: { in: [first.id] }, userId: "user_alpha", tenantId: "org_alpha" },
      data: { read: true },
    });
    expect(feed).toMatchObject({
      total: 2,
      unreadCount: 1,
      notifications: [
        { id: second.id, tenantId: "org_alpha", read: false },
        { id: first.id, tenantId: "org_alpha", read: true },
      ],
    });
  });

  it("merges durable preference overrides with safe default channel preferences", async () => {
    const prisma = createPrismaStub();
    const { preferenceStore } = createPrismaNotificationStores(prisma);

    await preferenceStore.updateBatch(
      "user_alpha",
      [
        {
          channel: "email",
          enabled: false,
          disabledCategories: ["workspace.invitation"],
          frequency: "weekly",
        },
      ],
      "org_alpha",
    );

    const preferences = await preferenceStore.getAll("user_alpha", "org_alpha");
    const email = await preferenceStore.getByChannel("user_alpha", "email", "org_alpha");

    expect(preferences).toHaveLength(5);
    expect(preferences.find((preference) => preference.channel === "in_app")).toMatchObject({
      enabled: true,
      frequency: "immediate",
    });
    expect(email).toMatchObject({
      userId: "user_alpha",
      tenantId: "org_alpha",
      channel: "email",
      enabled: false,
      disabledCategories: ["workspace.invitation"],
      frequency: "weekly",
    });
  });
});
