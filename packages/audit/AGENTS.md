# AGENTS.md — packages/audit

Execution contract for Nebutra's audit logging package.

## Scope

Applies to everything under `packages/audit/`.

This package owns audit event types, storage adapters, and write/query entry
points for security- and compliance-relevant activity logs. It is a foundation
logging boundary, not the place for app-specific policy or UI filtering logic.

## Source Of Truth

- Public package surface: `package.json`, `src/index.ts`
- Canonical audit contracts:
  `AuditAction`,
  `AuditEvent`,
  `AuditStorage`,
  `AuditQueryFilter`
- Default dev/test storage and singleton lifecycle:
  `inMemoryStorage`, `setAuditStorage`
- Prisma-backed storage adapter:
  `createPrismaStorage`
- Main runtime entry points:
  `audit`, `queryAuditLogs`, convenience helpers in `src/index.ts`

If audit event shape, storage semantics, or adapter behavior changes, update
the source of truth here rather than patching downstream consumers.

## Contract Boundaries

- Keep `src/index.ts` as the canonical audit contract. Event fields and action
  names are compatibility-sensitive even when consumers compile unchanged.
- Preserve the split between storage adapters and event producers. Apps should
  emit audit events through this package instead of reimplementing write logic.
- Keep Prisma field mapping centralized in `createPrismaStorage`. Do not spread
  `AuditEvent` to database-column translation across callers.
- Treat `setAuditStorage` as the only supported override point for tests or
  alternate backends. Do not add parallel global storage toggles elsewhere.
- Respect the package's current `wip` status in `package.json`. Query API and
  schema evolution are not finalized, so avoid writing scoped guidance that
  assumes a stable production analytics surface already exists.
- Audit durability and reporting are separate concerns. This package owns event
  recording and retrieval semantics, not downstream dashboards or retention
  policy.

## Generated And Derived Files

- This package currently exports source files directly and has no checked-in
  generated source of truth.
- Do not hand-edit transient audit dumps, local memory snapshots, or future
  build output.
- If generated output is introduced later, update the source files above rather
  than patching derived artifacts.

## Validation

- Audit contract changes:
  `pnpm exec tsc -p packages/audit/tsconfig.json --noEmit`
- Because the package currently has no package-local test script, verify the
  narrowest downstream consumer that exercises the changed audit path.
