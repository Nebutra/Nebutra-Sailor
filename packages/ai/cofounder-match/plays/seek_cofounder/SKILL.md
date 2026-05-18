---
name: seek_cofounder
kind: play
version: 1.0.0
description: Build an activity-verified profile and surface explainable cofounder matches
required_skills:
  - content_store.write
  - event_log.commit
sub_agents:
  - role: match_explainer
    allowed_skills: [content_store.write]
depends_on_plays: []
---

## What this play does

Builds a behavior-derived founder profile and explains complementary matches.

## Boundaries

- Matching is locked until the founder has at least 30 days of real activity.
- Chat opens only after mutual consent.
- Match explanations must be visible; hidden algorithmic matching is not allowed.
