# trace-store replication guide

```ts
import { TraceStore } from "@nebutra/trace-store";

const trace = TraceStore.default();
const span = trace.start("tool", "write_file", {
  traceId: "thread_1",
  tenantId: "local",
});

span.end({ path: "hello.md" });
await trace.flush();

process.stdout.write("trace flushed\n");
```

## Goal

Emit capability spans for agent, tool, and model work without blocking the hot path or leaking secrets.

## Run it

```bash
pnpm trace:doctor
tsx packages/platform/trace-store/examples/batch-flush.ts
pnpm trace:debug latest
```

## Files to inspect

- `packages/platform/trace-store/src/index.ts`
- `packages/platform/trace-store/examples/tool-span.ts`
- `.nebutra/debug/trace-store.jsonl`

## Replication steps

1. Start a span with trace and tenant attributes.
2. End or fail the span.
3. Flush the batch before process exit.
4. Inspect the debug JSONL file.

## Expected result

The debug file contains redacted span records with duration and status.
