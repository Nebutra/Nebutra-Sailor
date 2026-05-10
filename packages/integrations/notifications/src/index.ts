// =============================================================================
// @nebutra/notifications — Provider-agnostic notification center
// =============================================================================
// Supports:
//   - Novu          (managed notification infrastructure)
//   - Direct        (self-hosted with pluggable dispatchers)
//
// Usage:
//   import { getNotificationProvider, createNotification } from "@nebutra/notifications";
//
//   const notifier = await getNotificationProvider();
//   await notifier.send(createNotification("invoice.paid", userId, ["email", "in_app"], { ...data }));
// =============================================================================

// ── Types ───────────────────────────────────────────────────────────────────
export type {
  NotificationCatalogEntry,
  NotificationCatalogGroup,
  NotificationCatalogGroupId,
  NotificationCatalogTypeId,
} from "./catalog";
export {
  getNotificationCatalogEntry,
  getNotificationCatalogGroup,
  NEBUTRA_NOTIFICATION_CATALOG,
  NEBUTRA_NOTIFICATION_CHANNELS,
  NEBUTRA_NOTIFICATION_GROUPS,
  NEBUTRA_NOTIFICATION_SETTINGS_CHANNELS,
} from "./catalog";
export { DEFAULT_NOTIFICATION_CHANNELS, getDefaultNotificationPreferences } from "./defaults";
// ── Factory ─────────────────────────────────────────────────────────────────
export {
  closeNotificationProvider,
  createNotification,
  createNotificationProvider,
  getNotificationProvider,
  setNotificationProvider,
} from "./factory";
// ── Providers (tree-shakable direct imports) ────────────────────────────────
export { DirectProvider } from "./providers/direct";
export { NovuProvider } from "./providers/novu";
export type {
  NotificationProviderRuntimeMetadata,
  NotificationRuntimeMode,
  NotificationRuntimeStatus,
} from "./runtime";
export { resolveNotificationRuntimeStatus } from "./runtime";
export type {
  NotificationChannelView,
  NotificationInboxItem,
  NotificationInboxSource,
  NotificationPreferenceCell,
  NotificationPreferenceRow,
  NotificationPreferenceSection,
  NotificationPreferenceSource,
  NotificationSettingsSnapshot,
} from "./settings";
export {
  buildNotificationPreferenceSections,
  buildNotificationPreferenceUpdate,
  loadNotificationSettingsSnapshot,
} from "./settings";
export type {
  ChannelResult,
  ChatDispatcher,
  DirectProviderConfig,
  EmailDispatcher,
  InAppFeedOptions,
  InAppFeedResult,
  InAppNotification,
  InAppNotificationStore,
  NotificationChannel,
  NotificationConfig,
  NotificationPayload,
  NotificationPreference,
  NotificationProvider,
  NotificationProviderType,
  NotificationResult,
  NovuProviderConfig,
  PreferenceStore,
  PushDispatcher,
  SMSDispatcher,
} from "./types";
export {
  NotificationPayloadSchema,
  NotificationPreferenceSchema,
} from "./types";
