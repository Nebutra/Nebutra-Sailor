import { getDefaultNotificationPreferences } from "./defaults";
import type {
  InAppFeedOptions,
  InAppFeedResult,
  InAppNotification,
  InAppNotificationStore,
  NotificationChannel,
  NotificationPreference,
  PreferenceStore,
} from "./types";

type PrismaDate = Date | string;
type PrismaJson = Record<string, unknown> | null;

interface PrismaNotificationRecord {
  id: string;
  userId: string;
  tenantId: string;
  type: string;
  title: string;
  body: string;
  data: PrismaJson;
  read: boolean;
  createdAt: PrismaDate;
  updatedAt: PrismaDate;
}

interface PrismaNotificationPreferenceRecord {
  userId: string;
  tenantId: string;
  channel: string;
  enabled: boolean;
  disabledCategories: string[];
  frequency: string;
  updatedAt: PrismaDate;
}

interface PrismaNotificationDelegate {
  create(input: {
    data: {
      userId: string;
      tenantId: string;
      type: string;
      title: string;
      body: string;
      data: Record<string, unknown>;
      read: boolean;
    };
  }): Promise<PrismaNotificationRecord>;
  count(input: { where: Record<string, unknown> }): Promise<number>;
  deleteMany(input: { where: Record<string, unknown> }): Promise<{ count: number }>;
  findMany(input: {
    where: Record<string, unknown>;
    orderBy?: { createdAt: "desc" };
    skip?: number;
    take?: number;
  }): Promise<PrismaNotificationRecord[]>;
  updateMany(input: {
    where: Record<string, unknown>;
    data: { read: true };
  }): Promise<{ count: number }>;
}

interface PrismaNotificationPreferenceDelegate {
  findFirst(input: {
    where: {
      userId: string;
      tenantId: string;
      channel: NotificationChannel;
    };
  }): Promise<PrismaNotificationPreferenceRecord | null>;
  findMany(input: {
    where: {
      userId: string;
      tenantId: string;
    };
  }): Promise<PrismaNotificationPreferenceRecord[]>;
  upsert(input: {
    where: {
      userId_tenantId_channel: {
        userId: string;
        tenantId: string;
        channel: NotificationChannel;
      };
    };
    create: {
      userId: string;
      tenantId: string;
      channel: NotificationChannel;
      enabled: boolean;
      disabledCategories: string[];
      frequency: NotificationPreference["frequency"];
    };
    update: {
      enabled?: boolean;
      disabledCategories?: string[];
      frequency?: NotificationPreference["frequency"];
    };
  }): Promise<PrismaNotificationPreferenceRecord>;
}

export interface PrismaNotificationClient {
  notification: unknown;
  notificationPreference: unknown;
}

export interface PrismaNotificationStores {
  inAppStore: InAppNotificationStore;
  preferenceStore: PreferenceStore;
}

const EMPTY_TENANT_ID = "";
const NOTIFICATION_CHANNELS: readonly NotificationChannel[] = [
  "in_app",
  "email",
  "push",
  "sms",
  "chat",
];
const NOTIFICATION_FREQUENCIES = new Set<NotificationPreference["frequency"]>([
  "immediate",
  "daily",
  "weekly",
  "never",
]);

function toTenantKey(tenantId?: string): string {
  return tenantId ?? EMPTY_TENANT_ID;
}

function fromTenantKey(tenantId: string): string | undefined {
  return tenantId.length > 0 ? tenantId : undefined;
}

function toIsoString(value: PrismaDate): string {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function toRecord(value: PrismaJson): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function toNotification(record: PrismaNotificationRecord): InAppNotification {
  const tenantId = fromTenantKey(record.tenantId);

  return {
    id: record.id,
    userId: record.userId,
    ...(tenantId !== undefined ? { tenantId } : {}),
    type: record.type,
    title: record.title,
    body: record.body,
    data: toRecord(record.data),
    read: record.read,
    createdAt: toIsoString(record.createdAt),
    updatedAt: toIsoString(record.updatedAt),
  };
}

function toFrequency(value: string): NotificationPreference["frequency"] {
  return NOTIFICATION_FREQUENCIES.has(value as NotificationPreference["frequency"])
    ? (value as NotificationPreference["frequency"])
    : "immediate";
}

function toPreference(record: PrismaNotificationPreferenceRecord): NotificationPreference {
  const tenantId = fromTenantKey(record.tenantId);

  return {
    userId: record.userId,
    ...(tenantId !== undefined ? { tenantId } : {}),
    channel: record.channel as NotificationChannel,
    enabled: record.enabled,
    disabledCategories: record.disabledCategories,
    frequency: toFrequency(record.frequency),
    updatedAt: toIsoString(record.updatedAt),
  };
}

function mergePreferences(
  userId: string,
  tenantId: string | undefined,
  records: PrismaNotificationPreferenceRecord[],
): NotificationPreference[] {
  const overrides = new Map(records.map((record) => [record.channel, toPreference(record)]));

  return getDefaultNotificationPreferences(userId, tenantId, NOTIFICATION_CHANNELS).map(
    (preference) => overrides.get(preference.channel) ?? preference,
  );
}

function createInAppStore(prisma: PrismaNotificationClient): InAppNotificationStore {
  const notificationDelegate = prisma.notification as PrismaNotificationDelegate;

  return {
    async create(notification) {
      const record = await notificationDelegate.create({
        data: {
          userId: notification.userId,
          tenantId: toTenantKey(notification.tenantId),
          type: notification.type,
          title: notification.title,
          body: notification.body,
          data: notification.data ?? {},
          read: notification.read,
        },
      });

      return toNotification(record);
    },

    async deleteOld(beforeDate, tenantId) {
      const result = await notificationDelegate.deleteMany({
        where: {
          createdAt: { lt: beforeDate },
          ...(tenantId !== undefined ? { tenantId: toTenantKey(tenantId) } : {}),
        },
      });

      return result.count;
    },

    async getByUserId(userId, options: InAppFeedOptions = {}, tenantId) {
      const where = {
        userId,
        tenantId: toTenantKey(tenantId),
        ...(options.unreadOnly ? { read: false } : {}),
      };
      const unreadWhere = {
        userId,
        tenantId: toTenantKey(tenantId),
        read: false,
      };

      const [notifications, total, unreadCount] = await Promise.all([
        notificationDelegate.findMany({
          where,
          orderBy: { createdAt: "desc" },
          skip: options.offset ?? 0,
          take: options.limit ?? 20,
        }),
        notificationDelegate.count({ where }),
        notificationDelegate.count({ where: unreadWhere }),
      ]);

      return {
        notifications: notifications.map(toNotification),
        total,
        unreadCount,
      } satisfies InAppFeedResult;
    },

    async markAllAsRead(userId, tenantId) {
      const result = await notificationDelegate.updateMany({
        where: {
          userId,
          tenantId: toTenantKey(tenantId),
          read: false,
        },
        data: { read: true },
      });

      return result.count;
    },

    async markAsRead(notificationId, userId, tenantId) {
      await notificationDelegate.updateMany({
        where: {
          id: { in: [notificationId] },
          userId,
          tenantId: toTenantKey(tenantId),
        },
        data: { read: true },
      });
    },

    async markAsReadBatch(notificationIds, userId, tenantId) {
      if (notificationIds.length === 0) return;

      await notificationDelegate.updateMany({
        where: {
          id: { in: notificationIds },
          userId,
          tenantId: toTenantKey(tenantId),
        },
        data: { read: true },
      });
    },
  };
}

function createPreferenceStore(prisma: PrismaNotificationClient): PreferenceStore {
  const preferenceDelegate = prisma.notificationPreference as PrismaNotificationPreferenceDelegate;

  return {
    async getAll(userId, tenantId) {
      const tenantKey = toTenantKey(tenantId);
      const records = await preferenceDelegate.findMany({
        where: { userId, tenantId: tenantKey },
      });

      return mergePreferences(userId, tenantId, records);
    },

    async getByChannel(userId, channel, tenantId) {
      const record = await preferenceDelegate.findFirst({
        where: { userId, tenantId: toTenantKey(tenantId), channel },
      });

      if (record) return toPreference(record);

      return (
        getDefaultNotificationPreferences(userId, tenantId, NOTIFICATION_CHANNELS).find(
          (preference) => preference.channel === channel,
        ) ?? null
      );
    },

    async updateBatch(userId, preferences, tenantId) {
      const tenantKey = toTenantKey(tenantId);

      await Promise.all(
        preferences.map(async (preference) => {
          if (!preference.channel) return;

          await preferenceDelegate.upsert({
            where: {
              userId_tenantId_channel: {
                userId,
                tenantId: tenantKey,
                channel: preference.channel,
              },
            },
            create: {
              userId,
              tenantId: tenantKey,
              channel: preference.channel,
              enabled: preference.enabled ?? true,
              disabledCategories: preference.disabledCategories ?? [],
              frequency: preference.frequency ?? "immediate",
            },
            update: {
              ...(preference.enabled !== undefined ? { enabled: preference.enabled } : {}),
              ...(preference.disabledCategories !== undefined
                ? { disabledCategories: preference.disabledCategories }
                : {}),
              ...(preference.frequency !== undefined ? { frequency: preference.frequency } : {}),
            },
          });
        }),
      );
    },
  };
}

export function createPrismaNotificationStores(
  prisma: PrismaNotificationClient,
): PrismaNotificationStores {
  return {
    inAppStore: createInAppStore(prisma),
    preferenceStore: createPreferenceStore(prisma),
  };
}
