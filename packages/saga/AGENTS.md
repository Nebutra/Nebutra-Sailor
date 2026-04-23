# AGENTS.md — packages/saga

Execution contract for Nebutra's saga orchestration package.

## Scope

Applies to everything under `packages/saga/`.

This package owns saga-step orchestration, compensation sequencing,
idempotency wrappers, and checked-in example workflows that compose billing,
email, auth, and event-bus integrations. It is a workflow orchestration layer,
not a durable job queue or general event transport.

## Source Of Truth

- Public package surface: `package.json`, `src/index.ts`
- Core saga execution and compensation semantics: `src/orchestrator.ts`
- Step-level idempotency contract and in-memory store semantics:
  `src/idempotency.ts`
- Checked-in workflow examples and integration composition:
  `src/workflows/orderSaga.ts`
- Package-local behavior coverage for idempotency semantics:
  `src/__tests__/idempotency.test.ts`

Treat `README.md` as descriptive only. If examples drift, update the source
files above instead of preserving stale docs.

## Contract Boundaries

- Keep `src/orchestrator.ts` responsible for step ordering, compensation, and
  event emission semantics. Do not bury core orchestration policy inside
  workflow-specific files.
- Treat `src/idempotency.ts` as the canonical contract for idempotent step
  wrapping. The in-memory store is process-local and explicitly not durable;
  do not treat it as production-safe persistence.
- Keep workflow-specific business integration in `src/workflows/`. If a saga is
  specific to an order, billing, or product flow, model it there rather than
  widening the generic orchestrator.
- Respect the package's current `wip` status. There is no persistent journal or
  durable compensation guarantee; do not document stronger reliability than the
  package actually provides today.

## Generated And Derived Files

- This package currently exports source directly and has no checked-in codegen.
- Do not hand-edit transient execution logs, local event dumps, or future build
  output if a build step is added later.
- If workflow or idempotency behavior changes, update the source files above
  and tests rather than patching derived artifacts.

## Validation

- Idempotency, orchestration, or workflow changes:
  `pnpm --filter @nebutra/saga test`
- Export or type-surface changes:
  `pnpm --filter @nebutra/saga typecheck`
