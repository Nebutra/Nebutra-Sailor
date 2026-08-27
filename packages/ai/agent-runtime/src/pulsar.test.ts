import { describe, expect, it } from "vitest";
import { z } from "zod";
import type { ApprovalGate, ModelInvoker, ModelRoundResult } from "./loop";
import type { ThreadEvent, TurnConfig } from "./model";
import type { ReviewDecision } from "./policy";
import { Pulsar } from "./pulsar";
import { InMemoryRolloutStore } from "./rollout";
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

function quickModel(): ModelInvoker {
  return {
    async invoke(): Promise<ModelRoundResult> {
      return {
        emissions: [{ kind: "text", text: "done" }],
        usage: { inputTokens: 2, outputTokens: 1 },
      };
    },
  };
}

function registry(): ToolRegistry {
  const tools = new ToolRegistry();
  tools.register(
    { name: "echo", description: "echo", inputSchema: z.object({ v: z.string() }) },
    async (input: { v: string }) => input.v,
  );
  return tools;
}

async function collect(gen: AsyncGenerator<ThreadEvent>): Promise<ThreadEvent[]> {
  const events: ThreadEvent[] = [];
  for await (const event of gen) events.push(event);
  return events;
}

function fakeEventLog() {
  const commits: Array<{
    traceId: string;
    kind: string;
    affected: readonly string[];
    parent: string | null;
  }> = [];
  const branches: Array<{ id: string; name: string }> = [];
  return {
    commits,
    branches,
    async commit(event: {
      traceId: string;
      kind: string;
      affected: readonly string[];
      parent: string | null;
    }) {
      commits.push(event);
      return `event_${commits.length}`;
    },
    async branchFrom(id: string, name: string) {
      branches.push({ id, name });
      return { name, from: id, at: "now" };
    },
  };
}

describe("Pulsar facade", () => {
  it("starts a tenant-scoped thread, streams item-level events, and mirrors items to event-log", async () => {
    const store = new InMemoryRolloutStore();
    const eventLog = fakeEventLog();
    const pulsar = Pulsar.builder()
      .withTenant("org_1")
      .withConfig(config)
      .withModel(quickModel())
      .withTools(registry())
      .withRolloutStore(store)
      .withApprovalGate(approveAll)
      .withEventLog(eventLog)
      .build();

    const thread = await pulsar.startPlay("hello_play", "say hi");
    const events = await collect(thread.subscribe());

    expect(events[0]).toEqual({ type: "thread.started", threadId: thread.id });
    expect(events.some((event) => event.type === "item.completed")).toBe(true);
    expect(events.at(-1)?.type).toBe("turn.completed");
    expect(eventLog.commits).toMatchObject([
      { traceId: thread.id, kind: "llm_call", affected: [], parent: null },
    ]);

    const rollout = await store.read("org_1", thread.id);
    expect(rollout[0]).toMatchObject({ type: "session_meta", threadId: thread.id });
    expect(rollout.every((line) => line.tenantId === "org_1")).toBe(true);
  });

  it("resumes a completed thread by replaying recorded events instead of calling the model again", async () => {
    let invokes = 0;
    const model: ModelInvoker = {
      async invoke() {
        invokes += 1;
        return { emissions: [{ kind: "text", text: "done" }] };
      },
    };
    const pulsar = Pulsar.builder()
      .withTenant("org_1")
      .withConfig(config)
      .withModel(model)
      .withTools(registry())
      .withRolloutStore(new InMemoryRolloutStore())
      .withApprovalGate(approveAll)
      .build();

    const thread = await pulsar.startPlay("hello_play", "say hi");
    const first = await collect(thread.subscribe());
    const resumed = await pulsar.resume(thread.id);
    const replayed = await collect(resumed.subscribe());

    expect(invokes).toBe(1);
    expect(replayed.map((event) => event.type)).toEqual(first.map((event) => event.type));
  });

  it("branches from an item by resolving the item-level event-log commit", async () => {
    const eventLog = fakeEventLog();
    const pulsar = Pulsar.builder()
      .withTenant("org_1")
      .withConfig(config)
      .withModel(quickModel())
      .withTools(registry())
      .withRolloutStore(new InMemoryRolloutStore())
      .withApprovalGate(approveAll)
      .withEventLog(eventLog)
      .build();

    const thread = await pulsar.startPlay("hello_play", "say hi");
    const events = await collect(thread.subscribe());
    const item = events.find((event) => event.type === "item.completed")?.item;
    if (!item) throw new Error("expected completed item");

    await pulsar.branchFromItem(thread.id, item.id, "variant");

    expect(eventLog.branches).toEqual([{ id: "event_1", name: "variant" }]);
  });

  it("fails closed without tenant context", () => {
    expect(() => Pulsar.builder().withTenant("")).toThrow(/tenant/i);
  });
});
