# outreach-engine Replication Guide

## Quickstart

```bash
pnpm outreach-engine:doctor
pnpm outreach-engine:quickstart "decision makers at mid-size D2C companies"
pnpm play:parse packages/ai/outreach-engine/plays/outreach_campaign/SKILL.md
```

## Expected Output

The Play writes an `outreach/*.json` draft with ICP, planned leads, a sequence,
schedule limits, compliance status, and an event-log checkpoint.

No email is sent during quickstart.
