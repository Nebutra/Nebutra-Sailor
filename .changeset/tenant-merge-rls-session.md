---
"@nebutra/tenant": minor
"@nebutra/db": patch
---

One implementation behind `withRls` and `withTenantContext` (closure P1.2).

`@nebutra/tenant/isolation` now exports the tenant session core — `applyTenantSession`,
`tenantSessionOperations`, `resolveRlsRole`, `isValidDbRole`, `TENANT_SESSION_SETTING`,
`TENANT_SESSION_EXPRESSION` — the shared implementation of the `app.current_tenant_id`
setting key, the `APP_DB_ROLE` validation, and the transaction-local `SET LOCAL ROLE`
+ `set_config(..., true)` statements. `withRls` runs it as a batch transaction;
`withTenantContext` / `withAdminContext` in `@nebutra/db/rls` run it inside an interactive
transaction. Both public wrappers keep their signatures. An explicit invalid `role` option
now throws `TenantIsolationError` (was a bare `Error`).

Not yet routed through the core: `getTenantDb` in `@nebutra/db` (`src/client.ts`) still
carries its own copy of the statements; a follow-up moves it onto `tenantSessionOperations`.

Behavioural fixes that fell out of the merge:

- `withTenantContext` resolves `APP_DB_ROLE` at call time, like `withRls` always did,
  instead of freezing it at module load.
- `withRls` invokes `$extends`, `$transaction` and `$executeRaw*` as methods on the
  client instead of as detached functions, which real Prisma clients require.
- The generated RLS policy predicate derives its `current_setting(...)` expression from
  the same constant the session core writes, so the two cannot disagree.

`@nebutra/db` now depends on `@nebutra/tenant` (workspace link); `@nebutra/tenant` does
not depend on `@nebutra/db`.
