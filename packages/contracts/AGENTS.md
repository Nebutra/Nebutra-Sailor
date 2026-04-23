# AGENTS.md — packages/contracts

Execution contract for Nebutra's canonical cross-package contracts.

## Scope

Applies to everything under `packages/contracts/`.

This package owns canonical domain schemas shared across packages. It is the
stability boundary for identity, billing, and event payload shapes. Do not
treat it as a convenience dumping ground for app-local types.

## Source Of Truth

- Public package surface and subpath exports: `package.json`, `src/index.ts`
- Canonical identity contracts: `src/identity.ts`
- Canonical billing and usage-ledger contracts: `src/billing.ts`
- Canonical event envelope contracts: `src/events.ts`

If a consumer depends on a shape defined here, change the contract here first
and then update downstream packages intentionally.

## Contract Boundaries

- Keep this package schema-first. Zod schemas and inferred types are the
  contract; do not add parallel hand-written TypeScript-only shapes in
  consumers.
- Prefer additive changes. Renaming or deleting fields, changing enum values,
  or changing default semantics here is a cross-repo breaking change even if
  typecheck still passes locally.
- Keep package boundaries explicit. `@nebutra/contracts` should define portable
  shapes, not runtime behavior, provider SDK usage, database access, or app
  framework coupling.
- Preserve version markers such as `claimsVersion` and `contractVersion`.
  Changes that alter wire semantics should flow through explicit versioning,
  not silent mutation of `v1`.
- Identity, billing, and events should remain decoupled subdomains. If a new
  contract belongs only to one of those areas, add it to the correct source
  file rather than overloading `src/index.ts`.
- Because many packages depend on these exports, treat changes here as
  compatibility-sensitive. Update downstream adapters, validators, and tests in
  the same work when needed.

## Generated And Derived Files

- `dist/` is build output from `tsup`. Do not hand-edit it.
- Temporary TypeScript artifacts and ad hoc schema snapshots are derived files.
- If published output or generated declaration files need to change, edit the
  source schema files above and rebuild.

## Validation

- Contract-surface changes:
  `pnpm --filter @nebutra/contracts typecheck`
- When changing a contract that is consumed elsewhere, verify at least one
  affected downstream package before widening the change.
