/**
 * Tenant session core — the ONE place that knows how a PostgreSQL transaction
 * is scoped to a tenant for row-level security.
 *
 * Both public wrappers issue exactly the statements this module produces:
 *
 *   - `withRls(prisma, tenantId)`              (`@nebutra/tenant/isolation`)
 *   - `withTenantContext(prisma, tenantId, cb)` (`@nebutra/db/rls`)
 *
 * The RLS policies (`generateRlsPolicySql`, migration `20260313000000_enable_rls`)
 * read `current_setting('app.current_tenant_id', true)`; the wrappers write the
 * same key through `set_config(..., true)`, so the value is transaction-local
 * and cannot leak across pooled connections. Keeping the key and the statements
 * here — rather than once per package — is closure item P1.2: two copies of a
 * security invariant drift, one copy cannot.
 *
 * This module deliberately has no runtime imports: `@nebutra/db` consumes it,
 * and it must stay usable from any Prisma-like executor (interactive
 * transaction, batch transaction, or a client extension).
 */

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
   * - `undefined` (default): resolve from `APP_DB_ROLE` via `resolveRlsRole()`
   * - `null`: never switch role (admin / migration paths that must run as owner)
   * - a string: use this validated identifier
   */
  role?: string | null | undefined;
}

type TenantSessionStatement = () => PromiseLike<number>;

function resolveSessionRole(options: TenantSessionOptions): string | null {
  if (options.role === undefined) {
    return resolveRlsRole();
  }
  if (options.role === null) {
    return null;
  }
  if (!isValidDbRole(options.role)) {
    throw new Error(
      `Tenant session role must be a bare SQL identifier (got ${JSON.stringify(options.role)})`,
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
 * A role is skipped when the executor cannot run `$executeRawUnsafe`. That
 * mirrors the pre-merge `withRls` behaviour; closure item P1.3 turns it into a
 * refusal in its own PR.
 */
function planTenantSession(
  executor: TenantSessionExecutor,
  tenantId: string,
  role: string | null,
): TenantSessionStatement[] {
  const plan: TenantSessionStatement[] = [];
  const switchRole = executor.$executeRawUnsafe;

  if (role && typeof switchRole === "function") {
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
