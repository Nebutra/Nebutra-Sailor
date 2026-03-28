import { logger } from "@nebutra/logger";
import { z } from "zod";

// Base event schema
export const BaseEventSchema = z.object({
  id: z.string(),
  type: z.string(),
  timestamp: z.string().datetime(),
  source: z.string(),
  tenantId: z.string().optional(),
  correlationId: z.string().optional(),
  data: z.record(z.string(), z.unknown()),
});

export type BaseEvent = z.infer<typeof BaseEventSchema>;

type EventHandler<T extends BaseEvent = BaseEvent> = (event: T) => Promise<void>;

/**
 * In-memory event bus for local development
 * In production, replace with Redis Streams or NATS
 */
export class EventBus {
  private handlers: Map<string, Set<EventHandler>> = new Map();
  private eventLog: BaseEvent[] = [];

  /**
   * Subscribe to an event type
   */
  subscribe<T extends BaseEvent>(eventType: string, handler: EventHandler<T>): () => void {
    if (!this.handlers.has(eventType)) {
      this.handlers.set(eventType, new Set());
    }

    const handlers = this.handlers.get(eventType) ?? new Set<EventHandler>();
    handlers.add(handler as EventHandler);

    // Return unsubscribe function
    return () => {
      handlers.delete(handler as EventHandler);
    };
  }

  /**
   * Publish an event
   */
  async publish(event: BaseEvent): Promise<void> {
    // Validate event
    const validated = BaseEventSchema.parse(event);

    // Log event
    this.eventLog.push(validated);

    // Notify handlers
    const handlers = this.handlers.get(event.type) || new Set();
    const wildcardHandlers = this.handlers.get("*") || new Set();

    const allHandlers = [...handlers, ...wildcardHandlers];

    await Promise.all(
      allHandlers.map(async (handler) => {
        const MAX_ATTEMPTS = 3;
        let lastError: unknown;

        for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
          try {
            await handler(validated);
            return; // success — exit retry loop
          } catch (error) {
            lastError = error;
            logger.warn(
              `Event handler error for ${event.type} (attempt ${attempt}/${MAX_ATTEMPTS})`,
              { error: error instanceof Error ? error.message : String(error) },
            );
            if (attempt < MAX_ATTEMPTS) {
              // Exponential backoff: 100ms, 200ms
              await new Promise((r) => setTimeout(r, 100 * 2 ** (attempt - 1)));
            }
          }
        }

        // All retries exhausted — send to DLQ
        const { recordDeadLetter } = await import("./dlq.js");
        recordDeadLetter(validated, handler.name || "anonymous", lastError, MAX_ATTEMPTS);
      }),
    );
  }

  /**
   * Create an event with auto-generated ID and timestamp
   */
  createEvent(
    type: string,
    data: Record<string, unknown>,
    options?: {
      source?: string;
      tenantId?: string;
      correlationId?: string;
    },
  ): BaseEvent {
    return {
      id: crypto.randomUUID(),
      type,
      timestamp: new Date().toISOString(),
      source: options?.source || "unknown",
      tenantId: options?.tenantId,
      correlationId: options?.correlationId,
      data,
    };
  }

  /**
   * Get event history (for debugging)
   */
  getEventLog(): BaseEvent[] {
    return [...this.eventLog];
  }

  /**
   * Clear event log
   */
  clearEventLog(): void {
    this.eventLog = [];
  }
}

// Global event bus instance
export const eventBus = new EventBus();
