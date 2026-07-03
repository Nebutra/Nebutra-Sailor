# @nebutra/startup-os

Status: WIP — Not yet integrated into any production app.

`@nebutra/startup-os` owns the typed Startup OS orchestration contracts used by
the dashboard: company context compilation, founder conversation streaming,
execution/run state, generated files, canvas state, rollout gates, and
model-tier selection.

The package is intentionally not a production surface by itself. It composes
lower AI runtime, model, database, preset, UI, and icon packages; hosted
execution, route-level auth, persistence wiring, billing, tenant lifecycle, and
durable multi-run orchestration remain app-owned until the Startup OS runtime is
fully integrated.

## Commands

```bash
pnpm --dir packages/ai/startup-os test
pnpm --dir packages/ai/startup-os typecheck
```
