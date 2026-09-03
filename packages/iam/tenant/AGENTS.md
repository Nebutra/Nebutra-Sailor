# AGENTS.md — packages/tenant

Execution contract for Nebutra's tenant context and isolation package.

## Scope

Applies to everything under `packages/iam/tenant/`.

This package owns request-scoped tenant context, tenant resolution helpers,
middleware hooks, and database-isolation utilities. It is the shared tenancy
boundary, not the place for app-specific organization UX or billing policy.

## Source Of Truth

- Public package surface and subpath exports: `package.json`, `src/index.ts`
- Canonical tenant types, schemas, and errors: `src/types.ts`
- AsyncLocalStorage tenant context lifecycle: `src/context.ts`
- Tenant resolution strategies: `src/resolvers.ts`
- Database isolation helpers and Prisma-facing semantics: `src/isolation.ts`
- Framework integration points:
  `src/middleware.ts`, `src/react.ts`

## Contract Boundaries

- Keep `src/types.ts` as the canonical tenancy contract. `TenantContext`,
  `TenantInfo`, `TenantConfig`, `TenantResolver`, and the tenancy errors define
  the shared API.
- Preserve request-scoped context behavior in `src/context.ts`. Do not create
  parallel tenant-context stores in consuming packages.
- Keep extraction strategies in `src/resolvers.ts`. Header, path, subdomain,
  JWT, and API-key resolution semantics should not be duplicated elsewhere.
- Preserve the isolation split in `src/isolation.ts`:
  `withRls` owns shared-schema RLS setup,
  `getTenantSchema` owns schema naming,
  `getTenantDatabaseUrl` owns database-per-tenant URL derivation.
- `src/rls-session.ts` is the single tenant session core: the
  `app.current_tenant_id` setting key, the `APP_DB_ROLE` validation, and the
  `SET LOCAL ROLE` + `set_config(..., true)` statement plan. `withRls` here and
  `withTenantContext` in `@nebutra/db/rls` both run it; never write those
  statements in a second place (closure P1.2, pinned by
  `tests/architecture/tenant-cutover-contract.test.ts`). The module has no
  runtime imports so `@nebutra/db` can depend on it without a cycle.
- Respect the package's current foundation status. Schema-per-tenant
  migrations, JWT/subdomain flows, and full isolation automation are not fully
  shipped; do not document or assume stronger guarantees than the code has.

## Generated And Derived Files

- This package currently exports source files directly and has no checked-in
  generated source of truth.
- Do not hand-edit transient request snapshots, test harness output, or ad hoc
  generated helpers.
- If the public surface changes, update `package.json` and the source files
  above instead of patching derived output.

## Validation

- Package contract changes:
  `pnpm --filter @nebutra/tenant typecheck`
- Run the package-local suite before changing resolver or isolation behavior:
  `pnpm --filter @nebutra/tenant test` (`vitest run --config vitest.config.ts`).
  It covers tenant resolvers (including the auth-session resolver), RLS
  isolation, and the AsyncLocalStorage tenant context. Also verify the
  narrowest affected downstream consumer.

