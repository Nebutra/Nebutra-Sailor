# AGENTS.md — packages/repositories

Execution contract for Nebutra's shared data-access repositories.

## Scope

Applies to everything under `packages/repositories/`.

This package owns thin repository wrappers over `@nebutra/db` for common
organization, user, membership, webhook, and usage-ledger access patterns. It
is a data-access boundary, not the place for app orchestration, transport
logic, or tenant-policy decisions.

## Source Of Truth

- Public package surface: `package.json`, `src/index.ts`
- Shared pagination contract: `src/pagination.ts`
- Repository implementations:
  `src/organization.repository.ts`,
  `src/organization-member.repository.ts`,
  `src/user.repository.ts`,
  `src/usage-ledger.repository.ts`,
  `src/webhook-event.repository.ts`

## Contract Boundaries

- Keep `src/index.ts` as the canonical export surface. Consumers should use the
  repository package instead of deep-importing individual files by path.
- Treat each repository file as the contract for the Prisma model access it
  wraps. Repository methods should stay focused on durable query and mutation
  semantics, not app-specific business workflows.
- Preserve `src/pagination.ts` as the shared cursor-pagination contract. Limit
  normalization and cursor semantics should not drift across repositories.
- Preserve the idempotent claim contract in `src/usage-ledger.repository.ts`.
  Callers should use `claim()` rather than rebuilding check-then-act flows
  around the same uniqueness boundary.
- This package depends on `@nebutra/db` as the schema source of truth. If a
  Prisma model change requires repository updates, change the db schema and the
  affected repository together rather than patching downstream callers first.

## Generated And Derived Files

- This package has no checked-in generated source of truth.
- Prisma client code lives in `@nebutra/db` and is derived there, not here.
- Do not hand-edit transient query dumps or ad hoc generated typings in this
  package.

## Validation

- This package currently has no package-local validation script.
- Repository contract changes should be validated in the narrowest affected
  consumer and, when model semantics change, alongside the relevant
  `@nebutra/db` verification.

