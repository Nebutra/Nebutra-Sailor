# @nebutra/code-execution

Status: WIP — Not yet integrated into any production app.

`@nebutra/code-execution` owns action/observation execution for shell, read,
edit-by-diff, git, policy checks, replay, doctor output, and debug inspection.
It routes process execution through sandbox contracts and returns structured
observations with suggestions.

It does not own Thread/Turn/Item state, prompt generation, model calls,
sub-agent scheduling, or approval lifecycle. Approval requests are surfaced as
observations for the runtime or UI to handle.

## Commands

```bash
pnpm exec:doctor
pnpm exec:debug <action_id>
pnpm exec:replay <action_id>
pnpm exec:policy
```

## Examples

Executable examples live under `examples/`:

- `edit-by-diff.ts`
- `policy.ts`
- `shell.ts`
