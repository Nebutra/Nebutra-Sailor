# @nebutra/browser-control

Status: WIP — Not yet integrated into any production app.

`@nebutra/browser-control` owns browser task execution ports, action recording,
deterministic replay, profile metadata, doctor output, and debug inspection.
It is an execution capability package: callers decide when browser work should
run, and this package performs the browser-shaped work.

It does not own Thread/Turn/Item state, prompt generation, model calls,
sub-agent scheduling, or approval lifecycle. Those remain in the runtime and
tool layers.

## Commands

```bash
pnpm browser:doctor
pnpm browser:debug <session_id>
pnpm browser:replay <session_id>
```

## Examples

Executable examples live under `examples/`:

- `deterministic-replay.ts`
- `first-run-recording.ts`
- `http-extract.ts`
