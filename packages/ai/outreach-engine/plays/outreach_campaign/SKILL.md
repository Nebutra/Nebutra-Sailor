---
name: outreach_campaign
kind: play
version: 1.0.0
description: Create a compliance-gated founder-led outbound campaign draft
inputs:
  icp_description: { type: string, max_length: 500 }
  target_count: { type: number }
  product: { type: string, max_length: 500 }
  sequence_length: { type: number }
  send_per_day: { type: number }
outputs:
  campaign: { type: file, path: outreach/campaign.json, mime: application/json }
budget:
  duration_s: 600
  cost_usd: 2.0
required_skills:
  - content_store.write
  - research_agent.run
  - integration_vault.invoke
sub_agents:
  - role: icp_strategist
    allowed_skills: [content_store.write]
  - role: lead_researcher
    allowed_skills: [research_agent.run]
  - role: compliance_reviewer
    allowed_skills: [content_store.write]
depends_on_plays: []
---

## What this play does

Creates a draft outbound campaign from an ICP description.

The Play is draft-first. It may produce leads, enrichment notes, email variants,
and a schedule, but actual sending requires explicit approval and a configured
sender adapter.

## Rules

- Never bypass unsubscribe, physical address, or consent basis checks.
- Never send directly from the Play run.
- Keep lead data tenant-scoped.
- Write campaign artifacts through content-store.
