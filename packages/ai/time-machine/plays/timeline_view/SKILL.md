---
name: timeline_view
kind: play
version: 1.0.0
description: Build a founder-facing timeline view from event-log history
required_skills:
  - event_log.timeline
  - content_store.write
sub_agents:
  - role: timeline_curator
    allowed_skills: [event_log.timeline, content_store.write]
depends_on_plays: []
---

## What this play does

Reads Chronos event history and produces a founder-facing star-map timeline.

## Boundaries

- Event truth stays in event-log.
- Rollback is dry-run only until the user explicitly confirms a higher-layer apply flow.
- Branches are experiments, not destructive rewrites.
