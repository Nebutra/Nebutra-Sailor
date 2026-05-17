import { describe, expect, it } from "vitest";
import { type Brief, costReport, fanOutSubagents, planSubagentDispatch } from "./orchestration";

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
});
