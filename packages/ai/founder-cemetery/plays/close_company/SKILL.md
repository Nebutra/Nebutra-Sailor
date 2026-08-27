---
name: close_company
kind: play
version: 1.0.0
description: Guide a founder through pause, archive, or evidence-backed memorial publishing
required_skills:
  - content_store.write
  - event_log.commit
sub_agents:
  - role: postmortem_curator
    allowed_skills: [content_store.write]
depends_on_plays: []
---

## What this play does

Starts with a reversible pause recommendation, then helps the founder decide whether to archive or publish a memorial.

## Boundaries

- There is no one-click delete.
- Public memorials need consent and a cooling-off period.
- Lessons must link back to evidence from the company timeline.
