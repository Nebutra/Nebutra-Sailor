# support-deflector Capability Map

## Boundary

`support-deflector` is a play-product package. It turns a support ticket and
knowledge results into a confidence-gated decision.

## Owns

- Ticket classification.
- Auto-answer / suggest / escalate decision grammar.
- Founder-control confidence threshold.
- Ticket decision artifact.

## Does Not Own

- Customer channel transport.
- Chat widget serving.
- Knowledge-base retrieval internals.
- PII redaction infrastructure outside its own artifacts.

## Current Closure

- `pnpm support-deflector:doctor`
- `pnpm support-deflector:quickstart`
- `pnpm support-deflector:debug`
