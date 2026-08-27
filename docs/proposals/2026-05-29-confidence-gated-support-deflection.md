# Proposal: Confidence-Gated Support Deflection

## Status

Proposed on 2026-05-29. No production exposure. Any prototype must stay behind a default-off feature flag and be clearly labeled as unreviewed.

## The real job

Teams with docs, blog content, and product telemetry want to stop answering the same support questions by hand, but they do not want a hallucinating chatbot pretending to know the answer.

The job is:

`deflect repetitive tickets when evidence is strong, escalate fast when evidence is weak`

## Why this is not trend-chasing

This is not "add AI chat because everyone has one." The proposal is explicitly anti-cargo-cult:

- no open-ended support bot persona
- no fake certainty
- no hidden routing

The product succeeds only if it produces a decision artifact with confidence, citations, and escalation reason.

## Proposed product shape

A support-decision layer that accepts a ticket or inbound message and returns one of:

- `auto-answer`
- `suggest-draft-for-human`
- `escalate`

Every result includes:

- cited knowledge sources
- confidence score and threshold
- classification label
- redaction and audit metadata

## AI and business mechanism

AI mechanism:

- use retrieval from tenant-scoped knowledge and docs
- classify ticket type and answerability
- synthesize only when citations are sufficient

Business mechanism:

- reduces repetitive support cost
- increases trust in Nebutra's AI governance story
- creates a strong dogfooding surface for knowledge-base, queue, audit, and analytics

## Reuse vs new build

Reuse directly:

- `@nebutra/support-deflector` for the decision grammar
- `@nebutra/knowledge-base` for explainable tenant-scoped knowledge retrieval
- `@nebutra/queue` for async processing and retry
- `@nebutra/audit` for decision trace logging
- `@nebutra/analytics` for deflection and escalation reporting
- `@nebutra/vault` if connector credentials are needed later

New work:

- ticket ingestion adapters and normalized ticket schema
- confidence policy configuration per tenant
- operator review UI for approved drafts and escalations
- knowledge freshness checks for stale answer sources

## Success metrics

- percent of repetitive tickets auto-answered with no human touch
- human acceptance rate of AI-suggested drafts
- escalation precision on low-confidence cases
- citation coverage per resolved ticket
- reduction in first-response time

## Implementation sketch

1. Define a canonical ticket decision contract in front of existing channel adapters.
2. Wire `support-deflector` to `knowledge-base` explain output instead of free-form prompts.
3. Persist decision artifacts and review outcomes for threshold tuning.
4. Add an internal operator console showing ticket, draft, citations, and override action.
5. Add reporting on deflection rate, escalation rate, and stale-knowledge failure modes.

## Effort

Estimated `M`:

- 2 weeks for a narrow internal help-center style pilot
- 3 to 4 weeks for multi-channel ingestion and review tooling

## Main risks

- knowledge-base still needs production connector and graph hardening
- stale docs can make the system look smarter than it is
- if threshold tuning is weak, the product becomes annoying instead of useful

## Benchmark essence

What to copy in substance, not surface:

- Notion AI: search and synthesis should happen where the team already stores truth
- Sanity: structured content beats blob text when answers need traceability
- Inngest: retries, replay, and observability matter more than chat theatrics
- Cursor: confidence comes from context retrieval, not prompt swagger
- Obsidian: knowledge systems win when source material stays inspectable

Official references:

- [Notion AI](https://www.notion.com/PRODUCT/AI)
- [Sanity](https://www.sanity.io/)
- [Inngest](https://www.inngest.com/)
- [Cursor](https://cursor.com/en-US/product)
- [Obsidian Help](https://obsidian.md/help/)

## Decision

This is the best medium-effort proposal because it turns several honest WIP capabilities into one concrete operator job with measurable ROI.
