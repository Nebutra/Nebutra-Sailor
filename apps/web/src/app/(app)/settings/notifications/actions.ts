"use server";

import {
  buildNotificationPreferenceUpdate,
  getNotificationCatalogEntry,
  getNotificationProvider,
  type NotificationChannel,
  type NotificationProvider,
  resolveNotificationRuntimeStatus,
} from "@nebutra/notifications";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireOrg } from "@/lib/auth";

const preferenceSchema = z.object({
  locale: z.string().min(1),
  type: z.string().min(1),
  channel: z.enum(["in_app", "email", "push", "sms", "chat"]),
  enabled: z.enum(["true", "false"]).transform((value) => value === "true"),
});

const markReadSchema = z.object({
  locale: z.string().min(1),
  notificationId: z.string().min(1),
  returnTo: z.string().optional(),
});

const markAllReadSchema = z.object({
  locale: z.string().min(1),
  returnTo: z.string().optional(),
});

// Cookie-based i18n: no locale prefix in URLs.
function buildNotificationsPath(params?: Record<string, string | undefined>): string {
  const searchParams = new URLSearchParams();

  for (const [key, value] of Object.entries(params ?? {})) {
    if (value) {
      searchParams.set(key, value);
    }
  }

  const query = searchParams.toString();
  return `/settings/notifications${query ? `?${query}` : ""}`;
}

async function resolveNotificationReturnPath(explicitReturnTo?: string | null) {
  const settingsPath = buildNotificationsPath();
  const candidate = explicitReturnTo ?? (await headers()).get("referer");

  if (!candidate) {
    return settingsPath;
  }

  try {
    const path = candidate.startsWith("/")
      ? candidate
      : `${new URL(candidate).pathname}${new URL(candidate).search}`;

    // Accept any internal path (no locale prefix to check against anymore).
    if (path.startsWith("/") && !path.startsWith("//")) {
      return path;
    }
  } catch {
    return settingsPath;
  }

  return settingsPath;
}

function toPreferenceNotice(type: string, channel: NotificationChannel, enabled: boolean): string {
  const catalogEntry = getNotificationCatalogEntry(type);
  const subject = catalogEntry?.label ?? type;
  const state = enabled ? "enabled" : "paused";
  return `${subject} ${channel.replace("_", " ")} delivery ${state}.`;
}

export async function updateNotificationPreference(formData: FormData): Promise<never> {
  const { userId, orgId } = await requireOrg();

  const parsed = preferenceSchema.safeParse({
    locale: formData.get("locale"),
    type: formData.get("type"),
    channel: formData.get("channel"),
    enabled: formData.get("enabled"),
  });

  const basePath = buildNotificationsPath();

  if (!parsed.success) {
    redirect(buildNotificationsPath({ error: "Invalid notification preference request." }));
  }

  const { type, channel, enabled } = parsed.data;
  const catalogEntry = getNotificationCatalogEntry(type);

  if (!catalogEntry) {
    redirect(buildNotificationsPath({ error: "Unknown notification category." }));
  }

  let provider: NotificationProvider | undefined;
  try {
    provider = await getNotificationProvider();
  } catch {
    redirect(
      buildNotificationsPath({
        error: "Notifications are not configured in this environment yet.",
      }),
    );
  }

  const runtime = resolveNotificationRuntimeStatus({ provider });
  if (!runtime.canManagePreferences) {
    redirect(
      buildNotificationsPath({
        error:
          runtime.reason ??
          "Notification preferences are read-only until a persistent provider is connected.",
      }),
    );
  }

  try {
    if (!provider) {
      redirect(
        buildNotificationsPath({
          error: "Notifications are not configured in this environment yet.",
        }),
      );
    }

    const preferences = await provider.getPreferences(userId, orgId);
    const update = buildNotificationPreferenceUpdate({
      userId,
      tenantId: orgId,
      preferences,
      type,
      channel,
      enabled,
    });

    await provider.updatePreferences(userId, [update], orgId);
  } catch {
    redirect(
      buildNotificationsPath({
        error:
          "Failed to update the notification preference. Try again after the provider is wired.",
      }),
    );
  }

  revalidatePath(basePath);
  redirect(
    buildNotificationsPath({
      notice: toPreferenceNotice(type, channel, enabled),
    }),
  );
}

export async function markNotificationRead(formData: FormData): Promise<never> {
  const { userId, orgId } = await requireOrg();

  const parsed = markReadSchema.safeParse({
    locale: formData.get("locale"),
    notificationId: formData.get("notificationId"),
    returnTo: formData.get("returnTo") || undefined,
  });

  const basePath = buildNotificationsPath();
  const returnPath = await resolveNotificationReturnPath(
    typeof formData.get("returnTo") === "string" ? String(formData.get("returnTo")) : undefined,
  );

  if (!parsed.success) {
    redirect(buildNotificationsPath({ error: "Invalid notification inbox request." }));
  }

  let provider: NotificationProvider | undefined;
  try {
    provider = await getNotificationProvider();
  } catch {
    redirect(
      buildNotificationsPath({
        error: "Notifications are not configured in this environment yet.",
      }),
    );
  }

  const runtime = resolveNotificationRuntimeStatus({ provider });
  if (!runtime.canMarkInboxRead) {
    redirect(
      buildNotificationsPath({
        error:
          runtime.reason ??
          "Inbox state is read-only until persistent notification storage exists.",
      }),
    );
  }

  try {
    if (!provider) {
      redirect(
        buildNotificationsPath({
          error: "Notifications are not configured in this environment yet.",
        }),
      );
    }

    await provider.markAsRead(parsed.data.notificationId, userId, orgId);
  } catch {
    redirect(
      buildNotificationsPath({
        error: "Failed to update inbox state. Try again after the provider is wired.",
      }),
    );
  }

  revalidatePath(basePath);
  if (returnPath !== basePath) {
    revalidatePath(returnPath);
    redirect(returnPath);
  }

  redirect(buildNotificationsPath({ notice: "Notification marked as read." }));
}

export async function markAllNotificationsRead(formData: FormData): Promise<never> {
  const { userId, orgId } = await requireOrg();

  const parsed = markAllReadSchema.safeParse({
    locale: formData.get("locale"),
    returnTo: formData.get("returnTo") || undefined,
  });

  const basePath = buildNotificationsPath();
  const returnPath = await resolveNotificationReturnPath(
    typeof formData.get("returnTo") === "string" ? String(formData.get("returnTo")) : undefined,
  );

  if (!parsed.success) {
    redirect(buildNotificationsPath({ error: "Invalid notification inbox request." }));
  }

  let provider: NotificationProvider | undefined;
  try {
    provider = await getNotificationProvider();
  } catch {
    redirect(
      buildNotificationsPath({
        error: "Notifications are not configured in this environment yet.",
      }),
    );
  }

  const runtime = resolveNotificationRuntimeStatus({ provider });
  if (!runtime.canMarkInboxRead) {
    redirect(
      buildNotificationsPath({
        error:
          runtime.reason ??
          "Inbox state is read-only until persistent notification storage exists.",
      }),
    );
  }

  try {
    if (!provider) {
      redirect(
        buildNotificationsPath({
          error: "Notifications are not configured in this environment yet.",
        }),
      );
    }

    await provider.markAllAsRead(userId, orgId);
  } catch {
    redirect(
      buildNotificationsPath({
        error: "Failed to update inbox state. Try again after the provider is wired.",
      }),
    );
  }

  revalidatePath(basePath);
  if (returnPath !== basePath) {
    revalidatePath(returnPath);
    redirect(returnPath);
  }

  redirect(buildNotificationsPath({ notice: "All notifications marked as read." }));
}
