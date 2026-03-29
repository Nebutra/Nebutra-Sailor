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

// ── Factory ─────────────────────────────────────────────────────────────────
export {
  closeNotificationProvider,
  createNotification,
  createNotificationProvider,
  getNotificationProvider,
  setNotificationProvider,
} from "./factory.js";

// ── Providers (tree-shakable direct imports) ────────────────────────────────
export { DirectProvider } from "./providers/direct.js";
export { NovuProvider } from "./providers/novu.js";

// ── Types ───────────────────────────────────────────────────────────────────
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
} from "./types.js";
export {
  NotificationPayloadSchema,
  NotificationPreferenceSchema,
} from "./types.js";
