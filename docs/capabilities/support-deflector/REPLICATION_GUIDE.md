# support-deflector Replication Guide

## Quickstart

```bash
pnpm support-deflector:doctor
pnpm support-deflector:quickstart
pnpm play:parse packages/ai/support-deflector/plays/ticket_triage/SKILL.md
```

## Expected Output

The Play writes `support/tickets/<ticket>.json` with the ticket, decision,
confidence score, reply candidate, and event-log checkpoint.
