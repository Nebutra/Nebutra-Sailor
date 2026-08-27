# sandbox-runtime anti-patterns

## Agent-selected infrastructure

Do not let model output choose a sandbox provider. Route with deterministic rules.

## Naked local commands

Do not use a raw shell or process runner as the local sandbox. The local path must go through the Rust sidecar.

## Duplicated retry policy

Retry/fallback behavior belongs above adapters. Do not copy retry loops into each provider.

## Missing tenant context

Every execution request must carry tenant and thread identifiers.
