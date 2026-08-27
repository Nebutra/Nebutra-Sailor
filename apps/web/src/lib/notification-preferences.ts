import type { NotificationChannel } from "@nebutra/notifications";

/**
 * Per-channel notification event types presented in the user-facing
 * /settings/notifications matrix. These are the spec-mandated public-facing
 * groupings; they map onto the canonical `@nebutra/notifications` catalog
 * via the actions layer.
 */
export type NotificationEventTypeId =
  | "account.security"
  | "account.billing"
  | "team.invitation"
  | "team.activity"
  | "product.updates"
  | "product.marketing";

export interface NotificationEventTypeDefinition {
  id: NotificationEventTypeId;
  /** i18n key suffix under `settings.notifications.eventTypes.*.label` */
  i18nKey: "security" | "billing" | "invitation" | "activity" | "updates" | "marketing";
  defaultChannels: readonly NotificationChannel[];
}

export interface NotificationChannelDefinition {
  id: NotificationChannel;
  /** i18n key suffix under `settings.notifications.channels.*.label` */
  i18nKey: "in_app" | "email" | "push" | "sms";
  alwaysAvailable: boolean;
  requiresCapability?: keyof NotificationUserCapabilities;
}

export interface NotificationUserCapabilities {
  hasPushSubscription: boolean;
  phoneVerified: boolean;
}

/** Per-event-type, per-channel boolean — `true` = enabled, `false` = paused. */
export type NotificationPreferenceMap = Partial<
  Record<NotificationEventTypeId, Partial<Record<NotificationChannel, boolean>>>
>;

export interface NotificationPreferenceCell {
  channel: NotificationChannel;
  enabled: boolean;
}

export interface NotificationPreferenceRow {
  id: NotificationEventTypeId;
  i18nKey: NotificationEventTypeDefinition["i18nKey"];
  cells: NotificationPreferenceCell[];
}

export interface NotificationPreferenceMatrix {
  channels: NotificationChannelDefinition[];
  rows: NotificationPreferenceRow[];
}

export const DEFAULT_NOTIFICATION_EVENT_TYPES: readonly NotificationEventTypeDefinition[] = [
  {
    id: "account.security",
    i18nKey: "security",
    defaultChannels: ["in_app", "email"],
  },
  {
    id: "account.billing",
    i18nKey: "billing",
    defaultChannels: ["in_app", "email"],
  },
  {
    id: "team.invitation",
    i18nKey: "invitation",
    defaultChannels: ["in_app", "email"],
  },
  {
    id: "team.activity",
    i18nKey: "activity",
    defaultChannels: ["in_app"],
  },
  {
    id: "product.updates",
    i18nKey: "updates",
    defaultChannels: ["in_app", "email"],
  },
  {
    id: "product.marketing",
    i18nKey: "marketing",
    defaultChannels: ["email"],
  },
] as const;

export const DEFAULT_NOTIFICATION_CHANNELS: readonly NotificationChannelDefinition[] = [
  { id: "in_app", i18nKey: "in_app", alwaysAvailable: true },
  { id: "email", i18nKey: "email", alwaysAvailable: true },
  {
    id: "push",
    i18nKey: "push",
    alwaysAvailable: false,
    requiresCapability: "hasPushSubscription",
  },
  {
    id: "sms",
    i18nKey: "sms",
    alwaysAvailable: false,
    requiresCapability: "phoneVerified",
  },
] as const;

export function isChannelVisibleForUser(
  channel: NotificationChannelDefinition,
  capabilities: NotificationUserCapabilities,
): boolean {
  if (channel.alwaysAvailable) return true;
  if (!channel.requiresCapability) return true;
  return capabilities[channel.requiresCapability] === true;
}

function resolveCellEnabled(
  preferences: NotificationPreferenceMap,
  eventType: NotificationEventTypeDefinition,
  channel: NotificationChannel,
): boolean {
  const stored = preferences[eventType.id]?.[channel];
  if (typeof stored === "boolean") return stored;
  return eventType.defaultChannels.includes(channel);
}

export function buildPreferenceMatrix(input: {
  preferences: NotificationPreferenceMap;
  capabilities: NotificationUserCapabilities;
}): NotificationPreferenceMatrix {
  const visibleChannels = DEFAULT_NOTIFICATION_CHANNELS.filter((channel) =>
    isChannelVisibleForUser(channel, input.capabilities),
  );

  const rows: NotificationPreferenceRow[] = DEFAULT_NOTIFICATION_EVENT_TYPES.map((eventType) => ({
    id: eventType.id,
    i18nKey: eventType.i18nKey,
    cells: visibleChannels.map((channel) => ({
      channel: channel.id,
      enabled: resolveCellEnabled(input.preferences, eventType, channel.id),
    })),
  }));

  return {
    channels: [...visibleChannels],
    rows,
  };
}

/**
 * Immutable update — produces a new preference map with one cell flipped.
 */
export function togglePreferenceCell(
  preferences: NotificationPreferenceMap,
  eventType: NotificationEventTypeId,
  channel: NotificationChannel,
  enabled: boolean,
): NotificationPreferenceMap {
  return {
    ...preferences,
    [eventType]: {
      ...(preferences[eventType] ?? {}),
      [channel]: enabled,
    },
  };
}

/**
 * Reset preferences for a single event type back to defaults.
 */
export function resetPreferenceRow(
  preferences: NotificationPreferenceMap,
  eventType: NotificationEventTypeId,
): NotificationPreferenceMap {
  const next = { ...preferences };
  delete next[eventType];
  return next;
}

/**
 * Reset all preferences (clears all overrides — every cell falls back to default).
 */
export function resetAllPreferences(): NotificationPreferenceMap {
  return {};
}
