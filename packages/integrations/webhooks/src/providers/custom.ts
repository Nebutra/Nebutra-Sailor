import { logger } from "@nebutra/logger";
import PQueue from "p-queue";
import {
  formatWebhookSignatureHeader,
  generateSecret,
  parseWebhookSignatureHeader,
  signPayload,
  verifyPayload,
} from "../signing";
import type {
  WebhookDeadLetterDelivery,
  WebhookDeadLetterStore,
  WebhookDeliveryAttempt,
  WebhookEndpoint,
  WebhookMessage,
  WebhookProvider,
} from "../types";

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
  deadLetterStore?: WebhookDeadLetterStore;
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
const DELIVERY_CONCURRENCY = 4;

class InMemoryDeadLetterStore implements WebhookDeadLetterStore {
  private records: Map<string, WebhookDeadLetterDelivery> = new Map();

  async upsert(record: WebhookDeadLetterDelivery): Promise<void> {
    this.records.set(this.key(record.messageId, record.endpointId), record);
  }

  async delete(messageId: string, endpointId: string): Promise<void> {
    this.records.delete(this.key(messageId, endpointId));
  }

  async list(messageId?: string): Promise<WebhookDeadLetterDelivery[]> {
    return Array.from(this.records.values()).filter(
      (record) => messageId === undefined || record.messageId === messageId,
    );
  }

  async clear(): Promise<void> {
    this.records.clear();
  }

  private key(messageId: string, endpointId: string): string {
    return `${messageId}:${endpointId}`;
  }
}

export class CustomProvider implements WebhookProvider {
  readonly name = "custom" as const;
  private endpoints: Map<string, EndpointRecord> = new Map();
  private messages: Map<string, MessageRecord> = new Map();
  private deadLetterStore: WebhookDeadLetterStore;
  private ownsDeadLetterStore: boolean;
  private maxRetries: number;
  private initialBackoffSec: number;
  private pendingRetries: Map<string, NodeJS.Timeout> = new Map(); // for graceful shutdown
  private deliveryQueue = new PQueue({ concurrency: DELIVERY_CONCURRENCY });
  private pendingDispatches: Set<Promise<void>> = new Set();

  constructor(options: CustomProviderOptions = {}) {
    this.maxRetries = options.maxRetries ?? 6;
    this.initialBackoffSec = options.initialBackoffSec ?? 5;
    this.deadLetterStore = options.deadLetterStore ?? new InMemoryDeadLetterStore();
    this.ownsDeadLetterStore = options.deadLetterStore === undefined;

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
    const dispatch = this.dispatchEvent(message).catch((err) => {
      logger.error("[webhooks:custom] Error dispatching event", { messageId: id, error: err });
    });
    this.pendingDispatches.add(dispatch);
    void dispatch.finally(() => {
      this.pendingDispatches.delete(dispatch);
    });

    return id;
  }

  /**
   * Internal: Dispatch an event to all matching endpoints.
   */
  private async dispatchEvent(message: WebhookMessage): Promise<void> {
    const endpoints = await this.listEndpoints(message.tenantId);

    await Promise.all(
      endpoints
        .filter((endpoint) => {
          if (!endpoint.active) return false;
          return (
            endpoint.eventTypes.length === 0 || endpoint.eventTypes.includes(message.eventType)
          );
        })
        .map((endpoint) =>
          this.deliveryQueue.add(() => this.deliverToEndpoint(message, endpoint, 0)),
        ),
    );
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
    messageRecord.attempts.get(endpoint.id)?.push(attempt);

    try {
      const response = await fetch(endpoint.url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Webhook-Signature": formatWebhookSignatureHeader(timestamp, signature),
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
        await this.deadLetterStore.delete(message.id, endpoint.id);
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

        this.pendingRetries.set(retryKey, timeoutId);
      } else {
        await this.recordDeadLetter(message, endpoint, attempt);
      }
    }
  }

  private async recordDeadLetter(
    message: WebhookMessage,
    endpoint: WebhookEndpoint,
    attempt: WebhookDeliveryAttempt,
  ): Promise<void> {
    const existing = (await this.deadLetterStore.list(message.id)).find(
      (record) => record.endpointId === endpoint.id,
    );

    await this.deadLetterStore.upsert({
      id: existing?.id ?? `dlq_${crypto.randomUUID()}`,
      messageId: message.id,
      endpointId: endpoint.id,
      tenantId: message.tenantId,
      eventType: message.eventType,
      payload: message.payload,
      finalAttemptId: attempt.id,
      finalAttemptNumber: attempt.attemptNumber,
      statusCode: attempt.statusCode,
      response: attempt.response,
      failedAt: attempt.attemptedAt,
      deadLetteredAt: existing?.deadLetteredAt ?? new Date().toISOString(),
    });

    logger.warn("[webhooks:custom] Delivery dead-lettered", {
      endpointId: endpoint.id,
      messageId: message.id,
      finalAttemptNumber: attempt.attemptNumber,
      statusCode: attempt.statusCode,
    });
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

  async getDeadLetterDeliveries(messageId?: string): Promise<WebhookDeadLetterDelivery[]> {
    const deadLetters = await this.deadLetterStore.list(messageId);

    return deadLetters.sort(
      (a, b) => new Date(a.deadLetteredAt).getTime() - new Date(b.deadLetteredAt).getTime(),
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
      const parsed = parseWebhookSignatureHeader(signature);
      if (!parsed) {
        return false;
      }

      return verifyPayload(payload, parsed.signature, secret, parsed.timestamp);
    } catch {
      return false;
    }
  }

  async close(): Promise<void> {
    logger.info("[webhooks:custom] Closing provider, clearing pending retries");

    await Promise.allSettled(this.pendingDispatches);
    await this.deliveryQueue.onIdle();
    this.deliveryQueue.clear();

    // Clear all pending timeouts
    for (const timeoutId of this.pendingRetries.values()) {
      clearTimeout(timeoutId);
    }

    this.pendingRetries.clear();
    this.endpoints.clear();
    this.messages.clear();
    if (this.ownsDeadLetterStore) {
      await this.deadLetterStore.clear?.();
    }
  }
}
