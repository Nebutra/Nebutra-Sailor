import { describe, expect, it } from "vitest";
import {
  type Brief,
  costReport,
  fanOutSubagents,
  planSubagentDispatch,
  planWaves,
  runAgentWaves,
} from "./orchestration";

function brief(name: string, dependsOn: readonly string[] = []): Brief {
  return {
    id: name,
    objective: `do ${name}`,
    outputFormat: { type: "object", properties: { value: { type: "string" } } },
    allowedTools: ["read"],
    contextRefs: [],
    boundaries: ["do not write outside scope"],
    budget: { durationMs: 1_000, costUsd: 0.01, tokenLimit: 1_000 },
    dependsOn,
  };
}

describe("subagent orchestration", () => {
  it("defaults dependent briefs to sequential dispatch", () => {
    const plan = planSubagentDispatch([brief("research"), brief("write", ["research"])]);
    expect(plan.strategy).toBe("sequential");
    expect(plan.order.map((item) => item.id)).toEqual(["research", "write"]);
  });

  it("refuses fan-out when briefs depend on each other", () => {
    expect(() =>
      planSubagentDispatch([brief("research"), brief("write", ["research"])], {
        strategy: "fanout",
      }),
    ).toThrow(/fan-out|depend/i);
  });

  it("runs independent fan-out briefs and preserves result ownership", async () => {
    const results = await fanOutSubagents([brief("logo"), brief("copy")], async (item) => ({
      briefId: item.id,
      output: { value: item.objective },
      usage: { inputTokens: 10, cachedInputTokens: 0, outputTokens: 3, reasoningOutputTokens: 0 },
      durationMs: 5,
    }));

    expect(results.map((result) => result.briefId)).toEqual(["logo", "copy"]);
    expect(costReport(results)).toEqual({
      totalInputTokens: 20,
      totalOutputTokens: 6,
      totalReasoningTokens: 0,
      maxDurationMs: 5,
      subagents: 2,
    });
  });

  it("requires precise brief fields", () => {
    expect(() => planSubagentDispatch([{ ...brief("bad"), objective: "" }])).toThrow(/objective/i);
  });

  // ── Node-topology scheduler (wave execution over the dependency graph) ──────

  it("groups briefs into dependency waves (diamond → 3 waves)", () => {
    // a → {b, c} → d
    const waves = planWaves([
      brief("a"),
      brief("b", ["a"]),
      brief("c", ["a"]),
      brief("d", ["b", "c"]),
    ]);
    expect(waves.map((wave) => wave.map((b) => b.id))).toEqual([["a"], ["b", "c"], ["d"]]);
  });

  it("runs waves sequentially with parallelism inside each wave", async () => {
    const seen: string[] = [];
    const results = await runAgentWaves([brief("a"), brief("b", ["a"])], async (item) => {
      seen.push(item.id);
      return {
        briefId: item.id,
        output: {},
        usage: { inputTokens: 0, cachedInputTokens: 0, outputTokens: 0, reasoningOutputTokens: 0 },
        durationMs: 0,
      };
    });
    expect(seen).toEqual(["a", "b"]); // dep before dependent
    expect(results.map((r) => r.briefId)).toEqual(["a", "b"]);
  });

  it("rejects a dependency cycle via the shared cycle detector", () => {
    expect(() => planWaves([brief("a", ["b"]), brief("b", ["a"])])).toThrow(/cycle/i);
  });
});
