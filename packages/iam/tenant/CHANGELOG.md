# @nebutra/tenant

## 2.0.0

### Minor Changes

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

### Patch Changes

- Updated dependencies []:
  - @nebutra/logger@2.0.0

## 0.1.3

### Patch Changes

- Ship the MIT LICENSE file these packages have always declared but never included.

  Every one of these declares `"license": "MIT"` in its manifest, and npm shows
  that on the registry page — but the tarball carried no licence text at all.
  MIT's own terms require the notice to accompany "all copies or substantial
  portions of the Software", so a consumer vendoring one of these packages had
  nothing to comply with.

  No code changes. This is the licence text only, published so the tarballs
  match what the manifests have been claiming.

  `tests/architecture/release-surface.test.ts` now asserts the LICENSE _file_
  exists and is MIT, not just the manifest _field_ — the field-only check is how
  this went unnoticed, and is also how `create-sailor` shipped the full AGPL-3.0
  text under an MIT declaration for its entire published history.

- Updated dependencies []:
  - @nebutra/logger@0.1.2

## 0.1.2

### Patch Changes

- Publish registry package metadata under the MIT license.

- Updated dependencies []:
  - @nebutra/logger@0.1.1

## 0.1.1

### Patch Changes

- [`5d3d7e6`](https://github.com/Nebutra/Nebutra-Sailor/commit/5d3d7e6c59cae5aa242bb988b75a9888cfd0db39) Thanks [@TsekaLuk](https://github.com/TsekaLuk)! - Harden production-readiness seams for published platform packages.
  - Billing entitlement checks now account for pending requested usage before allowing quota-bound operations.
  - Tenant JWT resolution now supports bearer-token extraction and typed request-compatible resolver inputs.
  - Permissions OpenFGA support now targets store-scoped REST endpoints with auth token support and fail-closed checks.
  - Queue QStash support now exposes an injectable dead-letter fetcher seam without assuming unstable provider SDK APIs.
  - Webhooks custom delivery now supports injectable dead-letter storage so exhausted deliveries can be persisted outside process memory.
  - Notifications direct delivery now supports bounded retry attempts with delivery-attempt telemetry hooks.
  - MCP context server primitives now expose a usable registry and plan-aware tool execution seam instead of a placeholder-only server.
