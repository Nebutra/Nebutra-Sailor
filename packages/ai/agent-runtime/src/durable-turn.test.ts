import { describe, expect, it } from "vitest";
import { z } from "zod";
import { createDurableTurn, type DurableTurnQueuePort } from "./durable-turn";
import type { ApprovalGate, ModelInvoker, ModelRoundResult } from "./loop";
import { runTurn } from "./loop";
import type { ThreadEvent, TurnConfig } from "./model";
import type { ReviewDecision } from "./policy";
import { InMemoryRolloutStore, type RolloutStore } from "./rollout";
import { ToolRegistry } from "./tools";

const config: TurnConfig = {
  model: "m",
  provider: "p",
  approvalPolicy: "on_request",
  capabilityPolicy: "external_sandbox",
};

const approveAll: ApprovalGate = {
  async request() {
    return { kind: "approved" } as ReviewDecision;
  },
};

/** Model that finishes immediately with text. */
function quickModel(): ModelInvoker {
  return {
    async invoke(): Promise<ModelRoundResult> {
      return { emissions: [{ kind: "text", text: "done" }] };
    },
  };
}

function registry(): ToolRegistry {
  const reg = new ToolRegistry();
  reg.register(
    { name: "echo", description: "echo", inputSchema: z.object({ v: z.string() }) },
    async (input: { v: string }) => input.v,
  );
  return reg;
}

/**
 * Fake in-process queue: records enqueues, runs handlers synchronously on
 * demand (so a test can simulate "crash" = never drain, then "resume").
 */
function fakeQueue(): DurableTurnQueuePort & {
  pending: Map<string, () => Promise<void>>;
  drain: (jobId: string) => Promise<void>;
} {
  const handlers = new Map<string, (payload: unknown) => Promise<void>>();
  const pending = new Map<string, () => Promise<void>>();
  return {
    pending,
    async enqueue(job) {
      const handler = handlers.get(job.name);
      if (!handler) throw new Error(`no handler for ${job.name}`);
      pending.set(job.jobId, () => handler(job.payload));
    },
    registerHandler(name, handler) {
      handlers.set(name, handler);
    },
    async drain(jobId) {
      const run = pending.get(jobId);
      if (!run) return;
      await run();
      pending.delete(jobId);
    },
  };
}

function runner(model: ModelInvoker, tools: ToolRegistry) {
  return (input: string, ctx: { tenantId: string; threadId: string }) =>
    runTurn(input, {
      tenantId: ctx.tenantId,
      threadId: ctx.threadId,
      config,
      approvalPolicy: { kind: "on_request" },
      model,
      tools,
      store: storeRef,
      approvalGate: approveAll,
      ruleEvaluator: () => "allow",
    });
}

let storeRef: RolloutStore;

async function collect(gen: AsyncGenerator<ThreadEvent>): Promise<ThreadEvent[]> {
  const out: ThreadEvent[] = [];
  for await (const e of gen) out.push(e);
  return out;
}

describe("durable / resumable turn", () => {
  it("crash-then-resume continues an unfinished turn", async () => {
    const store = new InMemoryRolloutStore();
    storeRef = store;
    const queue = fakeQueue();
    const durable = createDurableTurn({
      store,
      queue,
      runner: runner(quickModel(), registry()),
    });

    const { turnId } = await durable.start("hello", {
      tenantId: "org_a",
      threadId: "th_1",
    });
    expect(turnId).toBeTruthy();

    // Simulate crash: job enqueued but never drained — no rollout yet.
    const before = await store.read("org_a", "th_1");
    expect(before.length).toBe(0);

    // Resume re-drives the unfinished turn to completion.
    const events = await collect(durable.resume("org_a", "th_1"));
    expect(events[events.length - 1]?.type).toBe("turn.completed");

    const lines = await store.read("org_a", "th_1");
    expect(lines.length).toBeGreaterThan(0);
    expect(lines.every((l) => l.tenantId === "org_a")).toBe(true);
  });

  it("resume of a completed turn replays recorded terminal events", async () => {
    const store = new InMemoryRolloutStore();
    storeRef = store;
    const queue = fakeQueue();
    const durable = createDurableTurn({
      store,
      queue,
      runner: runner(quickModel(), registry()),
    });

    const { turnId } = await durable.start("hello", {
      tenantId: "org_a",
      threadId: "th_done",
    });
    await queue.drain(turnId); // job ran to completion (no crash)

    const replayed = await collect(durable.resume("org_a", "th_done"));
    expect(replayed.some((e) => e.type === "turn.completed")).toBe(true);

    // Idempotent: a second resume replays the same terminal stream.
    const replayedAgain = await collect(durable.resume("org_a", "th_done"));
    expect(replayedAgain.map((e) => e.type)).toEqual(replayed.map((e) => e.type));
    // Resume must NOT append more lines when already terminal.
    const lines = await store.read("org_a", "th_done");
    const afterResume = await store.read("org_a", "th_done");
    expect(afterResume.length).toBe(lines.length);
  });

  it("cross-tenant resume is impossible (isolation)", async () => {
    const store = new InMemoryRolloutStore();
    storeRef = store;
    const queue = fakeQueue();
    const durable = createDurableTurn({
      store,
      queue,
      runner: runner(quickModel(), registry()),
    });

    const { turnId } = await durable.start("hello", {
      tenantId: "org_a",
      threadId: "th_secret",
    });
    await queue.drain(turnId);

    // Another tenant asking for the same threadId sees nothing of org_a's data.
    const events = await collect(durable.resume("org_b", "th_secret"));
    expect(events.some((e) => e.type === "turn.completed")).toBe(true);
    const orgB = await store.read("org_b", "th_secret");
    const orgA = await store.read("org_a", "th_secret");
    expect(orgB.every((l) => l.tenantId === "org_b")).toBe(true);
    expect(orgA.every((l) => l.tenantId === "org_a")).toBe(true);
    expect(orgA.length).not.toBe(0);
  });

  it("fails closed on missing tenant or thread", async () => {
    const store = new InMemoryRolloutStore();
    storeRef = store;
    const durable = createDurableTurn({
      store,
      queue: fakeQueue(),
      runner: runner(quickModel(), registry()),
    });

    await expect(durable.start("x", { tenantId: "", threadId: "th" })).rejects.toThrow();
    await expect(durable.start("x", { tenantId: "t", threadId: "" })).rejects.toThrow();
    await expect(collect(durable.resume("", "th"))).rejects.toThrow();
    await expect(collect(durable.resume("t", ""))).rejects.toThrow();
  });

  it("start enqueues a tenant+thread scoped jobId", async () => {
    const store = new InMemoryRolloutStore();
    storeRef = store;
    const queue = fakeQueue();
    const durable = createDurableTurn({
      store,
      queue,
      runner: runner(quickModel(), registry()),
    });

    const a = await durable.start("x", { tenantId: "org_a", threadId: "th_1" });
    const b = await durable.start("x", { tenantId: "org_b", threadId: "th_1" });
    expect(a.turnId).not.toBe(b.turnId);
    expect([...queue.pending.keys()]).toContain(a.turnId);
    expect([...queue.pending.keys()]).toContain(b.turnId);
  });
});
