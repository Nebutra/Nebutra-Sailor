# code-execution Replication Guide

```ts
import { CodeExecutor } from "@nebutra/code-execution";

const exec = new CodeExecutor({ tenantId: "local" });

const obs = await exec.run({
  type: "shell",
  tenantId: "local",
  cwd: process.cwd(),
  cmd: "echo sandbox ok",
  timeoutS: 5,
});

console.log(obs);
```

## Steps

1. Convert tool calls into serializable `Action` values.
2. Run shell and git actions through sandbox-runtime.
3. Apply file changes with unified diff edits.
4. Persist action and observation logs for replay.
5. Return suggestion-bearing `error` observations instead of bare stack traces.

## Commands

```bash
pnpm exec:doctor
pnpm exec:debug
pnpm exec:policy
pnpm exec:replay <action_id>
tsx packages/ai/code-execution/examples/policy.ts
```
