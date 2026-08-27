import {
  getNotificationProvider,
  type NotificationChannel,
  type NotificationPreference,
  resolveNotificationRuntimeStatus,
} from "@nebutra/notifications";
import { NextResponse } from "next/server";
import { z } from "zod";
import { requireOrg } from "@/lib/auth";
import {
  DEFAULT_NOTIFICATION_CHANNELS,
  DEFAULT_NOTIFICATION_EVENT_TYPES,
  type NotificationEventTypeId,
  type NotificationPreferenceMap,
} from "@/lib/notification-preferences";

const EVENT_TYPE_IDS = DEFAULT_NOTIFICATION_EVENT_TYPES.map((entry) => entry.id) as [
  NotificationEventTypeId,
  ...NotificationEventTypeId[],
];

const CHANNEL_IDS = DEFAULT_NOTIFICATION_CHANNELS.map((entry) => entry.id) as [
  NotificationChannel,
  ...NotificationChannel[],
];

const patchSchema = z.object({
  eventType: z.enum(EVENT_TYPE_IDS),
  channel: z.enum(CHANNEL_IDS),
  enabled: z.boolean(),
});

/**
 * Convert raw provider preferences (per-channel rows with a `disabledCategories`
 * array) into the per-event-type, per-channel boolean map the client UI uses.
 *
 * The "enabled" semantics: a cell is `true` unless either:
 *  (a) that channel-level preference is disabled / frequency=never, OR
 *  (b) the event type ID is present in `disabledCategories`.
 */
function preferencesToMap(rows: NotificationPreference[]): NotificationPreferenceMap {
  const result: NotificationPreferenceMap = {};

  for (const row of rows) {
    const channel = row.channel;
    const channelEnabled = row.enabled !== false && row.frequency !== "never";
    const disabled = new Set(row.disabledCategories ?? []);

    for (const eventType of EVENT_TYPE_IDS) {
      const cellEnabled = channelEnabled && !disabled.has(eventType);
      const existing = result[eventType] ?? {};
      result[eventType] = {
        ...existing,
        [channel]: cellEnabled,
      };
    }
  }

  return result;
}

function fallbackPreference(
  userId: string,
  tenantId: string,
  channel: NotificationChannel,
): NotificationPreference {
  return {
    userId,
    tenantId,
    channel,
    enabled: true,
    frequency: "immediate",
    disabledCategories: [],
    updatedAt: new Date().toISOString(),
  };
}

export async function GET(_request: Request): Promise<NextResponse> {
  const { userId, orgId } = await requireOrg();

  let providerInstance: Awaited<ReturnType<typeof getNotificationProvider>> | undefined;
  try {
    providerInstance = await getNotificationProvider();
  } catch {
    providerInstance = undefined;
  }

  const runtime = resolveNotificationRuntimeStatus(
    providerInstance ? { provider: providerInstance } : undefined,
  );

  if (!providerInstance || !runtime.canManagePreferences) {
    return NextResponse.json({
      success: true,
      data: {
        preferences: {},
        readOnly: true,
        runtime,
      },
    });
  }

  try {
    const rows = await providerInstance.getPreferences(userId, orgId);
    const preferences = preferencesToMap(rows);

    return NextResponse.json({
      success: true,
      data: {
        preferences,
        readOnly: false,
        runtime,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: "Failed to load notification preferences.",
        details: String(error),
      },
      { status: 500 },
    );
  }
}

export async function PATCH(request: Request): Promise<NextResponse> {
  const { userId, orgId } = await requireOrg();

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: "Invalid notification preference request." },
      { status: 400 },
    );
  }

  let providerInstance: Awaited<ReturnType<typeof getNotificationProvider>> | undefined;
  try {
    providerInstance = await getNotificationProvider();
  } catch {
    return NextResponse.json(
      { success: false, error: "Notifications are not configured." },
      { status: 503 },
    );
  }

  const runtime = resolveNotificationRuntimeStatus(
    providerInstance ? { provider: providerInstance } : undefined,
  );

  if (!providerInstance || !runtime.canManagePreferences) {
    return NextResponse.json(
      {
        success: false,
        error:
          runtime.reason ??
          "Notification preferences are read-only until a persistent provider is connected.",
      },
      { status: 403 },
    );
  }

  const { eventType, channel, enabled } = parsed.data;

  try {
    const existing = await providerInstance.getPreferences(userId, orgId);
    const target =
      existing.find((row) => row.channel === channel) ?? fallbackPreference(userId, orgId, channel);

    const disabledCategories = new Set(target.disabledCategories ?? []);
    if (enabled) {
      disabledCategories.delete(eventType);
    } else {
      disabledCategories.add(eventType);
    }

    const update: NotificationPreference = {
      userId: target.userId,
      tenantId: target.tenantId ?? orgId,
      channel,
      enabled: target.enabled,
      frequency: target.frequency,
      disabledCategories: [...disabledCategories].sort(),
      updatedAt: new Date().toISOString(),
    };

    await providerInstance.updatePreferences(userId, [update], orgId);

    return NextResponse.json({
      success: true,
      data: { eventType, channel, enabled },
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: "Failed to update the notification preference.",
        details: String(error),
      },
      { status: 500 },
    );
  }
}
