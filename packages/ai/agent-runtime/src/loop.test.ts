import { describe, expect, it } from "vitest";
import { z } from "zod";
import { type ApprovalGate, type ModelInvoker, type ModelRoundResult, runTurn } from "./loop.js";
import type { ThreadEvent, TurnConfig } from "./model.js";
import type { ReviewDecision } from "./policy.js";
import { InMemoryRolloutStore } from "./rollout.js";
import { ToolRegistry } from "./tools.js";

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
const denyAll: ApprovalGate = {
  async request() {
    return { kind: "denied" } as ReviewDecision;
  },
};

/** Model that calls `echo` once, then finishes with text. */
function scriptedModel(): ModelInvoker {
  let round = 0;
  return {
    async invoke(): Promise<ModelRoundResult> {
      round += 1;
      if (round === 1) {
        return {
          emissions: [{ kind: "tool_call", id: "tc_1", name: "echo", args: { v: "hi" } }],
          usage: { outputTokens: 5 },
        };
      }
      return { emissions: [{ kind: "text", text: "done" }] };
    },
  };
}

function registry(): ToolRegistry {
  const reg = new ToolRegistry();
  reg.register(
    { name: "echo", description: "echo", inputSchema: z.object({ v: z.string() }) },
    async (input: { v: string }, ctx) => `${ctx.tenantId}:${input.v}`,
  );
  return reg;
}

async function collect(gen: AsyncGenerator<ThreadEvent>): Promise<ThreadEvent[]> {
  const out: ThreadEvent[] = [];
  for await (const e of gen) out.push(e);
  return out;
}

describe("loop runner", () => {
  it("drives model → tool → result → completion and persists the rollout", async () => {
    const store = new InMemoryRolloutStore();
    const events = await collect(
      runTurn("do it", {
        tenantId: "org_a",
        threadId: "th_1",
        config,
        approvalPolicy: { kind: "on_request" },
        model: scriptedModel(),
        tools: registry(),
        store,
        approvalGate: approveAll,
        ruleEvaluator: () => "allow",
      }),
    );
    const types = events.map((e) => e.type);
    expect(types[0]).toBe("turn.started");
    expect(types).toContain("item.completed");
    expect(types[types.length - 1]).toBe("turn.completed");

    const lines = await store.read("org_a", "th_1");
    expect(lines.length).toBe(events.length); // every event persisted, tenant-scoped
    expect(lines.every((l) => l.tenantId === "org_a")).toBe(true);
  });

  it("fails closed when a tool is not approved — never dispatches it", async () => {
    let dispatched = false;
    const reg = new ToolRegistry();
    reg.register(
      { name: "echo", description: "echo", inputSchema: z.object({ v: z.string() }) },
      async () => {
        dispatched = true;
        return "ran";
      },
    );
    const events = await collect(
      runTurn("do it", {
        tenantId: "org_a",
        threadId: "th_1",
        config,
        approvalPolicy: { kind: "on_request" },
        model: scriptedModel(),
        tools: reg,
        store: new InMemoryRolloutStore(),
        approvalGate: denyAll,
        ruleEvaluator: () => "prompt",
      }),
    );
    expect(dispatched).toBe(false);
    expect(events.some((e) => e.type === "item.completed" && e.item.type === "error")).toBe(true);
    expect(events[events.length - 1]?.type).toBe("turn.completed");
  });

  it("surfaces an internal failure as turn.failed, never throws to caller", async () => {
    const brokenModel: ModelInvoker = {
      async invoke() {
        throw new Error("model exploded");
      },
    };
    const events = await collect(
      runTurn("x", {
        tenantId: "t",
        threadId: "th",
        config,
        approvalPolicy: { kind: "on_request" },
        model: brokenModel,
        tools: new ToolRegistry(),
        store: new InMemoryRolloutStore(),
        approvalGate: approveAll,
      }),
    );
    expect(events[events.length - 1]).toEqual({
      type: "turn.failed",
      error: { message: "model exploded" },
    });
  });

  it("respects the bounded step ceiling", async () => {
    const loopingModel: ModelInvoker = {
      async invoke() {
        return { emissions: [{ kind: "tool_call", id: "x", name: "echo", args: { v: "1" } }] };
      },
    };
    const events = await collect(
      runTurn("x", {
        tenantId: "t",
        threadId: "th",
        config,
        approvalPolicy: { kind: "on_request" },
        model: loopingModel,
        tools: registry(),
        store: new InMemoryRolloutStore(),
        approvalGate: approveAll,
        ruleEvaluator: () => "allow",
        maxSteps: 3,
      }),
    );
    // 3 steps × 1 tool item + turn.started + turn.completed
    expect(events.filter((e) => e.type === "item.completed")).toHaveLength(3);
    expect(events[events.length - 1]?.type).toBe("turn.completed");
  });
});
