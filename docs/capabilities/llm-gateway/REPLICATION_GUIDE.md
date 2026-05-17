# llm-gateway replication guide

```ts
import { LlmGateway } from "@nebutra/llm-gateway";

const gateway = LlmGateway.default();
const response = await gateway.complete({
  capability: "local",
  budgetUsd: 0.05,
  messages: [{ role: "user", content: "Write one useful sentence." }],
});

process.stdout.write(`${response.text}\n`);
process.stdout.write(`${JSON.stringify(gateway.usageReport())}\n`);
```

## Goal

Use Sailor's gateway grammar to route a model call by capability, retry through fallback providers, reuse prefix cache hits, and see an immediate usage ledger.

## Run it

```bash
pnpm gateway:doctor
tsx packages/ai/llm-gateway/examples/usage-report.ts
pnpm gateway:debug latest
```

## Files to inspect

- `packages/ai/llm-gateway/src/index.ts`
- `packages/ai/llm-gateway/examples/prefix-cache.ts`
- `.nebutra/debug/llm-gateway.jsonl`

## Replication steps

1. Verify providers with `pnpm provider:doctor`.
2. Run `pnpm gateway:doctor`.
3. Call `LlmGateway.default().complete(...)`.
4. Read `usageReport()` after the call.
5. Inspect routing decisions with `pnpm gateway:debug latest`.

## Expected result

The gateway returns a completion, records a routing decision, and updates cache/usage counters.
