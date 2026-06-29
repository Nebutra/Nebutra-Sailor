# @nebutra/startup-os

Status: WIP — Not yet integrated into any production app.

`@nebutra/startup-os` owns the Startup OS play surface: company context,
execution planning, generated files, rollout state, and model-tier decisions.
It composes lower AI runtime, model, database, preset, UI, and icon packages;
it does not own auth, billing, tenant lifecycle, or durable multi-run
orchestration.

## Commands

```bash
pnpm --dir packages/ai/startup-os test
pnpm --dir packages/ai/startup-os typecheck
```
