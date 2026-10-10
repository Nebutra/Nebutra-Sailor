---
name: brand_kit
kind: play
version: 2.0.0
description: From one idea to a brand system, generated visual assets, and a landing handoff
inputs:
  idea:
    type: string
    max_length: 500
    description: One-sentence company idea
  visual_direction_hint:
    type: enum
    options: [cyberpunk, minimal, organic, playful, corporate, retro, futurist]
    optional: true
outputs:
  brand_md: { type: file, path: company/BRAND.md, mime: text/markdown }
  logo: { type: file, path: company/assets/logo.svg, mime: image/svg+xml }
  palette: { type: file, path: company/assets/palette.json, mime: application/json }
  landing: { type: file, path: company/landing/index.html, mime: text/html }
budget:
  duration_s: 120
  cost_usd: 2
  alert_at_pct: 80
required_skills:
  - image_pipeline.generate
  - mesh_pipeline.from_image
  - content_store.write
required_plays:
  - one_pager
sub_agents:
  - role: brand_strategist
    allowed_skills: [llm_gateway.complete, content_store.write]
  - role: visual_designer
    allowed_skills: [image_pipeline.generate, mesh_pipeline.from_image, content_store.write]
  - role: web_builder
    allowed_skills: [play_loader.run]
depends_on_plays: []
checkpoints:
  - after_step: brand_distillation
  - after_step: visual_direction
  - after_step: assets_generated
  - after_step: landing_handoff
---

## What this play does

Creates a first brand kit from one short company idea. The Play must first
materialize `company/BRAND.md`; every downstream generation call reads the
resulting BrandContext instead of inventing its own style.

## Steps

1. Distill the idea into a compact brand identity.
2. Choose one visual direction and write `company/BRAND.md`.
3. Generate independent visual assets in parallel.
4. Write a landing handoff manifest.
5. Commit the resulting paths to the event log.

## Anti-patterns

- Do not generate assets without BrandContext.
- Do not define image or mesh generation logic here.
- Do not hardcode one visual style across all companies.
