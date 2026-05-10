/**
 * /api/v1/notifications — Typed notification center routes.
 *
 * Mirrors the Supastarter notification API shape while delegating all behavior
 * to @nebutra/notifications providers and settings helpers.
 */

import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import { toApiError } from "@nebutra/errors";
import {
  buildNotificationPreferenceUpdate,
  getNotificationProvider,
  loadNotificationSettingsSnapshot,
  resolveNotificationRuntimeStatus,
} from "@nebutra/notifications";
import { requireAuth, requireOrganization } from "../../middlewares/tenantContext.js";

export const notificationRoutes = new OpenAPIHono();
notificationRoutes.use("*", requireAuth, requireOrganization);

// ── Schemas ───────────────────────────────────────────────────────────────────

const NotificationChannelSchema = z.enum(["in_app", "email", "push", "sms", "chat"]);
const NotificationFrequencySchema = z.enum(["immediate", "daily", "weekly", "never"]);

const ErrorResponseSchema = z.object({
  error: z.string(),
});

const RuntimeStatusSchema = z.object({
  provider: z.enum(["novu", "direct"]),
  providerLabel: z.string(),
  mode: z.enum(["managed", "self_hosted", "preview", "degraded"]),
  canManagePreferences: z.boolean(),
  canViewInbox: z.boolean(),
  canMarkInboxRead: z.boolean(),
  summary: z.string(),
  reason: z.string().optional(),
  missing: z.array(z.string()),
});

const NotificationPreferenceSchema = z.object({
  userId: z.string(),
  tenantId: z.string().optional(),
  channel: NotificationChannelSchema,
  enabled: z.boolean(),
  disabledCategories: z.array(z.string()).optional(),
  frequency: NotificationFrequencySchema,
  updatedAt: z.string().datetime().optional(),
});

const NotificationItemSchema = z.object({
  id: z.string(),
  userId: z.string(),
  tenantId: z.string().optional(),
  type: z.string(),
  title: z.string(),
  body: z.string(),
  data: z.record(z.string(), z.unknown()).optional(),
  read: z.boolean(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

const NotificationListQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
  unreadOnly: z.coerce.boolean().optional(),
});

const NotificationListResponseSchema = z.object({
  items: z.array(NotificationItemSchema),
  total: z.number().int().nonnegative(),
  unreadCount: z.number().int().nonnegative(),
});

const UnreadCountResponseSchema = z.object({
  count: z.number().int().nonnegative(),
});

const MarkReadRequestSchema = z.object({
  ids: z.array(z.string().min(1)).min(1).max(100),
});

const MutationCountResponseSchema = z.object({
  count: z.number().int().nonnegative(),
});

const ChannelViewSchema = z.object({
  id: NotificationChannelSchema,
  label: z.string(),
  shortLabel: z.string(),
  description: z.string(),
});

const PreferenceCellSchema = z.object({
  channel: NotificationChannelSchema,
  channelLabel: z.string(),
  enabled: z.boolean(),
  editable: z.boolean(),
  supported: z.boolean(),
  reason: z.string().optional(),
});

const PreferenceRowSchema = z.object({
  id: z.string(),
  label: z.string(),
  description: z.string(),
  groupId: z.string(),
  cells: z.array(PreferenceCellSchema),
});

const PreferenceSectionSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  rows: z.array(PreferenceRowSchema),
});

const InboxItemSchema = z.object({
  id: z.string(),
  type: z.string(),
  title: z.string(),
  body: z.string(),
  href: z.string().nullable(),
  read: z.boolean(),
  createdAt: z.string().datetime(),
  groupId: z.string(),
});

const NotificationSettingsResponseSchema = z.object({
  runtime: RuntimeStatusSchema,
  channels: z.array(ChannelViewSchema),
  preferenceSource: z.enum(["provider", "catalog-defaults"]),
  preferences: z.array(NotificationPreferenceSchema),
  sections: z.array(PreferenceSectionSchema),
  inboxSource: z.enum(["provider", "unavailable"]),
  inboxReason: z.string().optional(),
  inboxItems: z.array(InboxItemSchema),
  unreadCount: z.number().int().nonnegative(),
});

const SettingsUpdateRequestSchema = z.object({
  type: z.string().min(1),
  channel: NotificationChannelSchema,
  enabled: z.boolean(),
});

const SettingsUpdateResponseSchema = z.object({
  ok: z.literal(true),
  preference: NotificationPreferenceSchema,
});

// ── Routes ────────────────────────────────────────────────────────────────────

const listRoute = createRoute({
  method: "get",
  path: "/",
  tags: ["Notifications"],
  summary: "List notifications",
  description: "Returns recent in-app notifications for the current user and organization.",
  request: { query: NotificationListQuerySchema },
  responses: {
    200: {
      description: "Notification feed",
      content: { "application/json": { schema: NotificationListResponseSchema } },
    },
    403: {
      description: "Organization membership required",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
    409: {
      description: "Notification inbox is not backed by durable storage",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
    503: {
      description: "Notification provider unavailable",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
  },
});

notificationRoutes.openapi(listRoute, async (c) => {
  const tenant = c.get("tenant");
  const userId = tenant.userId as string;
  const tenantId = tenant.organizationId as string;
  const query = c.req.valid("query");

  try {
    const provider = await getNotificationProvider();
    const runtime = resolveNotificationRuntimeStatus({ provider });
    if (!runtime.canViewInbox) {
      return c.json(
        {
          error:
            runtime.reason ??
            "Notification inbox is read-only until persistent notification storage exists.",
        },
        409,
      );
    }

    const feed = await provider.getInAppNotifications(
      userId,
      {
        limit: query.limit,
        offset: query.offset,
        ...(query.unreadOnly !== undefined ? { unreadOnly: query.unreadOnly } : {}),
      },
      tenantId,
    );

    return c.json(
      {
        items: feed.notifications,
        total: feed.total,
        unreadCount: feed.unreadCount,
      },
      200,
    );
  } catch (err) {
    const apiError = toApiError(err);
    return c.json({ error: apiError.error.message }, 503);
  }
});

const settingsRoute = createRoute({
  method: "get",
  path: "/settings",
  tags: ["Notifications"],
  summary: "Get notification settings",
  responses: {
    200: {
      description: "Notification settings snapshot",
      content: { "application/json": { schema: NotificationSettingsResponseSchema } },
    },
    403: {
      description: "Organization membership required",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
  },
});

notificationRoutes.openapi(settingsRoute, async (c) => {
  const tenant = c.get("tenant");
  const snapshot = await loadNotificationSettingsSnapshot({
    userId: tenant.userId as string,
    tenantId: tenant.organizationId as string,
    inboxLimit: 20,
  });

  return c.json(snapshot, 200);
});

const unreadCountRoute = createRoute({
  method: "get",
  path: "/unread-count",
  tags: ["Notifications"],
  summary: "Unread notification count",
  responses: {
    200: {
      description: "Unread count",
      content: { "application/json": { schema: UnreadCountResponseSchema } },
    },
    403: {
      description: "Organization membership required",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
    409: {
      description: "Notification inbox is not backed by durable storage",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
    503: {
      description: "Notification provider unavailable",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
  },
});

notificationRoutes.openapi(unreadCountRoute, async (c) => {
  const tenant = c.get("tenant");

  try {
    const provider = await getNotificationProvider();
    const runtime = resolveNotificationRuntimeStatus({ provider });
    if (!runtime.canViewInbox) {
      return c.json(
        {
          error:
            runtime.reason ??
            "Notification inbox is read-only until persistent notification storage exists.",
        },
        409,
      );
    }

    const feed = await provider.getInAppNotifications(
      tenant.userId as string,
      { limit: 1, unreadOnly: true },
      tenant.organizationId as string,
    );

    return c.json({ count: feed.unreadCount }, 200);
  } catch (err) {
    const apiError = toApiError(err);
    return c.json({ error: apiError.error.message }, 503);
  }
});

const markReadRoute = createRoute({
  method: "post",
  path: "/mark-read",
  tags: ["Notifications"],
  summary: "Mark notifications as read",
  request: { body: { content: { "application/json": { schema: MarkReadRequestSchema } } } },
  responses: {
    200: {
      description: "Marked notifications count",
      content: { "application/json": { schema: MutationCountResponseSchema } },
    },
    400: {
      description: "Invalid request",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
    403: {
      description: "Organization membership required",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
    409: {
      description: "Notification inbox is not backed by durable storage",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
    503: {
      description: "Notification provider unavailable",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
  },
});

notificationRoutes.openapi(markReadRoute, async (c) => {
  const tenant = c.get("tenant");
  const { ids } = c.req.valid("json");

  try {
    const provider = await getNotificationProvider();
    const runtime = resolveNotificationRuntimeStatus({ provider });
    if (!runtime.canMarkInboxRead) {
      return c.json(
        {
          error:
            runtime.reason ??
            "Inbox state is read-only until persistent notification storage exists.",
        },
        409,
      );
    }

    await provider.markAsReadBatch(ids, tenant.userId as string, tenant.organizationId as string);
    return c.json({ count: ids.length }, 200);
  } catch (err) {
    const apiError = toApiError(err);
    return c.json({ error: apiError.error.message }, 503);
  }
});

const markAllReadRoute = createRoute({
  method: "post",
  path: "/mark-all-read",
  tags: ["Notifications"],
  summary: "Mark all notifications as read",
  responses: {
    200: {
      description: "Marked notifications count",
      content: { "application/json": { schema: MutationCountResponseSchema } },
    },
    403: {
      description: "Organization membership required",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
    409: {
      description: "Notification inbox is not backed by durable storage",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
    503: {
      description: "Notification provider unavailable",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
  },
});

notificationRoutes.openapi(markAllReadRoute, async (c) => {
  const tenant = c.get("tenant");

  try {
    const provider = await getNotificationProvider();
    const runtime = resolveNotificationRuntimeStatus({ provider });
    if (!runtime.canMarkInboxRead) {
      return c.json(
        {
          error:
            runtime.reason ??
            "Inbox state is read-only until persistent notification storage exists.",
        },
        409,
      );
    }

    const count = await provider.markAllAsRead(
      tenant.userId as string,
      tenant.organizationId as string,
    );
    return c.json({ count }, 200);
  } catch (err) {
    const apiError = toApiError(err);
    return c.json({ error: apiError.error.message }, 503);
  }
});

const updateSettingsRoute = createRoute({
  method: "post",
  path: "/settings",
  tags: ["Notifications"],
  summary: "Update notification settings",
  request: { body: { content: { "application/json": { schema: SettingsUpdateRequestSchema } } } },
  responses: {
    200: {
      description: "Updated notification preference",
      content: { "application/json": { schema: SettingsUpdateResponseSchema } },
    },
    400: {
      description: "Invalid request",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
    403: {
      description: "Organization membership required",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
    409: {
      description: "Notification preferences are not backed by durable storage",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
    503: {
      description: "Notification provider unavailable",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
  },
});

notificationRoutes.openapi(updateSettingsRoute, async (c) => {
  const tenant = c.get("tenant");
  const userId = tenant.userId as string;
  const tenantId = tenant.organizationId as string;
  const { type, channel, enabled } = c.req.valid("json");

  try {
    const provider = await getNotificationProvider();
    const runtime = resolveNotificationRuntimeStatus({ provider });
    if (!runtime.canManagePreferences) {
      return c.json(
        {
          error:
            runtime.reason ??
            "Notification preferences are read-only until a persistent provider is connected.",
        },
        409,
      );
    }

    const preferences = await provider.getPreferences(userId, tenantId);
    const update = buildNotificationPreferenceUpdate({
      userId,
      tenantId,
      preferences,
      type,
      channel,
      enabled,
    });

    await provider.updatePreferences(userId, [update], tenantId);
    return c.json({ ok: true as const, preference: update }, 200);
  } catch (err) {
    const apiError = toApiError(err);
    return c.json({ error: apiError.error.message }, 503);
  }
});
