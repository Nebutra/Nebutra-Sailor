# sandbox-runtime capability map

## Depends on

None.

## Decision

WRAP. The TypeScript package owns the sandbox interface and deterministic routing. Local execution delegates to the Rust sandbox sidecar. Remote providers are explicit adapters and are not selected by an agent.

## Three-tier mapping

| Tier | Scope | Sailor landing |
| --- | --- | --- |
| SKIP | LLM-driven infrastructure choice | Not allowed |
| WRAP | Sandbox trait, provider health, deterministic plan | `packages/ai/sandbox-runtime` |
| PORT | Local isolated hello-world executor | `backends/rust/sandbox` |

## Public contract

- `SandboxRuntime.fromConfig()`
- `runtime.plan({ cmd, hints })`
- `runtime.exec({ cmd, tenantId, threadId, hints })`
- Debug trace file: `.nebutra/debug/sandbox-runtime.jsonl`

## Multi-tenant posture

Every execution request carries tenant and thread context. Missing tenant/thread scope is refused by the Rust sidecar.
