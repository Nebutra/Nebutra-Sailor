import { z } from "zod";

export const NotificationChannelContractSchema = z.enum(["in_app", "email", "push", "sms", "chat"]);
export type NotificationChannelContract = z.infer<typeof NotificationChannelContractSchema>;

export const NotificationFrequencyContractSchema = z.enum([
  "immediate",
  "daily",
  "weekly",
  "never",
]);
export type NotificationFrequencyContract = z.infer<typeof NotificationFrequencyContractSchema>;

export const NotificationRuntimeStatusContractSchema = z.object({
  provider: z.enum(["novu", "direct"]),
  providerLabel: z.string().min(1),
  mode: z.enum(["managed", "self_hosted", "preview", "degraded"]),
  canManagePreferences: z.boolean(),
  canViewInbox: z.boolean(),
  canMarkInboxRead: z.boolean(),
  summary: z.string().min(1),
  reason: z.string().optional(),
  missing: z.array(z.string()),
});
export type NotificationRuntimeStatusContract = z.infer<
  typeof NotificationRuntimeStatusContractSchema
>;

export const NotificationPreferenceContractSchema = z.object({
  userId: z.string().min(1),
  tenantId: z.string().min(1).optional(),
  channel: NotificationChannelContractSchema,
  enabled: z.boolean(),
  disabledCategories: z.array(z.string()).optional(),
  frequency: NotificationFrequencyContractSchema,
  updatedAt: z.string().datetime().optional(),
});
export type NotificationPreferenceContract = z.infer<typeof NotificationPreferenceContractSchema>;

export const NotificationItemContractSchema = z.object({
  id: z.string().min(1),
  userId: z.string().min(1),
  tenantId: z.string().min(1).optional(),
  type: z.string().min(1),
  title: z.string(),
  body: z.string(),
  data: z.record(z.string(), z.unknown()).optional(),
  read: z.boolean(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type NotificationItemContract = z.infer<typeof NotificationItemContractSchema>;

export const NotificationListQueryContractSchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
  unreadOnly: z.coerce.boolean().optional(),
});
export type NotificationListQueryContract = z.infer<typeof NotificationListQueryContractSchema>;

export const NotificationListResponseContractSchema = z.object({
  items: z.array(NotificationItemContractSchema),
  total: z.number().int().nonnegative(),
  unreadCount: z.number().int().nonnegative(),
});
export type NotificationListResponseContract = z.infer<
  typeof NotificationListResponseContractSchema
>;

export const NotificationUnreadCountResponseContractSchema = z.object({
  count: z.number().int().nonnegative(),
});
export type NotificationUnreadCountResponseContract = z.infer<
  typeof NotificationUnreadCountResponseContractSchema
>;

export const NotificationMarkReadRequestContractSchema = z.object({
  ids: z.array(z.string().min(1)).min(1).max(100),
});
export type NotificationMarkReadRequestContract = z.infer<
  typeof NotificationMarkReadRequestContractSchema
>;

export const NotificationMutationCountResponseContractSchema = z.object({
  count: z.number().int().nonnegative(),
});
export type NotificationMutationCountResponseContract = z.infer<
  typeof NotificationMutationCountResponseContractSchema
>;

export const NotificationSettingsUpdateRequestContractSchema = z.object({
  type: z.string().min(1),
  channel: NotificationChannelContractSchema,
  enabled: z.boolean(),
});
export type NotificationSettingsUpdateRequestContract = z.infer<
  typeof NotificationSettingsUpdateRequestContractSchema
>;

export const NotificationSettingsUpdateResponseContractSchema = z.object({
  ok: z.literal(true),
  preference: NotificationPreferenceContractSchema,
});
export type NotificationSettingsUpdateResponseContract = z.infer<
  typeof NotificationSettingsUpdateResponseContractSchema
>;
