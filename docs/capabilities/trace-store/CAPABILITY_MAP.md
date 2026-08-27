# trace-store capability map

## Depends on

None.

## Decision

SKIP + WRAP. Use the existing logging and telemetry grammar, then expose a capability-focused span emitter with async batching, redaction, doctor, and debug.

## Three-tier mapping

| Tier | Scope | Sailor landing |
| --- | --- | --- |
| SKIP | Business events and workflow state | Owned by each capability |
| WRAP | Agent/tool/llm spans, redaction, batching | `packages/platform/trace-store` |
| PORT | None for Layer 0 | Not applicable |

## Public contract

- `TraceStore.default()`
- `trace.start("agent" | "tool" | "llm", name, attributes)`
- `span.end(attributes)` / `span.fail(error)`
- Debug trace file: `.nebutra/debug/trace-store.jsonl`

## Multi-tenant posture

Trace attributes must be redacted before export. Tenant identifiers may be included, but secrets and credentials are always replaced.
