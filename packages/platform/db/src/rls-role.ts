/**
 * Closure P1.3 — verify a configured `APP_DB_ROLE` is actually usable before
 * `getTenantDb()` trusts it to enforce row-level security.
 *
 * `client.ts` computes `RLS_ROLE` from `process.env.APP_DB_ROLE` at module
 * load, but until this module it never checked whether an *invalid* value
 * (fails `isValidDbRole`) or an otherwise-valid role Postgres refuses to
 * grant (missing, or not assumable by the connection role) actually stops a
 * query from running. Both cases must refuse the query instead of silently
 * falling back to the connection's own — possibly BYPASSRLS — role.
 *
 * Deliberately free of any `@nebutra/*` or Prisma import: `client.ts` needs
 * the real generated Prisma client (`#prisma-client`, which resolves to a
 * build output — see its own note on why the singleton stays lazy) just to
 * import, so a test that imports `client.ts` directly needs the package
 * built first. This module takes the already-resolved role and a minimal
 * executor shape instead, so it — and the fail-closed behavior it adds — can
 * be unit tested against a fake client with no build step.
 *
 * `client.ts` still keeps its own copy of the `SET LOCAL ROLE` / set_config
 * statements (pinned by tests/architecture/tenant-cutover-contract.test.ts
 * until the P1.2 follow-up routes `getTenantDb` through
 * `@nebutra/tenant/isolation`'s tenant session core, which already closes
 * this same gap for `withRls` and `withTenantContext` — see
 * `resolveRlsRoleOrThrow` and `planTenantSession` in
 * `packages/iam/tenant/src/rls-session.ts`). This module only adds the
 * missing verification on top of that copy; it does not change what gets
 * sent to Postgres.
 */

/** The subset of Prisma's client the `SET LOCAL ROLE` probe needs. */
export interface RlsRoleProbeExecutor {
  $executeRawUnsafe: (query: string) => PromiseLike<number>;
  $transaction: (ops: PromiseLike<unknown>[]) => PromiseLike<unknown[]>;
}

/**
 * Throw a clear, `APP_DB_ROLE`-specific error instead of letting a caller run
 * tenant-scoped queries without RLS enforcement:
 *
 * - `rawRole` is set but `role` is `null` — `APP_DB_ROLE` failed identifier
 *   validation (e.g. embedded quotes). Without this check the role switch is
 *   skipped silently and the query runs as the connection's own (possibly
 *   BYPASSRLS) role.
 * - `role` is set but `SET LOCAL ROLE` fails on `executor` — the role does
 *   not exist, or the connection role is not permitted to assume it.
 * - `role` is `null` and `rawRole` is unset — no-op. `APP_DB_ROLE` was never
 *   configured, so behavior is unchanged from before closure P1.3.
 */
export async function assertRlsRoleUsable(
  executor: RlsRoleProbeExecutor,
  rawRole: string | undefined,
  role: string | null,
): Promise<void> {
  if (rawRole && !role) {
    throw new Error(
      `[db] APP_DB_ROLE is set to ${JSON.stringify(rawRole)}, which is not a bare SQL ` +
        "identifier (expected /^[a-z_][a-z0-9_]*$/). Refusing to run tenant-scoped queries: " +
        "an invalid role would otherwise be skipped silently, running the query as the " +
        "connection's own (possibly BYPASSRLS) role instead of under row-level security.",
    );
  }

  if (!role) return;

  try {
    await executor.$transaction([executor.$executeRawUnsafe(`SET LOCAL ROLE "${role}"`)]);
  } catch (err) {
    throw new Error(
      `[db] APP_DB_ROLE="${role}" could not be assumed via SET ROLE. Verify the role exists ` +
        `and the connection role is permitted to switch to it (GRANT "${role}" TO ` +
        `<connection role>). Original error: ${err instanceof Error ? err.message : String(err)}`,
    );
  }
}

/**
 * Wrap `assertRlsRoleUsable` so it runs at most once per process: the first
 * `getTenantDb()` query probes Postgres (or refuses immediately for a bad
 * identifier, no DB round trip needed); every query after that reuses the
 * cached outcome — success or failure — instead of re-probing on every
 * request with a role already known to be unusable.
 */
export function createRlsRoleVerifier(
  rawRole: string | undefined,
  role: string | null,
): (executor: RlsRoleProbeExecutor) => Promise<void> {
  let verification: Promise<void> | undefined;
  return (executor) => {
    if (!verification) {
      verification = assertRlsRoleUsable(executor, rawRole, role);
    }
    return verification;
  };
}
