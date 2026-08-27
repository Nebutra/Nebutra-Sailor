---
name: publish_idea
kind: play
version: 1.0.0
description: Publish an explicit, redacted idea snapshot for discovery and fork lineage
required_skills:
  - content_store.write
  - event_log.commit
sub_agents:
  - role: privacy_reviewer
    allowed_skills: [content_store.write]
depends_on_plays: []
---

## What this play does

Creates an opt-in public snapshot of an idea with lineage metadata.

## Boundaries

- Default state is private.
- Any detected sensitive field must be redacted before publishing.
- Fork attribution remains on so the lineage graph stays trustworthy.
