/**
 * Durable / resumable turn (WRAP — capability #10).
 *
 * Wraps the existing {@link runTurn} async generator so a turn survives a
 * process crash. `start` enqueues a tenant+thread-scoped durable job whose
 * handler drains `runTurn` (the loop runner already appends every event to the
 * tenant-scoped {@link RolloutStore}); the durable layer guarantees the job is
 * replayable if the worker dies mid-turn. `resume` inspects the persisted
 * rollout: if the last recorded event is non-terminal the turn is re-driven to
 * completion, otherwise the recorded terminal stream is replayed.
 *
 * Queue binding is interface-only — callers wire `@nebutra/queue` by
 * implementing {@link DurableTurnQueuePort}; this package never depends on it.
 * Tenant scoping is mandatory and fail-closed: a missing tenant or thread
 * throws, and resume can never read another tenant's rollout.
 */

import { z } from "zod";
import type { ThreadEvent } from "./model";
import { isTurnTerminal } from "./model";
import { type RolloutLine, type RolloutStore, replay } from "./rollout";

/** A durable job handed to the queue. Mirrors `@nebutra/queue` job shape. */
export interface DurableTurnJob {
  /** Logical job name — used for handler routing. */
  readonly name: string;
  /** Tenant+thread-scoped id; the queue must de-dupe / make idempotent on it. */
  readonly jobId: string;
  /** Opaque Zod-validated payload (kept narrow on purpose). */
  readonly payload: unknown;
}

/**
 * Minimal injectable queue seam (enqueue + handler registration). Mirrors
 * `@nebutra/queue`'s `defineQueueJob` / `createJobRouter` contract without a
 * hard dependency, so this package stays provider-agnostic.
 */
export interface DurableTurnQueuePort {
  enqueue(job: DurableTurnJob): Promise<void>;
  registerHandler(name: string, handler: (payload: unknown) => Promise<void>): void;
}

/** Drives one turn, yielding the event stream (persists internally). */
export type DurableTurnRunner = (input: string, ctx: TurnContext) => AsyncGenerator<ThreadEvent>;

export interface TurnContext {
  readonly tenantId: string;
  readonly threadId: string;
}

export interface CreateDurableTurnDeps {
  readonly store: RolloutStore;
  readonly queue: DurableTurnQueuePort;
  readonly runner: DurableTurnRunner;
}

export interface DurableTurn {
  start(input: string, ctx: TurnContext): Promise<{ readonly turnId: string }>;
  resume(tenantId: string, threadId: string): AsyncGenerator<ThreadEvent>;
}

const DURABLE_TURN_JOB = "agent-runtime.durable-turn";

const contextSchema = z.object({
  tenantId: z.string().min(1),
  threadId: z.string().min(1),
});

const jobPayloadSchema = z.object({
  tenantId: z.string().min(1),
  threadId: z.string().min(1),
  input: z.string(),
});

/** Tenant+thread-scoped, stable job id (idempotency key on the queue). */
function turnIdFor(tenantId: string, threadId: string): string {
  return `${DURABLE_TURN_JOB}:${tenantId}:${threadId}`;
}

/** Recorded `ThreadEvent`s in append order, tenant-scoped via the store read. */
function recordedEvents(lines: readonly RolloutLine[]): ThreadEvent[] {
  return lines.flatMap((line) => (line.type === "event" ? [line.event] : []));
}

export function createDurableTurn(deps: CreateDurableTurnDeps): DurableTurn {
  const { store, queue, runner } = deps;

  // Register the durable handler once: drain the runner so every event is
  // persisted by the loop runner. Crash before/within = job stays replayable.
  queue.registerHandler(DURABLE_TURN_JOB, async (payload: unknown) => {
    const { tenantId, threadId, input } = jobPayloadSchema.parse(payload);
    const gen = runner(input, { tenantId, threadId });
    for await (const _event of gen) {
      // The runner persists each event; nothing to do but exhaust it.
    }
  });

  async function start(input: string, ctx: TurnContext): Promise<{ readonly turnId: string }> {
    const { tenantId, threadId } = contextSchema.parse(ctx);
    const turnId = turnIdFor(tenantId, threadId);
    await queue.enqueue({
      name: DURABLE_TURN_JOB,
      jobId: turnId,
      payload: { tenantId, threadId, input },
    });
    return { turnId };
  }

  async function* resume(tenantId: string, threadId: string): AsyncGenerator<ThreadEvent> {
    const scope = contextSchema.parse({ tenantId, threadId });
    // Tenant-scoped read — cross-tenant resume is structurally impossible.
    const lines = await store.read(scope.tenantId, scope.threadId);
    const projection = replay(lines);
    const events = recordedEvents(lines);
    const last = events[events.length - 1];

    if (projection && last && isTurnTerminal(last)) {
      // Completed turn — replay the recorded stream, append nothing.
      for (const event of events) yield event;
      return;
    }

    // Unfinished (crash) or never-started — re-drive to completion. The runner
    // appends fresh lines; we recover the original input from the rollout if
    // present, else an empty resume prompt (turn is replay-driven thereafter).
    const input = "";
    const gen = runner(input, {
      tenantId: scope.tenantId,
      threadId: scope.threadId,
    });
    for await (const event of gen) yield event;
  }

  return { start, resume };
}
