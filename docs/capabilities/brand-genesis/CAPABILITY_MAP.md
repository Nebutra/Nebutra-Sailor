# brand-genesis Capability Map

## Depends On

- play-loader
- generation-context
- content-store
- event-log
- image-pipeline
- 3d-pipeline

## Decision Matrix

| Area | Decision | Owner |
| --- | --- | --- |
| BrandContext schema | SKIP | generation-context |
| File truth and indexed writes | WRAP | content-store |
| Time Machine checkpoint | WRAP | event-log |
| SKILL.md Play grammar | WRAP | play-loader |
| Image and mesh generation | WRAP | existing generation-capability packages |
| Idea distillation, visual direction, play checkpoints, output bundle | PORT | brand-genesis |

## Boundary

`brand-genesis` is a Play product package. It owns the user story and the
orchestration order. It does not own model routing, media generation, landing
page building, prompt storage, or a second BrandContext type.

## Current Status

The package ships a deterministic local quickstart that writes `company/BRAND.md`,
generates local fallback visual assets through existing pipelines, writes a
landing handoff, and commits an event-log checkpoint.
Model-backed quality depends on the lower generation packages being configured.
