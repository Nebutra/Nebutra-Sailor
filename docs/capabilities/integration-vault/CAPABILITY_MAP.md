# integration-vault Capability Map

## Depends On

- `tool-protocol`

## Decision

- `WRAP`: this package owns the tenant-scoped boundary for external app credentials, consent, and invocation. Provider SDKs stay behind adapters.

## Three-Tier Map

| Item | Decision | Sailor Landing |
| --- | --- | --- |
| OAuth start flow | WRAP | `packages/integrations/integration-vault/src/index.ts` |
| Secret storage | WRAP | Uses `@nebutra/vault`; tokens are not exposed to callers. |
| Per-action consent | PORT | `SaasConsentStore` contract and default in-memory store. |
| App invocation | WRAP | Provider adapters receive decrypted tokens inside the vault boundary only. |
| Debug trace | WRAP | `.nebutra/debug/integration-vault.jsonl` for recent local operations. |

## Contracts

- Every public operation requires `tenantId`.
- `list()` returns token ids and scopes only, never plaintext tokens.
- `invoke()` returns suggestion-bearing failures instead of bare stack traces.
- Provider adapters are replaceable; callers depend on the vault contract, not a provider SDK.

## Current Scope

The checked-in implementation provides a local connector, HTTP connector boundary, encrypted token storage, consent checks, doctor/debug commands, and executable examples. Persistent production connection storage remains a provider-backed extension behind the same interface.
