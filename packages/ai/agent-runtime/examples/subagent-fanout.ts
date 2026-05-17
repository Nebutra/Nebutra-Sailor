import { type Brief, costReport, fanOutSubagents } from "../src";

const brief = (id: string): Brief => ({
  id,
  objective: `produce ${id}`,
  outputFormat: { type: "object" },
  allowedTools: ["read"],
  contextRefs: [],
  boundaries: ["do not mutate parent state"],
  budget: { durationMs: 1_000, costUsd: 0.01, tokenLimit: 1_000 },
});

const results = await fanOutSubagents([brief("visual"), brief("copy")], async (item) => ({
  briefId: item.id,
  output: { ok: true },
  usage: { inputTokens: 10, cachedInputTokens: 0, outputTokens: 2, reasoningOutputTokens: 0 },
  durationMs: 12,
}));

process.stdout.write(`${JSON.stringify(costReport(results))}\n`);
