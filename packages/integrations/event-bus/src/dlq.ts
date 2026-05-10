/**
 * Dead Letter Queue (DLQ) for the in-memory EventBus.
 *
 * When a handler throws after all retry attempts, the failed event is moved to
 * the DLQ instead of being silently dropped.  Operators can inspect, replay, or
 * discard DLQ entries via the exported helpers.
 *
 * Production note: In a real deployment backed by Redis Streams or NATS this
 * module should delegate to the broker's native DLQ / dead-letter exchange
 * rather than maintaining an in-process list.
 */

import { logger } from "@nebutra/logger";
import type { BaseEvent } from "./bus.js";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface DeadLetterEntry {
  id: string;
  event: BaseEvent;
  handlerName: string;
  error: string;
  failedAt: Date;
  attemptCount: number;
}

// ── Store ─────────────────────────────────────────────────────────────────────

const MAX_DLQ_SIZE = 1_000; // prevent unbounded growth in long-running processes

const queue: DeadLetterEntry[] = [];

// ── Write ─────────────────────────────────────────────────────────────────────

/**
 * Record a failed event in the DLQ.
 * Called by EventBus after all retry attempts are exhausted.
 */
export function recordDeadLetter(
  event: BaseEvent,
  handlerName: string,
  error: unknown,
  attemptCount: number,
): void {
  if (queue.length >= MAX_DLQ_SIZE) {
    // Drop oldest entry to make room (circular buffer behaviour)
    queue.shift();
  }

  const entry: DeadLetterEntry = {
    id: crypto.randomUUID(),
    event,
    handlerName,
    error: error instanceof Error ? error.message : String(error),
    failedAt: new Date(),
    attemptCount,
  };

  queue.push(entry);

  logger.error("Event moved to DLQ", {
    dlqId: entry.id,
    eventId: event.id,
    eventType: event.type,
    handler: handlerName,
    attempts: attemptCount,
    error: entry.error,
  });
}

// ── Read ──────────────────────────────────────────────────────────────────────

/** Return a snapshot of all DLQ entries. */
export function getDeadLetterQueue(): DeadLetterEntry[] {
  return [...queue];
}

/** Return entries for a specific event type. */
export function getDLQByEventType(eventType: string): DeadLetterEntry[] {
  return queue.filter((e) => e.event.type === eventType);
}

/** Return entries for a specific tenant. */
export function getDLQByTenant(tenantId: string): DeadLetterEntry[] {
  return queue.filter((e) => e.event.tenantId === tenantId);
}

// ── Replay ────────────────────────────────────────────────────────────────────

/**
 * Remove a DLQ entry by ID and return the event so the caller can re-publish it.
 * Returns `null` if the entry is not found.
 */
export async function ackDeadLetter(id: string): Promise<DeadLetterEntry | null> {
  const idx = queue.findIndex((e) => e.id === id);
  if (idx === -1) return null;
  const [entry] = queue.splice(idx, 1);
  if (!entry) return null;
  logger.info("DLQ entry acknowledged", { dlqId: id, eventId: entry.event.id });
  return entry;
}

/** Clear all DLQ entries (use carefully — data is lost). */
export function clearDeadLetterQueue(): void {
  queue.length = 0;
  logger.warn("Dead letter queue cleared");
}
