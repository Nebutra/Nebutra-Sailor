import { logger } from "@nebutra/logger";
import { generateSecret, signPayload, verifyPayload } from "../signing.js";
import type {
  WebhookDeliveryAttempt,
  WebhookEndpoint,
  WebhookMessage,
  WebhookProvider,
} from "../types.js";

// =============================================================================
// Custom Webhook Provider — Self-hosted delivery with exponential backoff
// =============================================================================
// This implementation provides a basic self-hosted webhook solution:
// - Stores endpoints in memory (use a DB in production)
// - Dispatches events via fetch with exponential backoff retry
// - Tracks delivery attempts in memory (use Redis/DB in production)
// - Implements HMAC-SHA256 signing for security
//
// For production, integrate with @nebutra/queue for delivery scheduling
// and a persistent store (Redis, PostgreSQL) for state.
// =============================================================================

interface CustomProviderOptions {
  redisUrl?: string;
  queueProvider?: string;
  webhookBaseUrl?: string;
  maxRetries?: number;
  initialBackoffSec?: number;
}

// In-memory state (dev/test only; use Redis in production)
interface EndpointRecord {
  endpoint: WebhookEndpoint;
  lastDeliveryAt?: Date;
}

interface MessageRecord {
  message: WebhookMessage;
  attempts: Map<string, WebhookDeliveryAttempt[]>; // endpointId -> attempts
}

// Exponential backoff schedule (in seconds)
// 5s, 30s, 2m, 15m, 1h, 6h (6 attempts total)
const BACKOFF_SCHEDULE = [5, 30, 120, 900, 3600, 21600];

export class CustomProvider implements WebhookProvider {
  readonly name = "custom" as const;
  private endpoints: Map<string, EndpointRecord> = new Map();
  private messages: Map<string, MessageRecord> = new Map();
  private maxRetries: number;
  private initialBackoffSec: number;
  private pendingRetries: Map<string, NodeJS.Timeout> = new Map(); // for graceful shutdown

  constructor(options: CustomProviderOptions = {}) {
    this.maxRetries = options.maxRetries ?? 6;
    this.initialBackoffSec = options.initialBackoffSec ?? 5;

    logger.info("[webhooks:custom] Provider initialized", {
      maxRetries: this.maxRetries,
      initialBackoffSec: this.initialBackoffSec,
    });
  }

  async createEndpoint(
    tenantId: string,
    endpoint: Omit<WebhookEndpoint, "id" | "secret" | "createdAt">,
  ): Promise<WebhookEndpoint> {
    const id = `whe_${crypto.randomUUID()}`;
    const secret = generateSecret();
    const createdAt = new Date().toISOString();

    const created: WebhookEndpoint = {
      id,
      url: endpoint.url,
      tenantId,
      secret,
      eventTypes: endpoint.eventTypes ?? [],
      active: endpoint.active ?? true,
      createdAt,
      metadata: endpoint.metadata,
    };

    this.endpoints.set(id, { endpoint: created });
    logger.info("[webhooks:custom] Endpoint created", { endpointId: id, url: endpoint.url });

    return created;
  }

  async updateEndpoint(
    endpointId: string,
    updates: Partial<Omit<WebhookEndpoint, "id" | "secret" | "tenantId" | "createdAt">>,
  ): Promise<WebhookEndpoint> {
    const record = this.endpoints.get(endpointId);
    if (!record) {
      throw new Error(`Endpoint not found: ${endpointId}`);
    }

    const updated: WebhookEndpoint = {
      ...record.endpoint,
      ...updates,
    };

    this.endpoints.set(endpointId, { endpoint: updated });
    logger.info("[webhooks:custom] Endpoint updated", { endpointId });

    return updated;
  }

  async deleteEndpoint(endpointId: string): Promise<void> {
    this.endpoints.delete(endpointId);
    logger.info("[webhooks:custom] Endpoint deleted", { endpointId });
  }

  async listEndpoints(tenantId: string): Promise<WebhookEndpoint[]> {
    const endpoints: WebhookEndpoint[] = [];

    for (const record of this.endpoints.values()) {
      if (record.endpoint.tenantId === tenantId) {
        endpoints.push(record.endpoint);
      }
    }

    return endpoints;
  }

  async sendEvent(event: Omit<WebhookMessage, "id" | "timestamp">): Promise<string> {
    const id = `msg_${crypto.randomUUID()}`;
    const timestamp = new Date().toISOString();

    const message: WebhookMessage = {
      id,
      eventType: event.eventType,
      payload: event.payload,
      timestamp,
      tenantId: event.tenantId,
    };

    // Create message record with empty attempts
    const messageRecord: MessageRecord = {
      message,
      attempts: new Map(),
    };

    this.messages.set(id, messageRecord);

    logger.info("[webhooks:custom] Event created", { messageId: id, eventType: event.eventType });

    // Dispatch to matching endpoints immediately
    this.dispatchEvent(message).catch((err) => {
      logger.error("[webhooks:custom] Error dispatching event", { messageId: id, error: err });
    });

    return id;
  }

  /**
   * Internal: Dispatch an event to all matching endpoints.
   */
  private async dispatchEvent(message: WebhookMessage): Promise<void> {
    const endpoints = await this.listEndpoints(message.tenantId);

    for (const endpoint of endpoints) {
      if (!endpoint.active) continue;

      // Check if endpoint subscribes to this event (empty = all)
      if (endpoint.eventTypes.length > 0 && !endpoint.eventTypes.includes(message.eventType)) {
        continue;
      }

      // Schedule first delivery attempt
      await this.deliverToEndpoint(message, endpoint, 0);
    }
  }

  /**
   * Internal: Attempt delivery to a single endpoint.
   */
  private async deliverToEndpoint(
    message: WebhookMessage,
    endpoint: WebhookEndpoint,
    attemptNumber: number,
  ): Promise<void> {
    const messageRecord = this.messages.get(message.id);
    if (!messageRecord) return;

    const timestamp = Math.floor(Date.now() / 1000).toString();
    const payload = JSON.stringify(message.payload);
    const signature = signPayload(payload, endpoint.secret, timestamp);

    const attempt: WebhookDeliveryAttempt = {
      id: `del_${crypto.randomUUID()}`,
      messageId: message.id,
      endpointId: endpoint.id,
      status: "pending",
      statusCode: null,
      response: null,
      attemptNumber: attemptNumber + 1,
      nextRetryAt: null,
      attemptedAt: new Date().toISOString(),
    };

    // Track attempt
    if (!messageRecord.attempts.has(endpoint.id)) {
      messageRecord.attempts.set(endpoint.id, []);
    }
    messageRecord.attempts.get(endpoint.id)!.push(attempt);

    try {
      const response = await fetch(endpoint.url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Webhook-Signature": `whsec_${endpoint.secret}.${timestamp}.${signature}`,
          "Webhook-ID": message.id,
          "Webhook-Timestamp": timestamp,
        },
        body: payload,
        signal: AbortSignal.timeout(10_000), // 10s timeout
      });

      const responseText = await response.text();

      if (response.ok) {
        attempt.status = "success";
        attempt.statusCode = response.status;
        attempt.response = responseText;
        logger.info("[webhooks:custom] Delivery succeeded", {
          endpointId: endpoint.id,
          messageId: message.id,
          statusCode: response.status,
        });
      } else {
        attempt.status = "failed";
        attempt.statusCode = response.status;
        attempt.response = responseText;
        throw new Error(`HTTP ${response.status}`);
      }
    } catch (error) {
      attempt.status = "failed";
      attempt.response = (error as Error).message;

      // Schedule retry if attempts remaining
      if (attemptNumber < this.maxRetries - 1) {
        const backoffSec =
          BACKOFF_SCHEDULE[attemptNumber] ?? BACKOFF_SCHEDULE[BACKOFF_SCHEDULE.length - 1] ?? 21600;
        const nextRetryAt = new Date(Date.now() + backoffSec * 1000);
        attempt.nextRetryAt = nextRetryAt.toISOString();

        logger.info("[webhooks:custom] Scheduling retry", {
          endpointId: endpoint.id,
          messageId: message.id,
          attemptNumber: attemptNumber + 1,
          backoffSec,
        });

        const retryKey = `${message.id}:${endpoint.id}:${attemptNumber + 1}`;
        const timeoutId = setTimeout(() => {
          this.pendingRetries.delete(retryKey);
          this.deliverToEndpoint(message, endpoint, attemptNumber + 1).catch((err) => {
            logger.error("[webhooks:custom] Retry delivery failed", { error: err });
          });
        }, backoffSec * 1000);

        this.pendingRetries.set(retryKey, timeoutId as any);
      }
    }
  }

  async getDeliveryAttempts(messageId: string): Promise<WebhookDeliveryAttempt[]> {
    const messageRecord = this.messages.get(messageId);
    if (!messageRecord) {
      return [];
    }

    const all: WebhookDeliveryAttempt[] = [];
    for (const attempts of messageRecord.attempts.values()) {
      all.push(...attempts);
    }

    return all.sort(
      (a, b) => new Date(a.attemptedAt).getTime() - new Date(b.attemptedAt).getTime(),
    );
  }

  async retryMessage(messageId: string, endpointId: string): Promise<void> {
    const messageRecord = this.messages.get(messageId);
    const endpoint = this.endpoints.get(endpointId);

    if (!messageRecord || !endpoint) {
      throw new Error("Message or endpoint not found");
    }

    logger.info("[webhooks:custom] Manual retry triggered", { messageId, endpointId });

    // Immediately attempt delivery
    await this.deliverToEndpoint(messageRecord.message, endpoint.endpoint, 0);
  }

  async rotateSecret(endpointId: string): Promise<string> {
    const record = this.endpoints.get(endpointId);
    if (!record) {
      throw new Error(`Endpoint not found: ${endpointId}`);
    }

    const newSecret = generateSecret();
    record.endpoint.secret = newSecret;

    logger.info("[webhooks:custom] Secret rotated", { endpointId });
    return newSecret;
  }

  async verifySignature(payload: string, signature: string, secret: string): Promise<boolean> {
    try {
      // Extract timestamp from signature (format: whsec_{secret}.{timestamp}.{sig})
      const header = signature.startsWith("whsec_") ? signature : `whsec_${signature}`;
      const parts = header.split(".");

      if (parts.length !== 3) {
        return false;
      }

      const [, timestamp, sig] = parts as [string, string, string];
      return verifyPayload(payload, sig, secret, timestamp);
    } catch {
      return false;
    }
  }

  async close(): Promise<void> {
    logger.info("[webhooks:custom] Closing provider, clearing pending retries");

    // Clear all pending timeouts
    for (const timeoutId of this.pendingRetries.values()) {
      clearTimeout(timeoutId);
    }

    this.pendingRetries.clear();
    this.endpoints.clear();
    this.messages.clear();
  }
}
