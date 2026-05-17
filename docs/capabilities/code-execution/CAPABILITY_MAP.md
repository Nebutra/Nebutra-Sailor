# code-execution Capability Map

## Depends On

- `sandbox-runtime`
- `agent-loop`
- `event-log`

## Decision Matrix

| Decision | Sailor landing | Notes |
| --- | --- | --- |
| SKIP | process spawning in agent loop | The runtime loop never spawns commands directly. |
| WRAP | sandbox execution | Shell and git actions delegate to `@nebutra/sandbox-runtime`. |
| PORT | Action and Observation grammar | The package owns serializable shell, read, edit, notebook, and git actions plus corresponding observations. |
| PORT | edit-by-diff | File mutation uses unified diff application, not overwrite semantics. |
| PORT | command policy | Destructive operations return approval-required observations before execution. |

## Public Contract

- `CodeExecutor.run(action)` returns an `Observation`.
- `DefaultPolicy` blocks destructive commands unless `approved: true`.
- `applyUnifiedDiff()` is the only built-in edit mutation primitive.
- Debug traces are written to `.nebutra/debug/code-execution.jsonl`.

## Boundary Rules

- Every action needs tenant context.
- Shell never runs inside the Node process.
- Secrets are not passed through prompts or environment variables.
- Long-running and remote execution policy remains in sandbox-runtime.
