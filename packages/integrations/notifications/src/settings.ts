import {
  getNotificationCatalogEntry,
  NEBUTRA_NOTIFICATION_CATALOG,
  NEBUTRA_NOTIFICATION_CHANNELS,
  NEBUTRA_NOTIFICATION_GROUPS,
  type NotificationCatalogEntry,
  type NotificationCatalogGroupId,
} from "./catalog";
import { getDefaultNotificationPreferences } from "./defaults";
import { getNotificationProvider } from "./factory";
import { type NotificationRuntimeStatus, resolveNotificationRuntimeStatus } from "./runtime";
import type {
  InAppNotification,
  NotificationChannel,
  NotificationPreference,
  NotificationProvider,
} from "./types";

export type NotificationPreferenceSource = "provider" | "catalog-defaults";
export type NotificationInboxSource = "provider" | "unavailable";

export interface NotificationChannelView {
  id: NotificationChannel;
  label: string;
  shortLabel: string;
  description: string;
}

export interface NotificationPreferenceCell {
  channel: NotificationChannel;
  channelLabel: string;
  enabled: boolean;
  editable: boolean;
  supported: boolean;
  reason?: string;
}

export interface NotificationPreferenceRow {
  id: string;
  label: string;
  description: string;
  groupId: NotificationCatalogGroupId;
  cells: NotificationPreferenceCell[];
}

export interface NotificationPreferenceSection {
  id: NotificationCatalogGroupId;
  title: string;
  description: string;
  rows: NotificationPreferenceRow[];
}

export interface NotificationInboxItem {
  id: string;
  type: string;
  title: string;
  body: string;
  href: string | null;
  read: boolean;
  createdAt: string;
  groupId: NotificationCatalogGroupId | "other";
}

export interface NotificationSettingsSnapshot {
  runtime: NotificationRuntimeStatus;
  channels: NotificationChannelView[];
  preferenceSource: NotificationPreferenceSource;
  preferences: NotificationPreference[];
  sections: NotificationPreferenceSection[];
  inboxSource: NotificationInboxSource;
  inboxReason?: string;
  inboxItems: NotificationInboxItem[];
  unreadCount: number;
}

function getChannelView(channel: NotificationChannel): NotificationChannelView {
  const definition = NEBUTRA_NOTIFICATION_CHANNELS.find((item) => item.id === channel);
  if (!definition) {
    return {
      id: channel,
      label: channel,
      shortLabel: channel,
      description: "",
    };
  }

  return {
    id: definition.id,
    label: definition.label,
    shortLabel: definition.shortLabel,
    description: definition.description,
  };
}

function getPreferenceForChannel(
  preferences: NotificationPreference[],
  channel: NotificationChannel,
): NotificationPreference | undefined {
  return preferences.find((preference) => preference.channel === channel);
}

function isCategoryEnabled(
  preference: NotificationPreference | undefined,
  categoryId: string,
): boolean {
  if (!preference) return true;
  if (!preference.enabled || preference.frequency === "never") return false;
  return !preference.disabledCategories?.includes(categoryId);
}

function getUnsupportedReason(
  entry: NotificationCatalogEntry,
  channel: NotificationChannel,
  runtime: NotificationRuntimeStatus,
  preference: NotificationPreference | undefined,
): string | undefined {
  if (!entry.channels.some((supportedChannel) => supportedChannel === channel)) {
    return "This signal is not routed through this channel.";
  }

  if (!preference?.enabled || preference?.frequency === "never") {
    return "This delivery channel is currently paused at the channel level.";
  }

  if (!runtime.canManagePreferences) {
    return runtime.reason ?? "Connect a managed or durable notification backend to save changes.";
  }

  return undefined;
}

export function buildNotificationPreferenceSections(input: {
  preferences: NotificationPreference[];
  runtime: NotificationRuntimeStatus;
}): NotificationPreferenceSection[] {
  return NEBUTRA_NOTIFICATION_GROUPS.map((group) => ({
    id: group.id,
    title: group.label,
    description: group.description,
    rows: NEBUTRA_NOTIFICATION_CATALOG.filter((entry) => entry.groupId === group.id).map(
      (entry) => ({
        id: entry.id,
        label: entry.label,
        description: entry.description,
        groupId: entry.groupId,
        cells: NEBUTRA_NOTIFICATION_CHANNELS.map((channel) => {
          const preference = getPreferenceForChannel(input.preferences, channel.id);
          const supported = entry.channels.some(
            (supportedChannel) => supportedChannel === channel.id,
          );
          const editable =
            supported &&
            input.runtime.canManagePreferences &&
            preference?.enabled !== false &&
            preference?.frequency !== "never";
          const reason = getUnsupportedReason(entry, channel.id, input.runtime, preference);

          return {
            channel: channel.id,
            channelLabel: channel.shortLabel,
            enabled: supported ? isCategoryEnabled(preference, entry.id) : false,
            editable,
            supported,
            ...(reason ? { reason } : {}),
          };
        }),
      }),
    ),
  }));
}

function resolveNotificationHref(notification: InAppNotification): string | null {
  const data = notification.data;
  if (!data) return null;
  const href = data.href ?? data.link ?? data.url;
  return typeof href === "string" && href.length > 0 ? href : null;
}

function buildInboxItems(notifications: InAppNotification[]): NotificationInboxItem[] {
  return notifications.map((notification) => {
    const catalogEntry = getNotificationCatalogEntry(notification.type);

    return {
      id: notification.id,
      type: notification.type,
      title: notification.title || catalogEntry?.label || notification.type,
      body: notification.body,
      href: resolveNotificationHref(notification),
      read: notification.read,
      createdAt: notification.createdAt,
      groupId: catalogEntry?.groupId ?? "other",
    };
  });
}

export async function loadNotificationSettingsSnapshot(input: {
  userId: string;
  tenantId?: string;
  provider?: NotificationProvider;
  inboxLimit?: number;
}): Promise<NotificationSettingsSnapshot> {
  let provider = input.provider;

  if (!provider) {
    try {
      provider = await getNotificationProvider();
    } catch {
      provider = undefined;
    }
  }

  const runtime = resolveNotificationRuntimeStatus(provider ? { provider } : undefined);

  let preferenceSource: NotificationPreferenceSource = "catalog-defaults";
  let preferences = getDefaultNotificationPreferences(input.userId, input.tenantId);

  if (provider && runtime.canManagePreferences) {
    try {
      preferences = await provider.getPreferences(input.userId, input.tenantId);
      preferenceSource = "provider";
    } catch {
      preferences = getDefaultNotificationPreferences(input.userId, input.tenantId);
    }
  }

  let inboxSource: NotificationInboxSource = "unavailable";
  let inboxReason = runtime.reason;
  let inboxItems: NotificationInboxItem[] = [];
  let unreadCount = 0;

  if (provider && runtime.canViewInbox) {
    try {
      const feed = await provider.getInAppNotifications(
        input.userId,
        { limit: input.inboxLimit ?? 6 },
        input.tenantId,
      );

      inboxSource = "provider";
      inboxReason = undefined;
      unreadCount = feed.unreadCount;
      inboxItems = buildInboxItems(feed.notifications);
    } catch {
      inboxSource = "unavailable";
      inboxReason = "The notification inbox backend is not ready yet for this environment.";
    }
  }

  return {
    runtime,
    channels: NEBUTRA_NOTIFICATION_CHANNELS.map((channel) => getChannelView(channel.id)),
    preferenceSource,
    preferences,
    sections: buildNotificationPreferenceSections({ preferences, runtime }),
    inboxSource,
    ...(inboxReason ? { inboxReason } : {}),
    inboxItems,
    unreadCount,
  };
}

export function buildNotificationPreferenceUpdate(input: {
  userId: string;
  tenantId?: string;
  preferences: NotificationPreference[];
  type: string;
  channel: NotificationChannel;
  enabled: boolean;
}): NotificationPreference {
  const fallback = getDefaultNotificationPreferences(input.userId, input.tenantId, [
    input.channel,
  ])[0];
  if (!fallback) {
    throw new Error(`Missing default notification preference for channel ${input.channel}`);
  }

  const current = getPreferenceForChannel(input.preferences, input.channel) ?? fallback;

  const disabledCategories = new Set(current.disabledCategories ?? []);
  if (input.enabled) {
    disabledCategories.delete(input.type);
  } else {
    disabledCategories.add(input.type);
  }

  return {
    userId: current.userId,
    ...(current.tenantId ? { tenantId: current.tenantId } : {}),
    channel: current.channel,
    enabled: current.enabled,
    frequency: current.frequency,
    disabledCategories: [...disabledCategories].sort(),
    updatedAt: new Date().toISOString(),
  };
}
