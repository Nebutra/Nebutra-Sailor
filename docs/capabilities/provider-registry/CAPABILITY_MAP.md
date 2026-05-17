# provider-registry capability map

## Depends on

None.

## Decision

SKIP / wire-only. This package defines the provider trait, local default provider, registry, doctor, and debug surface. It does not own routing, prompt caching, fallback, token accounting policy, or business workflow.

## Three-tier mapping

| Tier | Scope | Sailor landing |
| --- | --- | --- |
| SKIP | Business routing, prompt strategy, cache policy | Owned by higher layers |
| WRAP | Provider completion and health checks | `packages/ai/provider-registry` |
| PORT | None for Layer 0 | Not applicable |

## Public contract

- `LLMProvider.complete(messages, options)`
- `LLMProvider.doctor()`
- `ProviderRegistry.default().get("local")`
- Debug trace file: `.nebutra/debug/provider-registry.jsonl`

## Multi-tenant posture

The registry is stateless. Any persisted call detail is written only to the shared debug JSONL for local DX and must not be treated as tenant storage.
