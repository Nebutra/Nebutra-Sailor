# AGENTS.md — packages/metering

Execution contract for Nebutra's provider-agnostic metering package.

## Scope

Applies to everything under `packages/metering/`.

This package owns meter definitions, usage-event ingestion, usage/quota reads,
and metering provider selection. It is a foundation package with deliberate
gaps, not a fully wired billing-enforcement system yet.

## Source Of Truth

- Public package surface and provider exports: `package.json`, `src/index.ts`
- Canonical metering contracts and schemas: `src/types.ts`
- Provider selection and singleton lifecycle: `src/factory.ts`
- Standard meter definitions: `src/meters.ts`
- Framework helpers and request instrumentation: `src/middleware.ts`
- Provider implementations:
  `src/providers/clickhouse.ts`, `src/providers/memory.ts`

If usage-event semantics, quota behavior, or provider selection changes, update
the source of truth here rather than patching consuming packages.

## Contract Boundaries

- Keep `src/types.ts` as the canonical metering contract. `MeterDefinition`,
  `UsageEvent`, `UsageSummary`, `UsageQuota`, and provider interfaces define the
  package boundary.
- Preserve provider selection inside `src/factory.ts`. Do not scatter
  `METERING_PROVIDER` or ClickHouse env auto-detection across consumers.
- Keep meter definitions centralized in `src/meters.ts`. Shared meter IDs such
  as `api_calls`, `ai_tokens`, and `storage_bytes` are compatibility-sensitive
  and should not drift casually.
- Respect the current foundation status in `package.json`. The ClickHouse
  provider exists, but repo metadata still marks it as a stub/incomplete path;
  quota enforcement and aggregation rollups are not fully wired. Do not write
  scoped guidance that pretends those gaps are closed.
- Preserve the split between instrumentation helpers and provider logic.
  `src/middleware.ts` should record usage through the provider interface, not
  reimplement provider-side aggregation or quota semantics.
- Keep memory and ClickHouse providers intentionally distinct. The memory
  provider is for dev/test behavior; production semantics should not be inferred
  from its simplifications.
- Metering is a contract boundary for billing and analytics, not the place for
  app-specific pricing policy. Downstream charging rules belong in billing and
  consuming services.

## Generated And Derived Files

- This package currently exports source files directly and has no checked-in
  generated source of truth.
- Do not hand-edit transient build artifacts, ad hoc event dumps, or provider
  runtime state.
- If build or published output changes in the future, update the source files
  above instead of patching derived output.

## Validation

- Metering contract or provider changes:
  `pnpm --filter @nebutra/metering typecheck`
- Because the package currently has no package-local test suite, changes to
  provider semantics should be verified conservatively in the narrowest
  downstream consumer that exercises the affected path.
