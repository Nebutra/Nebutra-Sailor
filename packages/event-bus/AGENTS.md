# AGENTS.md — packages/event-bus

Execution contract for Nebutra's cross-service event transport package.

## Scope

Applies to everything under `packages/event-bus/`.

This package owns base event transport semantics, the in-process bus runtime,
dead-letter handling for local retries, exported event type constants, and the
checked-in Inngest schema map used by consumers. It is a shared transport and
schema package, not an app-local workflow orchestrator.

## Source Of Truth

- Public package surface and subpath exports: `package.json`, `src/index.ts`
- Base event shape, publish/subscribe semantics, retry loop, and Inngest send
  bridge: `src/bus.ts`
- DLQ entry shape and in-process dead-letter operations: `src/dlq.ts`
- Exported generic event name catalog: `src/events/index.ts`
- Canonical checked-in Inngest event schemas and payload contracts:
  `src/schemas/inngest.ts`

Treat `README.md` as descriptive only. If docs or consumers drift, update the
source files above rather than preserving outdated examples.

## Contract Boundaries

- Keep `src/index.ts` and `package.json` aligned. If the public API changes,
  update exports deliberately instead of relying on deep imports from consumers.
- Treat `src/schemas/inngest.ts` as the canonical contract for checked-in event
  payload schemas. Additive changes are safest; renames, removals, or shape
  tightening should be treated as compatibility changes for downstream workers.
- Preserve the distinction between the local bus and durable delivery:
  `src/bus.ts` owns in-memory subscription, local retry, and best-effort
  forwarding to Inngest; it is not a general workflow engine or a guarantee of
  cross-service delivery.
- Preserve the distinction between bus and DLQ:
  `src/bus.ts` decides when a handler has exhausted retries,
  `src/dlq.ts` owns recording, inspecting, acknowledging, and clearing failed
  entries.
  Do not blur DLQ state into general event history or app-level recovery logic.
- Keep provider/runtime assumptions centralized in `src/bus.ts`. The current
  runtime is an in-process bus with an embedded Inngest client. Do not scatter
  environment detection or alternate transport selection across consumers.
- Respect the current `wip` status in `package.json`. Cross-service pub/sub
  guarantees and production app integrations are not complete; do not document
  or code against stronger guarantees than the package actually provides today.

## Generated And Derived Files

- This package currently exports source directly and has no checked-in generated
  source of truth.
- Do not hand-edit transient event logs, DLQ snapshots, local payload dumps, or
  future build output.
- If a future codegen or export step is added, update the schema or source files
  above and regenerate, rather than patching derived artifacts.

## Validation

- Event schema, export, bus, or DLQ changes:
  `pnpm --filter @nebutra/event-bus typecheck`
- Because the package currently has no package-local test suite, changes to
  transport semantics should be verified conservatively in the narrowest
  downstream consumer or integration that exercises the affected event path.
