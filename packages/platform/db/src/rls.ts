/**
 * Row-Level Security helpers for multi-tenant Postgres isolation.
 *
 * The RLS policies (migration 20260313000000_enable_rls) enforce that every
 * SELECT/INSERT/UPDATE/DELETE on tenant-scoped tables is filtered by the
 * session variable `app.current_org_id`.
 *
 * Usage in API route handlers:
 *
 *   import { withOrgContext } from "@nebutra/db/rls";
 *
 *   // All queries inside the callback are automatically scoped to orgId.
 *   const result = await withOrgContext(prisma, orgId, async (tx) => {
 *     return tx.content.findMany();
 *   });
 *
 * The session variable is transaction-local (`true` as third arg to
 * set_config), so it is automatically cleared when the transaction ends —
 * no risk of context leaking across requests.
 */

import type { PrismaClient } from "./generated/prisma/client.js";

type InteractiveTransaction = Omit<
  PrismaClient,
  "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends"
>;

/**
 * Run `callback` inside a Prisma transaction with `app.current_org_id` set to
 * `orgId` for the duration of the transaction.
 *
 * All tenant-scoped RLS policies compare `organization_id` to this value.
 */
export async function withOrgContext<T>(
  prisma: PrismaClient,
  orgId: string,
  callback: (tx: InteractiveTransaction) => Promise<T>,
): Promise<T> {
  return prisma.$transaction(async (tx) => {
    // transaction-local: cleared automatically when tx commits or rolls back
    await tx.$executeRaw`SELECT set_config('app.current_org_id', ${orgId}, true)`;
    return callback(tx);
  });
}

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
    // Empty string → no org filter; policies with TO postgres bypass RLS.
    // This is a no-op for normal app roles but documents the intent clearly.
    await tx.$executeRaw`SELECT set_config('app.current_org_id', '', true)`;
    return callback(tx);
  });
}
