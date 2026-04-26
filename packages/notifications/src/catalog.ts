import type { NotificationChannel } from "./types";

export type NotificationCatalogGroupId = "workspace" | "billing" | "security" | "product";

export type NotificationCatalogTypeId =
  | "workspace.invitation"
  | "workspace.mention"
  | "billing.usage_threshold"
  | "billing.payment_failed"
  | "security.login_alert"
  | "security.role_change"
  | "product.release_digest"
  | "product.incident_update";

export interface NotificationCatalogGroup {
  id: NotificationCatalogGroupId;
  label: string;
  description: string;
}

export interface NotificationCatalogEntry {
  id: NotificationCatalogTypeId;
  groupId: NotificationCatalogGroupId;
  label: string;
  description: string;
  channels: readonly NotificationChannel[];
  defaultChannels: readonly NotificationChannel[];
}

export const NEBUTRA_NOTIFICATION_CHANNELS = [
  {
    id: "in_app",
    label: "Inbox",
    shortLabel: "In-app",
    description: "Visible inside the Nebutra workspace notification feed.",
  },
  {
    id: "email",
    label: "Email",
    shortLabel: "Email",
    description: "Sent to the primary address on your Nebutra account.",
  },
  {
    id: "push",
    label: "Push",
    shortLabel: "Push",
    description: "Browser or device push once a push dispatcher is connected.",
  },
  {
    id: "sms",
    label: "SMS",
    shortLabel: "SMS",
    description: "Reserved for urgent mobile alerts routed through an SMS provider.",
  },
  {
    id: "chat",
    label: "Chat",
    shortLabel: "Chat",
    description: "Reserved for Slack, Discord, or other chat destinations.",
  },
] as const satisfies readonly {
  id: NotificationChannel;
  label: string;
  shortLabel: string;
  description: string;
}[];

export const NEBUTRA_NOTIFICATION_SETTINGS_CHANNELS = [
  "in_app",
  "email",
  "push",
] as const satisfies readonly NotificationChannel[];

export const NEBUTRA_NOTIFICATION_GROUPS = [
  {
    id: "workspace",
    label: "Workspace activity",
    description: "Signals about teammates, collaboration, and shared work.",
  },
  {
    id: "billing",
    label: "Billing and usage",
    description: "Revenue, quota, and spend-related alerts that operators usually care about.",
  },
  {
    id: "security",
    label: "Security",
    description: "Account and tenant protection events that should stay high-signal.",
  },
  {
    id: "product",
    label: "Product updates",
    description: "Release notes, incidents, and platform operational updates.",
  },
] as const satisfies readonly NotificationCatalogGroup[];

export const NEBUTRA_NOTIFICATION_CATALOG = [
  {
    id: "workspace.invitation",
    groupId: "workspace",
    label: "Workspace invitations",
    description: "New invites, access approvals, and shared workspace onboarding signals.",
    channels: ["in_app", "email"],
    defaultChannels: ["in_app", "email"],
  },
  {
    id: "workspace.mention",
    groupId: "workspace",
    label: "Mentions and direct assignments",
    description: "When a teammate needs your attention inside a workspace workflow.",
    channels: ["in_app", "email", "push"],
    defaultChannels: ["in_app", "push"],
  },
  {
    id: "billing.usage_threshold",
    groupId: "billing",
    label: "Usage threshold warnings",
    description: "Warnings when seats, credits, or API usage approach configured limits.",
    channels: ["in_app", "email", "push"],
    defaultChannels: ["in_app", "email"],
  },
  {
    id: "billing.payment_failed",
    groupId: "billing",
    label: "Payment failures",
    description: "Delivery failures, renewal issues, or invoice collection problems.",
    channels: ["in_app", "email", "push", "sms"],
    defaultChannels: ["in_app", "email", "push"],
  },
  {
    id: "security.login_alert",
    groupId: "security",
    label: "Suspicious sign-in alerts",
    description: "New devices, risky locations, and security-sensitive authentication events.",
    channels: ["in_app", "email", "push", "sms"],
    defaultChannels: ["in_app", "email", "push"],
  },
  {
    id: "security.role_change",
    groupId: "security",
    label: "Role and access changes",
    description: "Permission changes that alter what you or your team can access.",
    channels: ["in_app", "email"],
    defaultChannels: ["in_app", "email"],
  },
  {
    id: "product.release_digest",
    groupId: "product",
    label: "Release digests",
    description: "New Nebutra capabilities, shipped improvements, and roadmap updates.",
    channels: ["in_app", "email"],
    defaultChannels: ["in_app"],
  },
  {
    id: "product.incident_update",
    groupId: "product",
    label: "Incident and maintenance updates",
    description: "Service incidents, maintenance windows, and platform recovery notices.",
    channels: ["in_app", "email", "push", "chat"],
    defaultChannels: ["in_app", "email"],
  },
] as const satisfies readonly NotificationCatalogEntry[];

export function getNotificationCatalogEntry(id: string): NotificationCatalogEntry | undefined {
  return NEBUTRA_NOTIFICATION_CATALOG.find((entry) => entry.id === id);
}

export function getNotificationCatalogGroup(id: string): NotificationCatalogGroup | undefined {
  return NEBUTRA_NOTIFICATION_GROUPS.find((group) => group.id === id);
}
