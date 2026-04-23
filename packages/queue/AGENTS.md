# AGENTS.md — packages/queue

Execution contract for Nebutra's provider-agnostic queue package.

## Scope

Applies to everything under `packages/queue/`.

This package owns job payload contracts, queue provider selection, enqueue and
handler registration semantics, and provider-specific transport boundaries. It
is a foundation async-execution layer, not an app-specific workflow package.

## Source Of Truth

- Public package surface and subpath exports: `package.json`, `src/index.ts`
- Canonical job and provider contracts: `src/types.ts`
- Provider selection, singleton lifecycle, and `createJob` helper:
  `src/factory.ts`
- QStash webhook verification boundary:
  `src/middleware/qstash-verify.ts`
- Provider implementations:
  `src/providers/qstash.ts`,
  `src/providers/bullmq.ts`,
  `src/providers/memory.ts`

If job semantics, provider selection, or handler behavior changes, update the
source of truth here rather than patching consumers.

## Contract Boundaries

- Keep `src/types.ts` as the canonical queue contract. `JobPayload`,
  `JobOptions`, `QueueProvider`, `JobHandler`, and provider config types define
  the package boundary.
- Preserve provider selection inside `src/factory.ts`. Do not scatter
  `QUEUE_PROVIDER`, `QSTASH_TOKEN`, or `REDIS_URL` detection logic across
  consuming packages.
- Keep `createJob` simple and contract-focused. App-specific defaults,
  workflow policies, and queue naming conventions belong outside this package.
- Preserve the distinction between provider behavior:
  QStash is HTTP-callback based and depends on registered handler lookup plus
  webhook verification,
  BullMQ is Redis worker based with polling workers and status inspection,
  Memory is dev/test only and intentionally simplified.
- Keep QStash signature verification centralized in
  `src/middleware/qstash-verify.ts`. Do not duplicate verification or handler
  routing logic in apps.
- Respect the current foundation status in `package.json`. DLQ work, auto-scaling,
  and additional adapters are not complete; do not write scoped guidance that
  assumes they already exist.
- Queue transport and workflow semantics are separate concerns. This package
  owns how jobs are represented and delivered, not what higher-level business
  workflows should do.

## Generated And Derived Files

- This package currently exports source files directly and has no checked-in
  generated source of truth.
- Do not hand-edit transient runtime queue state, Redis snapshots, or ad hoc
  webhook payload dumps.
- If build output changes in the future, update the source files above rather
  than patching derived output.

## Validation

- Queue contract or provider changes:
  `pnpm --filter @nebutra/queue typecheck`
- Because the package currently has no package-local test suite, changes to
  provider semantics should be verified conservatively in the narrowest
  downstream consumer that exercises the affected path.
