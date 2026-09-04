# @nebutra/db

## 0.1.3

### Patch Changes

- [`0ea06f4`](https://github.com/Nebutra/Nebutra-Sailor/commit/0ea06f4b7ca492d20911a3d68a8c4da16c680dc0) Thanks [@TsekaLuk](https://github.com/TsekaLuk)! - An unusable `APP_DB_ROLE` now refuses to run instead of silently dropping RLS enforcement (closure P1.3).

  Before this change, an `APP_DB_ROLE` that was set but not a bare SQL identifier resolved
  to `null` on every tenant-scoped path and was treated the same as "unset": no role switch,
  no error — the query ran as the connection's own (possibly BYPASSRLS) role. A role that
  _was_ a valid identifier but that Postgres refused via `SET LOCAL ROLE` (missing, or not
  grantable to the connection role) had no dedicated verification either.

  `@nebutra/tenant/isolation`:
  - `resolveRlsRoleOrThrow(env?)` — new. Resolves `APP_DB_ROLE` like `resolveRlsRole` does,
    but throws `TenantIsolationError` instead of returning `null` when it is set to something
    that is not a bare SQL identifier. `withRls`, and `applyTenantSession` /
    `tenantSessionOperations` called without an explicit `role`, now resolve through this.
    `resolveRlsRole` itself is unchanged (still permissive) for callers that want that.
  - `planTenantSession` now throws `TenantIsolationError` — instead of silently skipping the
    role switch — when a role is configured but the executor cannot run `$executeRawUnsafe`.

  `@nebutra/db`:
  - New `src/rls-role.ts` (`assertRlsRoleUsable`, `createRlsRoleVerifier`) — `getTenantDb()`
    verifies, on its first query, that a configured `APP_DB_ROLE` is both a valid identifier
    and a role Postgres actually grants via `SET LOCAL ROLE`. The outcome — success or
    failure — is cached for the process lifetime, so later queries neither re-probe Postgres
    nor silently run without the role switch.

  The unset case (`APP_DB_ROLE` never configured) is unchanged on every path.

- [`025abf8`](https://github.com/Nebutra/Nebutra-Sailor/commit/025abf8b94aad96ffe56f50632a094782a30b968) Thanks [@TsekaLuk](https://github.com/TsekaLuk)! - One implementation behind `withRls` and `withTenantContext` (closure P1.2).

  `@nebutra/tenant/isolation` now exports the tenant session core — `applyTenantSession`,
  `tenantSessionOperations`, `resolveRlsRole`, `isValidDbRole`, `TENANT_SESSION_SETTING`,
  `TENANT_SESSION_EXPRESSION` — the shared implementation of the `app.current_tenant_id`
  setting key, the `APP_DB_ROLE` validation, and the transaction-local `SET LOCAL ROLE`
  - `set_config(..., true)` statements. `withRls` runs it as a batch transaction;
    `withTenantContext` / `withAdminContext` in `@nebutra/db/rls` run it inside an interactive
    transaction. Both public wrappers keep their signatures. The `role` option is new: an
    explicit invalid value throws `TenantIsolationError`.

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

- Updated dependencies [[`0ea06f4`](https://github.com/Nebutra/Nebutra-Sailor/commit/0ea06f4b7ca492d20911a3d68a8c4da16c680dc0), [`025abf8`](https://github.com/Nebutra/Nebutra-Sailor/commit/025abf8b94aad96ffe56f50632a094782a30b968)]:
  - @nebutra/tenant@2.0.0
  - @nebutra/logger@2.0.0
  - @nebutra/vault@2.0.0

## 0.1.2

### Patch Changes

- Updated dependencies []:
  - @nebutra/vault@0.1.2
  - @nebutra/logger@0.1.2

## 0.1.1

### Patch Changes

- Updated dependencies []:
  - @nebutra/logger@0.1.1
  - @nebutra/vault@0.1.1
