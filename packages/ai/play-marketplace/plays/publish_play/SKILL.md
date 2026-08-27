---
name: publish_play
kind: play
version: 1.0.0
description: Validate and publish a SKILL.md Play into the controlled marketplace registry
required_skills:
  - play_loader.parse
  - content_store.write
  - event_log.commit
sub_agents:
  - role: registry_reviewer
    allowed_skills: [play_loader.parse, content_store.write]
depends_on_plays: []
---

## What this play does

Validates a Play declaration, writes a signed registry artifact, and prepares install metadata.

## Boundaries

- SKILL.md parsing belongs to play-loader.
- Paid publishing stays gated during controlled launch.
- Billing and remote registry transport are explicit handoffs.
