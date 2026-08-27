import { logger } from "@nebutra/logger";
import { Inngest } from "inngest";
import pLimit from "p-limit";
import pRetry from "p-retry";
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

const LOCAL_HANDLER_CONCURRENCY = 4;

/**
 * In-memory event bus for local development
 * In production, replace with Redis Streams or NATS
 */
export class EventBus {
  private handlers: Map<string, Set<EventHandler>> = new Map();
  private eventLog: BaseEvent[] = [];
  private inngestClient = new Inngest({ id: "nebutra-event-bus" });
  private limitLocalHandler = pLimit(LOCAL_HANDLER_CONCURRENCY);

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

    // Swap local bindings for durable Inngest send when applicable.
    try {
      await this.inngestClient.send({
        name: event.type,
        data: validated.data as any,
        user: validated.tenantId ? { id: validated.tenantId } : undefined,
      });
    } catch (err) {
      logger.warn("Failed to push event to Inngest durability layer", {
        error: err instanceof Error ? err.message : String(err),
      });
    }

    // Log event locally
    this.eventLog.push(validated);

    // Notify local handlers sync
    const handlers = this.handlers.get(event.type) || new Set();
    const wildcardHandlers = this.handlers.get("*") || new Set();

    const allHandlers = [...handlers, ...wildcardHandlers];

    await Promise.all(
      allHandlers.map((handler) =>
        this.limitLocalHandler(async () => {
          try {
            // Exponential backoff: 3 total attempts (1 initial + 2 retries),
            // 100ms → 200ms delays — matching the original hand-rolled loop.
            await pRetry(() => handler(validated), {
              retries: 2, // 1 initial + 2 retries = 3 total attempts
              minTimeout: 100,
              factor: 2,
              onFailedAttempt: ({ error, attemptNumber, retriesLeft }) => {
                logger.warn(
                  `Event handler error for ${event.type} (attempt ${attemptNumber}, ${retriesLeft} left)`,
                  { error: error instanceof Error ? error.message : String(error) },
                );
              },
            });
          } catch (lastError) {
            // All retries exhausted — send to DLQ
            const { recordDeadLetter } = await import("./dlq");
            recordDeadLetter(validated, handler.name || "anonymous", lastError, 3);
          }
        }),
      ),
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
