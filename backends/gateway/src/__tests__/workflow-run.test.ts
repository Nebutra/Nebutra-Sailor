/**
 * workflow-run execution-core tests.
 *
 * Exercises the wave-orchestration glue (`runWorkflow`) with an INJECTED brief
 * runner — no provider, no DB. Proves the converged substrate is driven
 * correctly: dependency-resolved wave ordering, result aggregation, the ok
 * flag, the empty-graph guard, and cost-report summation. The real per-node
 * `runTurn` path (model resolution + provider call) is covered separately by
 * the agent-runtime substrate it delegates to.
 */

import type { Brief } from "@nebutra/agent-runtime";
import { describe, expect, it } from "vitest";
import { type BriefRunner, runWorkflow, type WorkflowRunInput } from "../lib/workflow-run.js";

function brief(id: string, dependsOn?: string[]): Brief {
  return {
    id,
    objective: `do ${id}`,
    outputFormat: {},
    allowedTools: ["none"],
    contextRefs: [],
    boundaries: ["stay on task"],
    budget: { durationMs: 1000, costUsd: 1, tokenLimit: 1000 },
    ...(dependsOn ? { dependsOn } : {}),
  };
}

function inputFor(briefs: Brief[]): WorkflowRunInput {
  return { tenantId: "org_1", threadId: "thread_1", defaultModel: "flagship", briefs };
}

/** Records execution order; each node "outputs" its id with fixed token usage. */
function recordingRunner(
  order: string[],
  output: (id: string) => string = (id) => id,
): BriefRunner {
  return async (b) => {
    order.push(b.id);
    return {
      briefId: b.id,
      output: output(b.id),
      usage: { inputTokens: 10, cachedInputTokens: 0, outputTokens: 5, reasoningOutputTokens: 1 },
      durationMs: 7,
    };
  };
}

describe("runWorkflow (execution core)", () => {
  it("runs a dependent node only after its dependency (wave ordering)", async () => {
    const order: string[] = [];
    const briefs = [brief("b", ["a"]), brief("a")]; // declared out of order on purpose
    const result = await runWorkflow(inputFor(briefs), recordingRunner(order));

    expect(result.ok).toBe(true);
    expect(order).toEqual(["a", "b"]); // a's wave precedes b's wave
    expect(result.results.map((r) => r.briefId)).toEqual(["a", "b"]);
  });

  it("aggregates token usage across all nodes into the cost report", async () => {
    const order: string[] = [];
    const briefs = [brief("a"), brief("b"), brief("c", ["a", "b"])];
    const result = await runWorkflow(inputFor(briefs), recordingRunner(order));

    expect(result.results).toHaveLength(3);
    expect(result.cost.subagents).toBe(3);
    expect(result.cost.totalInputTokens).toBe(30);
    expect(result.cost.totalOutputTokens).toBe(15);
    expect(result.cost.totalReasoningTokens).toBe(3);
  });

  it("marks the run not-ok when any node yields empty output", async () => {
    const order: string[] = [];
    const runner = recordingRunner(order, (id) => (id === "b" ? "" : id));
    const result = await runWorkflow(inputFor([brief("a"), brief("b")]), runner);

    expect(result.ok).toBe(false);
    expect(result.results).toHaveLength(2);
  });

  it("returns ok:false with no results for an empty graph", async () => {
    const result = await runWorkflow(inputFor([]), recordingRunner([]));
    expect(result.ok).toBe(false);
    expect(result.results).toEqual([]);
    expect(result.cost.subagents).toBe(0);
  });

  it("surfaces a dependency cycle as a not-ok run, not a throw", async () => {
    const order: string[] = [];
    const cyclic = [brief("a", ["b"]), brief("b", ["a"])];
    const result = await runWorkflow(inputFor(cyclic), recordingRunner(order));

    expect(result.ok).toBe(false);
    expect(order).toEqual([]); // never dispatched
  });
});
