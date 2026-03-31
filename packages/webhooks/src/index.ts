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
export { closeWebhooks, createWebhooks, getWebhooks, setWebhooks } from "./factory.js";

// ── Providers (tree-shakable direct imports) ────────────────────────────────
export { CustomProvider } from "./providers/custom.js";
export { SvixProvider } from "./providers/svix.js";

// ── Signing ─────────────────────────────────────────────────────────────────
export {
  formatWebhookSignatureHeader,
  generateSecret,
  parseWebhookSignatureHeader,
  signPayload,
  verifyPayload,
} from "./signing.js";

// ── Types ───────────────────────────────────────────────────────────────────
export {
  type CustomProviderConfig,
  type DeliveryStatus,
  type SvixProviderConfig,
  type WebhookConfig,
  type WebhookDeliveryAttempt,
  WebhookDeliveryAttemptSchema,
  type WebhookEndpoint,
  WebhookEndpointSchema,
  WebhookEventType,
  type WebhookMessage,
  WebhookMessageSchema,
  type WebhookProvider,
  type WebhookProviderType,
} from "./types.js";
