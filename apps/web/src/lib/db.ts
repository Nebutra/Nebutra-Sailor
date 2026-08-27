import { getSystemDb, getTenantDb } from "@nebutra/db";

/**
 * TEMPORARY SHIM — do NOT use for new code.
 *
 * `db` re-exports a SYSTEM-SCOPE Prisma client (no RLS tenant filter). This
 * shim exists only to keep existing apps/web call sites compiling during the
 * CRITICAL #2 Prisma-factory migration. Every call site reached through this
 * export bypasses tenant RLS, which is unsafe in production.
 *
 * AUDIT(no-tenant): all call sites that import `db` from `@/lib/db` must be
 * audited and migrated to `getTenantDb(orgId)` in a follow-up task. See
 * `docs/plans/2026-04-18-remaining-prisma-migrations.md`.
 */
export const db = getSystemDb();
export default db;

// Re-export the factories so migrated call sites can pick the right scope.
export { getSystemDb, getTenantDb };
