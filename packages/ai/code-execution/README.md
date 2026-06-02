# @nebutra/code-execution

Action and observation execution layer backed by `@nebutra/sandbox-runtime`.

This package turns shell, read, edit-by-diff, git, policy, replay, doctor, and
debug actions into structured observations. It owns execution behavior, not
thread state, prompts, model calls, sub-agent scheduling, or UI approval flows.

## Status: WIP

Experimental public package. The package metadata marks it as not production
ready yet because:

- notebook kernel execution is adapter-gated
- remote workspace providers depend on sandbox-runtime configuration
- approval UI is surfaced as observations and is not wired in this package

Use it as a capability layer behind an application runtime that owns approval,
tenant, and UI handoff.

## Installation

```bash
pnpm add @nebutra/code-execution
```

## Usage

```ts
import { CodeExecutor } from "@nebutra/code-execution";

const executor = new CodeExecutor({
  tenantId: "org_123",
  workspaceRoot: process.cwd(),
});

const observation = await executor.run({
  type: "read",
  path: "README.md",
});
```

Shell actions route through `@nebutra/sandbox-runtime`:

```ts
const result = await executor.run({
  type: "shell",
  cmd: "pnpm test",
  cwd: ".",
  timeoutS: 30,
});
```

## Action Types

| Type | Purpose |
| --- | --- |
| `shell` | Execute a command through the configured sandbox runtime |
| `read` | Read a workspace-relative file, optionally by line range |
| `edit` | Apply an edit-by-diff request to a workspace-relative file |
| `git` | Execute supported git operations through the sandbox path |
| `ipython` | Return an adapter-unavailable observation until a notebook sidecar is configured |

## Observations

The executor returns structured observations instead of raw side effects:

- `shell_output`
- `file_content`
- `edit_applied`
- `error`

Approval requirements are surfaced as `error` observations with the
`ApprovalRequired` kind. The caller is responsible for asking the user and
retrying with `approved: true`.

## Commands

```bash
pnpm exec:doctor
pnpm exec:debug <action_id>
pnpm exec:replay <action_id>
pnpm exec:policy
```

Executable examples live under `examples/`.

## License

MIT
