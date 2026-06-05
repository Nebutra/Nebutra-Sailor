/**
 * workflow-execute closure tests — proves the END-TO-END loop minus the
 * provider: tenant scriptSource runs in the REAL QuickJS sandbox, the guest
 * agent() binding routes to an INJECTED caller (no model/network), and the
 * outcome aggregates return value, agent-call count, token usage, and
 * log/phase events the way the Inngest runner persists to WorkflowRun.
 */

import { describe, expect, it } from "vitest";
import {
  runWorkflowDefinition,
  type WorkflowAgentCaller,
  type WorkflowExecInput,
} from "../lib/workflow-execute.js";

const baseInput = (scriptSource: string): WorkflowExecInput => ({
  tenantId: "org_1",
  threadId: "thread_1",
  defaultModel: "flagship",
  scriptSource,
  args: {},
  limits: { maxConcurrency: 16, maxAgentsPerRun: 1000, maxRetries: 2, timeoutMs: 5000 },
});

const fakeCaller: WorkflowAgentCaller = async (prompt) => ({
  text: `r:${prompt}`,
  inputTokens: 2,
  outputTokens: 3,
  reasoningOutputTokens: 1,
});

describe("runWorkflowDefinition (end-to-end closure, injected caller)", () => {
  it("runs a parallel workflow and aggregates usage + agent calls", async () => {
    const outcome = await runWorkflowDefinition(
      baseInput(
        `log("start");
         const xs = await parallel([() => agent("a"), () => agent("b")]);
         return xs;`,
      ),
      fakeCaller,
    );

    expect(outcome.ok).toBe(true);
    expect(outcome.returnValue).toEqual(["r:a", "r:b"]);
    expect(outcome.agentCalls).toBe(2);
    expect(outcome.usage).toEqual({ inputTokens: 4, outputTokens: 6, reasoningOutputTokens: 2 });
    expect(outcome.events).toContainEqual({ type: "log", message: "start" });
  });

  it("passes per-node model meta from agent() opts to the caller", async () => {
    const models: Array<unknown> = [];
    const capturingCaller: WorkflowAgentCaller = async (prompt, opts) => {
      models.push(opts?.model);
      return { text: prompt, inputTokens: 0, outputTokens: 0, reasoningOutputTokens: 0 };
    };

    const outcome = await runWorkflowDefinition(
      baseInput(`return await agent("x", { model: { reasoningEffort: "xhigh" } });`),
      capturingCaller,
    );

    expect(outcome.ok).toBe(true);
    expect(models).toEqual([{ reasoningEffort: "xhigh" }]);
  });

  it("records phase() calls as events", async () => {
    const outcome = await runWorkflowDefinition(
      baseInput(`phase("research"); await agent("q"); return "done";`),
      fakeCaller,
    );

    expect(outcome.ok).toBe(true);
    expect(outcome.returnValue).toBe("done");
    expect(outcome.events).toContainEqual({ type: "phase", message: "research" });
  });

  it("surfaces the sandbox agent-count cap as a not-ok outcome", async () => {
    const outcome = await runWorkflowDefinition(
      {
        ...baseInput(`await agent("1"); await agent("2"); return "x";`),
        limits: { maxConcurrency: 16, maxAgentsPerRun: 1, maxRetries: 2, timeoutMs: 5000 },
      },
      fakeCaller,
    );

    expect(outcome.ok).toBe(false);
    expect(outcome.error).toContain("maxAgentsPerRun");
  });
});
