---
name: brand_film_60s
kind: play
version: 1.0.0
description: From one idea to a brand system, generated assets, narration, and a 60s film manifest
inputs:
  idea:
    type: string
    max_length: 500
    description: One-sentence company idea
  founder_voice_id:
    type: string
    optional: true
    description: Enrolled voice profile for narration
  visual_direction_hint:
    type: enum
    options: [cyberpunk, minimal, organic, playful, corporate, retro, futurist]
    optional: true
outputs:
  brand_md: { type: file, path: company/BRAND.md, mime: text/markdown }
  logo: { type: file, path: company/assets/logo.svg, mime: image/svg+xml }
  palette: { type: file, path: company/assets/palette.json, mime: application/json }
  film: { type: file, path: company/film_60s.mp4, mime: video/mp4 }
  landing: { type: file, path: company/landing/index.html, mime: text/html }
  bgm: { type: file, path: company/audio/bgm.wav, mime: audio/wav }
budget:
  duration_s: 300
  cost_usd: 5
  alert_at_pct: 80
required_skills:
  - image_pipeline.generate
  - video_pipeline.plan
  - video_pipeline.render
  - video_pipeline.compose
  - audio_pipeline.generate
  - voice_realtime.synthesize_narration
  - mesh_pipeline.from_image
  - content_store.write
required_plays:
  - one_pager
sub_agents:
  - role: brand_strategist
    allowed_skills: [llm_gateway.complete, content_store.write]
  - role: visual_designer
    allowed_skills: [image_pipeline.generate, mesh_pipeline.from_image, content_store.write]
  - role: video_director
    allowed_skills: [video_pipeline.plan, video_pipeline.render, video_pipeline.compose]
  - role: music_composer
    allowed_skills: [audio_pipeline.generate]
  - role: narrator
    allowed_skills: [voice_realtime.synthesize_narration]
  - role: web_builder
    allowed_skills: [play_loader.run]
depends_on_plays: []
checkpoints:
  - after_step: brand_distillation
  - after_step: visual_direction
  - after_step: assets_generated
  - after_step: video_rendered
  - after_step: final_compose
---

## What this play does

Creates a first brand package from one short company idea. The Play must first
materialize `company/BRAND.md`; every downstream media call reads the resulting
BrandContext instead of inventing its own style.

## Steps

1. Distill the idea into a compact brand identity.
2. Choose one visual direction and write `company/BRAND.md`.
3. Generate independent visual assets in parallel.
4. Plan the storyboard before any video rendering.
5. Render video, then generate music and narration with the final timing.
6. Compose the film manifest and write a landing handoff manifest.
7. Commit the resulting paths to the event log.

## Anti-patterns

- Do not generate assets without BrandContext.
- Do not define image, video, audio, voice, or mesh generation logic here.
- Do not skip storyboard planning.
- Do not hardcode one visual style across all companies.
