---
name: ticket_triage
kind: play
version: 1.0.0
description: Triage a support ticket into auto-answer, suggest-answer, or escalate
inputs:
  ticket: { type: object }
  support_policy: { type: object }
outputs:
  decision: { type: file, path: support/tickets/ticket.json, mime: application/json }
budget:
  duration_s: 30
  cost_usd: 0.2
required_skills:
  - knowledge_base.search
  - content_store.write
  - event_log.commit
sub_agents:
  - role: support_triager
    allowed_skills: [knowledge_base.search, content_store.write]
  - role: escalation_summarizer
    allowed_skills: [content_store.write]
depends_on_plays: []
---

## What this play does

Classifies a new customer-support ticket, finds relevant knowledge, then returns
a confidence-gated decision.

## Rules

- Escalate angry, complaint, or high-value customer tickets.
- Auto-answer only when confidence exceeds policy threshold.
- Keep the founder in control of medium-confidence replies.
- Redact personally sensitive data before trace-store emission.
