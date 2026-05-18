# @nebutra/play-loader

Status: WIP — Not yet integrated into any production app.

`@nebutra/play-loader` owns declarative Play loading, SKILL.md-compatible play
schema parsing, dependency planning, version checks, and the seam that hands a
validated play to the runtime.

It does not own tool implementation, model/provider execution, or durable
Thread/Turn/Item storage. Those are injected through the runtime, registry, and
execution capability packages.

## Commands

```bash
pnpm play:list
pnpm play:new <name>
pnpm play:test <name>
pnpm play:debug <thread_id>
```
