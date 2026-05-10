import { logger } from "@nebutra/logger";
import { createJob } from "@nebutra/queue";
import { type CompletionEvent, CompletionEventSchema } from "../types.js";

/**
 * Queue name for AI gateway billing closure.
 */
export const COMPLETION_QUEUE = "ai-gateway";

/**
 * Job type for completion (billing closure) events.
 */
export const COMPLETION_TYPE = "completion";

export interface EnqueueDeps {
  queue: {
    enqueue: (job: unknown) => Promise<unknown>;
  };
}

/**
 * Enqueues a billing-closure event for asynchronous processing.
 *
 * Validates the event via Zod, then enqueues it onto the `ai-gateway`
 * queue under type `completion`. The `requestId` is used as the idempotency
 * key so the provider (QStash / BullMQ) can de-duplicate retries.
 *
 * This is a fire-and-forget operation — it never throws, even if validation
 * fails or the queue is unavailable. All failures are logged so the hot path
 * (request handler) stays fast and resilient.
 */
export async function enqueueCompletion(event: CompletionEvent, deps: EnqueueDeps): Promise<void> {
  const parsed = CompletionEventSchema.safeParse(event);
  if (!parsed.success) {
    logger.error("enqueueCompletion: invalid event, skipping", {
      requestId: (event as Partial<CompletionEvent>)?.requestId,
      issues: parsed.error.issues,
    });
    return;
  }

  try {
    const job = createJob(
      COMPLETION_QUEUE,
      COMPLETION_TYPE,
      parsed.data as unknown as Record<string, unknown>,
      { idempotencyKey: parsed.data.requestId },
    );
    await deps.queue.enqueue(job);
  } catch (err) {
    logger.error("enqueueCompletion: queue.enqueue failed", {
      requestId: parsed.data.requestId,
      error: err instanceof Error ? err.message : String(err),
    });
  }
}
