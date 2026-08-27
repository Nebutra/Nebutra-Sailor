# @nebutra/image-pipeline

Status: WIP — Not yet integrated into any production app.

`@nebutra/image-pipeline` is the BrandContext-first image capability surface.
It exposes logo, poster, hero image, icon, and workflow-shaped generation APIs.
The zero-config path writes deterministic SVG assets so examples and tests have
real files; model-backed generation is delegated to sidecar adapters.

It does not own prompt orchestration, Thread/Turn/Item state, model provider
routing, or user approval.

## Commands

```bash
pnpm image:doctor
pnpm image:debug
pnpm image:warmup
pnpm image:workflows
```
