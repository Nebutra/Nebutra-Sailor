// =============================================================================
// @nebutra/webhooks — Provider-agnostic webhook outbound management
// =============================================================================
// Supports:
//   - Svix          (managed webhook infrastructure)
//   - Custom        (self-hosted with exponential backoff retry)
//
// Usage:
//   import { getWebhooks } from "@nebutra/webhooks";
//
//   const webhooks = await getWebhooks();  // auto-detects provider
//   const endpoint = await webhooks.createEndpoint(tenantId, { url: "https://..." });
//   const messageId = await webhooks.sendEvent({ eventType: "user.created", payload: {...} });
// =============================================================================

// ── Factory ─────────────────────────────────────────────────────────────────
export { closeWebhooks, createWebhooks, getWebhooks, setWebhooks } from "./factory";

// ── Providers (tree-shakable direct imports) ────────────────────────────────
export { CustomProvider } from "./providers/custom";
export { SvixProvider } from "./providers/svix";
export type { VerifyOnceOptions, WebhookReplayGuard, WebhookReplayStore } from "./signing";

// ── Signing ─────────────────────────────────────────────────────────────────
export {
  createReplayGuard,
  formatWebhookSignatureHeader,
  generateSecret,
  InMemoryWebhookReplayStore,
  parseWebhookSignatureHeader,
  signPayload,
  verifyPayload,
} from "./signing";

// ── Types ───────────────────────────────────────────────────────────────────
export {
  type CustomProviderConfig,
  type DeliveryStatus,
  type SvixProviderConfig,
  type WebhookConfig,
  type WebhookDeadLetterDelivery,
  WebhookDeadLetterDeliverySchema,
  type WebhookDeadLetterStore,
  type WebhookDeliveryAttempt,
  WebhookDeliveryAttemptSchema,
  type WebhookEndpoint,
  WebhookEndpointSchema,
  WebhookEventType,
  type WebhookMessage,
  WebhookMessageSchema,
  type WebhookProvider,
  type WebhookProviderType,
} from "./types";
