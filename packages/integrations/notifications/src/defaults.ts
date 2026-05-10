import type { NotificationChannel, NotificationPreference } from "./types";

export const DEFAULT_NOTIFICATION_CHANNELS = [
  "in_app",
  "email",
  "push",
  "sms",
  "chat",
] as const satisfies readonly NotificationChannel[];

export function getDefaultNotificationPreferences(
  userId: string,
  tenantId?: string,
  channels: readonly NotificationChannel[] = DEFAULT_NOTIFICATION_CHANNELS,
): NotificationPreference[] {
  const updatedAt = new Date().toISOString();

  return channels.map((channel) => ({
    userId,
    tenantId,
    channel,
    enabled: true,
    frequency: "immediate",
    updatedAt,
  }));
}
