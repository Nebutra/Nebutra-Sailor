# sandbox-runtime replication guide

```ts
import { SandboxRuntime } from "@nebutra/sandbox-runtime";

const runtime = SandboxRuntime.fromConfig();
const result = await runtime.exec({
  cmd: "echo sandbox ok",
  tenantId: "local",
  threadId: "thread_1",
  hints: { needsGpu: false },
});

process.stdout.write(`${result.executedOn}: ${result.aggregatedOutput}`);
```

## Goal

Run delegated code through an explicit sandbox contract and deterministic route plan. Layer 0 includes a local built-in hello-world executor and refuses arbitrary commands without an isolation backend.

## Run it

```bash
pnpm sandbox:plan "echo sandbox ok"
pnpm sandbox:doctor
tsx packages/ai/sandbox-runtime/examples/local-echo.ts
```

## Files to inspect

- `packages/ai/sandbox-runtime/src/index.ts`
- `backends/rust/sandbox/src/main.rs`
- `.nebutra/debug/sandbox-runtime.jsonl`

## Replication steps

1. Start the Rust sandbox service.
2. Run `pnpm sandbox:plan "echo sandbox ok"`.
3. Run `pnpm sandbox:doctor`.
4. Execute the quickstart.
5. Inspect sandbox debug output.

## Expected result

The hello-world path returns `sandbox ok` from `local_builtin`. Arbitrary commands are refused with a suggestion-bearing error.
