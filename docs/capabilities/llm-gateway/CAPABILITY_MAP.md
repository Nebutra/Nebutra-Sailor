# llm-gateway capability map

## Depends on

`provider-registry`.

## Decision

WRAP. The gateway adds routing, fallback, prefix prompt cache, and usage ledger over provider-registry. It does not replace provider adapters and does not own prompt authoring.

## Three-tier mapping

| Tier | Scope | Sailor landing |
| --- | --- | --- |
| SKIP | Provider SDK calls | `provider-registry` owns them |
| WRAP | Capability routing, fallback, prefix cache, cost ledger | `packages/ai/llm-gateway` |
| PORT | None for Layer 0 | Not applicable |

## Public contract

- `LlmGateway.default()`
- `gateway.complete({ capability, budgetUsd, messages })`
- `gateway.usageReport()`
- Debug trace file: `.nebutra/debug/llm-gateway.jsonl`

## Multi-tenant posture

Layer 0 keeps the cache in process for local DX. Any durable cache owner must include tenant context in the key before production use.
