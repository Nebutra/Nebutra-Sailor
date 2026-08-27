# subagent-orchestration Replication Guide

```ts
import { fanOutSubagents, type Brief } from "@nebutra/agent-runtime";

const brief: Brief = {
  id: "research",
  objective: "Find three product constraints",
  outputFormat: { type: "object" },
  allowedTools: ["content.search"],
  contextRefs: [],
  boundaries: ["do not modify files"],
  budget: { durationMs: 1000, costUsd: 0.01, tokenLimit: 1000 },
};

const results = await fanOutSubagents([brief], async (item) => ({
  briefId: item.id,
  output: { ok: true },
  usage: { inputTokens: 1, cachedInputTokens: 0, outputTokens: 1, reasoningOutputTokens: 0 },
  durationMs: 10,
}));
```

## Checks

```bash
pnpm --filter @nebutra/agent-runtime test -- src/orchestration.test.ts
pnpm subagent:cost demo-thread
```
