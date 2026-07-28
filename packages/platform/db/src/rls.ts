/**
 * Row-Level Security helpers for multi-tenant Postgres isolation.
 *
 * The RLS policies (migration 20260313000000_enable_rls) enforce that every
 * SELECT/INSERT/UPDATE/DELETE on tenant-scoped tables is filtered by the
 * session variable `app.current_tenant_id`.
 *
 * Usage in API route handlers:
 *
 *   import { withTenantContext } from "@nebutra/db/rls";
 *
 *   // All queries inside the callback are automatically scoped to tenantId.
 *   const result = await withTenantContext(prisma, tenantId, async (tx) => {
 *     return tx.content.findMany();
 *   });
 *
 * The session variable is transaction-local (`true` as third arg to
 * set_config), so it is automatically cleared when the transaction ends —
 * no risk of context leaking across requests.
 */

import type { PrismaClient } from "#prisma-client";

// Optional non-bypassrls role to assume for tenant-scoped transactions — e.g.
// "app_user" on Supabase, whose `postgres` connection role bypasses RLS. Env-driven
// so other backends opt in; validated as a bare SQL identifier (cannot be bound).
const RLS_ROLE = (() => {
  const r = process.env.APP_DB_ROLE;
  return r && /^[a-z_][a-z0-9_]*$/.test(r) ? r : null;
})();

type InteractiveTransaction = Omit<
  PrismaClient,
  "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends"
>;

/**
 * Run `callback` inside a Prisma transaction with `app.current_tenant_id` set to
 * `tenantId` for the duration of the transaction.
 *
 * All tenant-scoped RLS policies compare `tenant_id` to this value.
 */
export async function withTenantContext<T>(
  prisma: PrismaClient,
  tenantId: string,
  callback: (tx: InteractiveTransaction) => Promise<T>,
): Promise<T> {
  return prisma.$transaction(async (tx) => {
    // Assume the non-bypassrls role (when configured) so RLS actually applies on
    // backends whose connection role bypasses it (e.g. Supabase `postgres`).
    if (RLS_ROLE) {
      await tx.$executeRawUnsafe(`SET LOCAL ROLE "${RLS_ROLE}"`);
    }
    // transaction-local: cleared automatically when tx commits or rolls back
    await tx.$executeRaw`SELECT set_config('app.current_tenant_id', ${tenantId}, true)`;
    return callback(tx);
  });
}

/**
 * Compatibility alias for organization-tenant callers during the Model-2
 * cutover. New code should call `withTenantContext`.
 */
export const withOrgContext = withTenantContext;

/**
 * Bypass helper for admin / migration operations that need all rows.
 * Only works when connecting as the `postgres` superuser role.
 * Never call this from request-handling code.
 */
export async function withAdminContext<T>(
  prisma: PrismaClient,
  callback: (tx: InteractiveTransaction) => Promise<T>,
): Promise<T> {
  return prisma.$transaction(async (tx) => {
    // Empty string → no tenant filter; policies with TO postgres bypass RLS.
    // This is a no-op for normal app roles but documents the intent clearly.
    await tx.$executeRaw`SELECT set_config('app.current_tenant_id', '', true)`;
    return callback(tx);
  });
}
