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
 * The statements that scope the transaction — the optional role switch to a
 * non-BYPASSRLS role (`APP_DB_ROLE`) and the transaction-local write of
 * `app.current_tenant_id` — are not written here. They come from the tenant
 * session core in `@nebutra/tenant/isolation`, the same implementation
 * `withRls(prisma, tenantId)` runs, so the two wrappers cannot drift apart
 * (closure P1.2). This file is the interactive-transaction shape of that core;
 * `withRls` is the client-extension shape.
 *
 * The session variable is transaction-local, so it is automatically cleared
 * when the transaction ends — no risk of context leaking across requests.
 */

import { applyTenantSession } from "@nebutra/tenant/isolation";
import type { PrismaClient } from "#prisma-client";

type InteractiveTransaction = Omit<
  PrismaClient,
  "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends"
>;

/**
 * Run `callback` inside a Prisma transaction with `app.current_tenant_id` set to
 * `tenantId` for the duration of the transaction.
 *
 * All tenant-scoped RLS policies compare `tenant_id` to this value.
 *
 * When `APP_DB_ROLE` names a non-BYPASSRLS role (e.g. `app_user` on Supabase,
 * whose `postgres` connection role bypasses RLS) the transaction assumes it
 * first, so the policies actually apply. The role is resolved at call time.
 */
export async function withTenantContext<T>(
  prisma: PrismaClient,
  tenantId: string,
  callback: (tx: InteractiveTransaction) => Promise<T>,
): Promise<T> {
  return prisma.$transaction(async (tx) => {
    await applyTenantSession(tx, tenantId);
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
    // `role: null` — never assume APP_DB_ROLE here: the point is to stay owner.
    await applyTenantSession(tx, "", { role: null });
    return callback(tx);
  });
}
