---
"@nebutra/tenant": minor
"@nebutra/db": patch
---

An unusable `APP_DB_ROLE` now refuses to run instead of silently dropping RLS enforcement (closure P1.3).

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
