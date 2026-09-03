/**
 * Tenant session core — how a PostgreSQL transaction is scoped to a tenant for
 * row-level security, shared by both public wrappers:
 *
 *   - `withRls(prisma, tenantId)`              (`@nebutra/tenant/isolation`)
 *   - `withTenantContext(prisma, tenantId, cb)` (`@nebutra/db/rls`)
 *
 * Both issue exactly the statements this module produces. The RLS policies
 * (`generateRlsPolicySql`, migration `20260313000000_enable_rls`) read
 * `current_setting('app.current_tenant_id', true)`; the wrappers write the same
 * key through `set_config(..., true)`, so the value is transaction-local and
 * cannot leak across pooled connections. Keeping the key and the statements
 * here — rather than once per wrapper — is closure item P1.2: two copies of a
 * security invariant drift, one copy cannot.
 *
 * Closure P1.3: an `APP_DB_ROLE` that is configured but unusable must refuse
 * to run rather than quietly drop the role switch and execute as the
 * connection's own (possibly BYPASSRLS) role. Two shapes of "unusable" are
 * handled here — `resolveSessionRole` refuses a value that fails
 * `isValidDbRole`, and `planTenantSession` refuses when the executor cannot
 * run `$executeRawUnsafe` at all, so the role switch has nowhere to go.
 * Neither case matters to `getTenantDb` in `@nebutra/db` (`src/client.ts`):
 * it still carries its own copy of the RLS statements, closes the same gap
 * with its own verification (`rls-role.ts`), and is unaffected either way.
 *
 * Not yet routed through here: `getTenantDb` in `@nebutra/db` (`src/client.ts`)
 * still carries its own copy of these statements, with a
 * `SET LOCAL statement_timeout` between the role switch and `set_config`. The
 * P1.2 follow-up moves it onto `tenantSessionOperations`; until then that copy
 * is the one other place these statements exist, and it must not gain siblings.
 *
 * This module imports nothing outside `@nebutra/tenant` (only `./types`, whose
 * sole dependency is zod): `@nebutra/db` consumes it, and it must stay usable
 * from any Prisma-like executor (interactive transaction, batch transaction, or
 * a client extension).
 */

import { TenantIsolationError } from "./types";

/** PostgreSQL session setting the RLS policies compare `tenant_id` against. */
export const TENANT_SESSION_SETTING = "app.current_tenant_id";

/**
 * SQL expression the generated RLS policies use to read the tenant. The second
 * argument (`missing_ok = true`) makes an unset session yield NULL — which the
 * policy predicate then rejects — instead of raising.
 */
export const TENANT_SESSION_EXPRESSION = `current_setting('${TENANT_SESSION_SETTING}', true)`;

/**
 * A bare SQL identifier: the only shape `APP_DB_ROLE` may take, because
 * `SET LOCAL ROLE` cannot be bind-parameterized and the role is interpolated.
 */
const DB_ROLE_PATTERN = /^[a-z_][a-z0-9_]*$/;

/** True when `role` is a bare SQL identifier safe to interpolate into `SET LOCAL ROLE`. */
export function isValidDbRole(role: unknown): role is string {
  return typeof role === "string" && DB_ROLE_PATTERN.test(role);
}

/**
 * Resolve the optional non-BYPASSRLS role tenant-scoped transactions assume —
 * e.g. `app_user` on Supabase, whose `postgres` connection role bypasses RLS.
 *
 * Resolved at call time (not module load) so every wrapper sees the same
 * environment and tests can exercise both shapes.
 *
 * @returns the validated role, or `null` when unset or not a bare identifier
 */
export function resolveRlsRole(
  env: { APP_DB_ROLE?: string | undefined } = process.env,
): string | null {
  const role = env.APP_DB_ROLE;
  return isValidDbRole(role) ? role : null;
}

/**
 * Resolve `APP_DB_ROLE` the way `resolveRlsRole` does, but fail closed:
 * when it is set to something that is not a bare SQL identifier, throw
 * `TenantIsolationError` instead of silently returning `null`.
 *
 * Closure P1.3 — `resolveRlsRole`'s null-on-invalid contract is what let an
 * unusable `APP_DB_ROLE` disable RLS silently: every caller that treated
 * `null` as "no role configured" ran the query as the connection's own
 * (possibly BYPASSRLS) role instead of refusing. `resolveRlsRole` keeps that
 * permissive contract for callers that genuinely want it (diagnostics,
 * tooling); every tenant-scoped code path resolves the role through this
 * function instead.
 *
 * @throws TenantIsolationError when `APP_DB_ROLE` is set but not a bare SQL
 *   identifier.
 */
export function resolveRlsRoleOrThrow(
  env: { APP_DB_ROLE?: string | undefined } = process.env,
): string | null {
  const role = env.APP_DB_ROLE;
  if (role === undefined || role === "") return null;
  if (!isValidDbRole(role)) {
    throw new TenantIsolationError(
      `APP_DB_ROLE is set to ${JSON.stringify(role)}, which is not a bare SQL identifier ` +
        "(expected /^[a-z_][a-z0-9_]*$/). Refusing to run tenant-scoped queries: an invalid " +
        "role would otherwise be skipped silently, running the query as the connection's own " +
        "(possibly BYPASSRLS) role instead of under row-level security.",
      "shared_schema",
    );
  }
  return role;
}

/**
 * The subset of a Prisma client (or interactive-transaction client) the tenant
 * session needs. `$executeRaw` is tagged-template only so `tenantId` is always
 * bound as a parameter; `$executeRawUnsafe` carries the role switch, whose
 * identifier is validated by `isValidDbRole` before it is interpolated.
 */
export interface TenantSessionExecutor {
  $executeRaw: (query: TemplateStringsArray, ...values: unknown[]) => PromiseLike<number>;
  $executeRawUnsafe?: ((query: string) => PromiseLike<number>) | undefined;
}

export interface TenantSessionOptions {
  /**
   * Role to assume before scoping the transaction.
   *
   * - `undefined` (default): resolve from `APP_DB_ROLE` via `resolveRlsRoleOrThrow()`
   * - `null`: never switch role (admin / migration paths that must run as owner)
   * - a string: use this validated identifier
   */
  role?: string | null | undefined;
}

type TenantSessionStatement = () => PromiseLike<number>;

function resolveSessionRole(options: TenantSessionOptions): string | null {
  if (options.role === undefined) {
    // Closure P1.3: fail closed on an unusable APP_DB_ROLE instead of the
    // permissive `resolveRlsRole()` silently treating it as unset.
    return resolveRlsRoleOrThrow();
  }
  if (options.role === null) {
    return null;
  }
  if (!isValidDbRole(options.role)) {
    throw new TenantIsolationError(
      `Tenant session role must be a bare SQL identifier (got ${JSON.stringify(options.role)})`,
      "shared_schema",
    );
  }
  return options.role;
}

/**
 * The ordered statement plan for scoping one transaction to `tenantId`:
 *
 *   1. `SET LOCAL ROLE "<role>"` — only when a role is configured, so the
 *      tenant setting below (and every query after it) runs as the
 *      non-BYPASSRLS role rather than the connection owner.
 *   2. `SELECT set_config('app.current_tenant_id', $1, true)` — transaction-local
 *      (`true`), so it is cleared when the transaction commits or rolls back.
 *
 * A role is refused, not skipped, when the executor cannot run
 * `$executeRawUnsafe`: closure P1.3 turned the pre-merge `withRls` behaviour
 * (silently skip the role switch) into a refusal, since skipping it here
 * means the query after it runs as the connection's own role instead of the
 * one `APP_DB_ROLE` configured.
 */
function planTenantSession(
  executor: TenantSessionExecutor,
  tenantId: string,
  role: string | null,
): TenantSessionStatement[] {
  const plan: TenantSessionStatement[] = [];

  if (role) {
    const switchRole = executor.$executeRawUnsafe;
    if (typeof switchRole !== "function") {
      throw new TenantIsolationError(
        `APP_DB_ROLE is set to ${JSON.stringify(role)}, but this executor cannot run ` +
          "$executeRawUnsafe to SET LOCAL ROLE. Refusing to run tenant-scoped queries: " +
          "skipping the role switch would run them as the connection's own (possibly " +
          "BYPASSRLS) role instead of under row-level security.",
        "shared_schema",
      );
    }
    // `role` matched DB_ROLE_PATTERN, so it is safe to interpolate — SET LOCAL
    // ROLE cannot take a bind parameter.
    plan.push(() => switchRole.call(executor, `SET LOCAL ROLE "${role}"`));
  }

  // transaction-local: cleared automatically when the transaction ends.
  plan.push(
    () => executor.$executeRaw`SELECT set_config('app.current_tenant_id', ${tenantId}, true)`,
  );

  return plan;
}

/**
 * Issue the tenant-session statements through `executor` and return them in
 * order, without awaiting. Prisma promises are lazy, so the returned array can
 * be spread into a batch `$transaction([...ops, query])` and will run inside
 * that transaction, in order, ahead of the query.
 */
export function tenantSessionOperations(
  executor: TenantSessionExecutor,
  tenantId: string,
  options: TenantSessionOptions = {},
): PromiseLike<number>[] {
  const role = resolveSessionRole(options);
  return planTenantSession(executor, tenantId, role).map((statement) => statement());
}

/**
 * Run the tenant-session statements sequentially on `executor` — an interactive
 * transaction client — and resolve once the transaction is scoped to `tenantId`.
 */
export async function applyTenantSession(
  executor: TenantSessionExecutor,
  tenantId: string,
  options: TenantSessionOptions = {},
): Promise<void> {
  const role = resolveSessionRole(options);
  for (const statement of planTenantSession(executor, tenantId, role)) {
    await statement();
  }
}
