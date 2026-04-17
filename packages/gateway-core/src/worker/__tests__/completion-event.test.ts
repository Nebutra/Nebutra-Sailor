import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CompletionEvent } from "../../types.js";
import { COMPLETION_QUEUE, COMPLETION_TYPE, enqueueCompletion } from "../completion-event.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const validEvent: CompletionEvent = {
  requestId: "req_abc123",
  apiKeyId: "key_001",
  organizationId: "org_123",
  userId: "user_456",
  model: "gpt-4o-mini",
  promptTokens: 100,
  completionTokens: 50,
  totalTokens: 150,
  latencyMs: 1234,
  status: "success",
  errorMessage: null,
};

function createMockQueue() {
  return {
    enqueue: vi.fn().mockResolvedValue({ ok: true }),
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("enqueueCompletion", () => {
  let queue: ReturnType<typeof createMockQueue>;

  beforeEach(() => {
    vi.clearAllMocks();
    queue = createMockQueue();
  });

  it("calls queue.enqueue with job targeting the ai-gateway queue + completion type", async () => {
    await enqueueCompletion(validEvent, { queue });

    expect(queue.enqueue).toHaveBeenCalledTimes(1);
    const job = queue.enqueue.mock.calls[0][0] as {
      queue: string;
      type: string;
      data: unknown;
      options?: { idempotencyKey?: string };
    };
    expect(job.queue).toBe(COMPLETION_QUEUE);
    expect(job.queue).toBe("ai-gateway");
    expect(job.type).toBe(COMPLETION_TYPE);
    expect(job.type).toBe("completion");
  });

  it("passes event as job data unchanged", async () => {
    await enqueueCompletion(validEvent, { queue });

    const job = queue.enqueue.mock.calls[0][0] as { data: CompletionEvent };
    expect(job.data).toEqual(validEvent);
  });

  it("uses requestId as the idempotencyKey", async () => {
    await enqueueCompletion(validEvent, { queue });

    const job = queue.enqueue.mock.calls[0][0] as {
      options?: { idempotencyKey?: string };
    };
    expect(job.options?.idempotencyKey).toBe(validEvent.requestId);
  });

  it("does not throw when event is invalid (missing required fields)", async () => {
    const invalidEvent = {
      requestId: "req_xyz",
      // missing organizationId, model, tokens, etc.
    } as unknown as CompletionEvent;

    await expect(enqueueCompletion(invalidEvent, { queue })).resolves.toBeUndefined();
    expect(queue.enqueue).not.toHaveBeenCalled();
  });

  it("does not throw when queue.enqueue rejects", async () => {
    queue.enqueue.mockRejectedValueOnce(new Error("Queue unavailable"));

    await expect(enqueueCompletion(validEvent, { queue })).resolves.toBeUndefined();
  });

  it("forwards valid event fields untouched (no mutation)", async () => {
    const eventCopy = { ...validEvent };
    await enqueueCompletion(validEvent, { queue });

    // Original reference not mutated
    expect(validEvent).toEqual(eventCopy);
  });
});
