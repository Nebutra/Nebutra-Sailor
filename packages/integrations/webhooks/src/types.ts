import { z } from "zod";

// =============================================================================
// Core Webhook Abstraction — Provider-agnostic webhook management
// =============================================================================

/**
 * Supported webhook provider backends.
 *
 * - `svix`   — Managed webhook infrastructure (recommended)
 * - `custom` — Self-hosted webhook delivery via queue + Redis state
 */
export type WebhookProviderType = "svix" | "custom";

// ── Event Type ──────────────────────────────────────────────────────────────

/**
 * Enumerated webhook event types. Add new events as your system grows.
 */
export enum WebhookEventType {
  // User events
  USER_CREATED = "user.created",
  USER_UPDATED = "user.updated",
  USER_DELETED = "user.deleted",

  // Invoice events
  INVOICE_PAID = "invoice.paid",
  INVOICE_FAILED = "invoice.failed",
  INVOICE_UPDATED = "invoice.updated",

  // Subscription events
  SUBSCRIPTION_CREATED = "subscription.created",
  SUBSCRIPTION_UPDATED = "subscription.updated",
  SUBSCRIPTION_CANCELLED = "subscription.cancelled",

  // Organization events
  ORG_CREATED = "org.created",
  ORG_UPDATED = "org.updated",
  ORG_DELETED = "org.deleted",
}

// ── Webhook Endpoint ────────────────────────────────────────────────────────

export const WebhookEndpointSchema = z.object({
  /** Globally unique endpoint ID (provider-assigned) */
  id: z.string(),

  /** Webhook URL that will receive POST requests */
  url: z.string().url(),

  /** Tenant this endpoint belongs to (for multi-tenancy) */
  tenantId: z.string(),

  /** Secret for HMAC signing — used to verify inbound requests */
  secret: z.string(),

  /** Event types this endpoint subscribes to (empty = all events) */
  eventTypes: z.array(z.string()).default([]),

  /** Whether this endpoint is active */
  active: z.boolean().default(true),

  /** ISO-8601 creation timestamp */
  createdAt: z.string().datetime(),

  /** Optional metadata (custom fields, user notes, etc.) */
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export type WebhookEndpoint = z.infer<typeof WebhookEndpointSchema>;

// ── Webhook Message ────────────────────────────────────────────────────────

export const WebhookMessageSchema = z.object({
  /** Globally unique message ID (auto-generated) */
  id: z.string(),

  /** Event type being dispatched */
  eventType: z.string(),

  /** Serializable event payload */
  payload: z.record(z.string(), z.unknown()),

  /** ISO-8601 event timestamp */
  timestamp: z.string().datetime(),

  /** Tenant this message belongs to (for multi-tenancy) */
  tenantId: z.string(),
});

export type WebhookMessage = z.infer<typeof WebhookMessageSchema>;

// ── Delivery Attempt ────────────────────────────────────────────────────────

export type DeliveryStatus = "success" | "failed" | "pending" | "timeout";

export const WebhookDeliveryAttemptSchema = z.object({
  /** Globally unique delivery attempt ID */
  id: z.string(),

  /** ID of the message being delivered */
  messageId: z.string(),

  /** ID of the target endpoint */
  endpointId: z.string(),

  /** Delivery status */
  status: z.enum(["success", "failed", "pending", "timeout"]),

  /** HTTP status code (if available) */
  statusCode: z.number().int().nullable(),

  /** Response body (truncated to reasonable size) */
  response: z.string().nullable(),

  /** Which attempt number is this (1-based) */
  attemptNumber: z.number().int().min(1),

  /** ISO-8601 timestamp of next retry (if scheduled) */
  nextRetryAt: z.string().datetime().nullable(),

  /** ISO-8601 timestamp of this attempt */
  attemptedAt: z.string().datetime(),
});

export type WebhookDeliveryAttempt = z.infer<typeof WebhookDeliveryAttemptSchema>;

// ── Dead-Letter Delivery ───────────────────────────────────────────────────

export const WebhookDeadLetterDeliverySchema = z.object({
  /** Stable dead-letter record ID */
  id: z.string(),

  /** ID of the message that exhausted delivery attempts */
  messageId: z.string(),

  /** ID of the endpoint that could not be reached */
  endpointId: z.string(),

  /** Tenant this failed delivery belongs to */
  tenantId: z.string(),

  /** Event type that failed delivery */
  eventType: z.string(),

  /** Original serializable event payload */
  payload: z.record(z.string(), z.unknown()),

  /** Final delivery attempt ID */
  finalAttemptId: z.string(),

  /** Final delivery attempt number */
  finalAttemptNumber: z.number().int().min(1),

  /** Final HTTP status code (if available) */
  statusCode: z.number().int().nullable(),

  /** Final failure response or error text */
  response: z.string().nullable(),

  /** ISO-8601 timestamp of the final failed attempt */
  failedAt: z.string().datetime(),

  /** ISO-8601 timestamp when the record entered dead-letter state */
  deadLetteredAt: z.string().datetime(),
});

export type WebhookDeadLetterDelivery = z.infer<typeof WebhookDeadLetterDeliverySchema>;

export interface WebhookDeadLetterStore {
  upsert(record: WebhookDeadLetterDelivery): Promise<void>;
  delete(messageId: string, endpointId: string): Promise<void>;
  list(messageId?: string): Promise<WebhookDeadLetterDelivery[]>;
  clear?(): Promise<void>;
}

// ── Provider Interface ──────────────────────────────────────────────────────

/**
 * Every webhook backend must implement this interface.
 * The factory function (`createWebhooks`) returns a `WebhookProvider`.
 */
export interface WebhookProvider {
  readonly name: WebhookProviderType;

  /**
   * Register a new webhook endpoint for a tenant.
   * Returns the created endpoint with assigned ID and secret.
   */
  createEndpoint(
    tenantId: string,
    endpoint: Omit<WebhookEndpoint, "id" | "secret" | "createdAt">,
  ): Promise<WebhookEndpoint>;

  /**
   * Update an existing endpoint (URL, eventTypes, active status, metadata).
   */
  updateEndpoint(
    endpointId: string,
    updates: Partial<Omit<WebhookEndpoint, "id" | "secret" | "tenantId" | "createdAt">>,
  ): Promise<WebhookEndpoint>;

  /**
   * Delete a webhook endpoint by ID.
   */
  deleteEndpoint(endpointId: string): Promise<void>;

  /**
   * List all endpoints for a tenant.
   */
  listEndpoints(tenantId: string): Promise<WebhookEndpoint[]>;

  /**
   * Dispatch an event to all matching endpoints.
   * Returns the message ID for tracking delivery attempts.
   */
  sendEvent(event: Omit<WebhookMessage, "id" | "timestamp">): Promise<string>;

  /**
   * Get delivery attempt history for a message.
   * Used for observability and debugging.
   */
  getDeliveryAttempts(messageId: string): Promise<WebhookDeliveryAttempt[]>;

  /**
   * Get dead-lettered deliveries after all retry attempts are exhausted.
   * Used for operator review, replay tooling, and incident triage.
   */
  getDeadLetterDeliveries(messageId?: string): Promise<WebhookDeadLetterDelivery[]>;

  /**
   * Manually retry delivery to a specific endpoint.
   * Useful for recovering from transient failures.
   */
  retryMessage(messageId: string, endpointId: string): Promise<void>;

  /**
   * Rotate the signing secret for an endpoint.
   * Returns the new secret.
   */
  rotateSecret(endpointId: string): Promise<string>;

  /**
   * Verify a webhook signature (used by consumers to verify authenticity).
   * Throws if verification fails.
   */
  verifySignature(payload: string, signature: string, secret: string): Promise<boolean>;

  /**
   * Graceful shutdown — drain pending messages, close connections.
   */
  close(): Promise<void>;
}

// ── Factory Config ──────────────────────────────────────────────────────────

export interface SvixProviderConfig {
  provider: "svix";

  /** Svix API key (defaults to `process.env.SVIX_API_KEY`) */
  apiKey?: string;

  /** Optional: Svix server URL (defaults to production) */
  serverUrl?: string;
}

export interface CustomProviderConfig {
  provider: "custom";

  /** Redis connection URL for state persistence (defaults to `process.env.REDIS_URL`) */
  redisUrl?: string;

  /** Queue provider for delivery scheduling (optional, uses memory queue if omitted) */
  queueProvider?: string;

  /** Base URL for webhook delivery retry configuration */
  webhookBaseUrl?: string;

  /** Maximum number of delivery attempts (default: 6) */
  maxRetries?: number;

  /** Initial backoff in seconds (default: 5) */
  initialBackoffSec?: number;

  /** Optional durable dead-letter store adapter for exhausted deliveries. */
  deadLetterStore?: WebhookDeadLetterStore;
}

export type WebhookConfig = SvixProviderConfig | CustomProviderConfig;
