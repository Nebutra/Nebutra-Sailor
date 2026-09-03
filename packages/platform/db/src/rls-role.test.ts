/**
 * Closure P1.3 — before this module existed, an `APP_DB_ROLE` that was set
 * but unusable (invalid identifier, or a role Postgres refuses to grant) had
 * no verification anywhere in `getTenantDb()`: an invalid identifier made
 * `RLS_ROLE` resolve to `null` at module load, so `getTenantDb()` silently
 * skipped the role switch and ran every query as the connection's own
 * (possibly BYPASSRLS) role. These tests pin the fix: both cases refuse
 * instead, and a working role is verified once and cached.
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { assertRlsRoleUsable, createRlsRoleVerifier, type RlsRoleProbeExecutor } from "./rls-role";

function fakeExecutor(setRoleImpl: () => PromiseLike<number> = () => Promise.resolve(1)): {
  executor: RlsRoleProbeExecutor;
  executeRawUnsafe: ReturnType<typeof vi.fn>;
} {
  const executeRawUnsafe = vi.fn(setRoleImpl);
  const executor: RlsRoleProbeExecutor = {
    $executeRawUnsafe: executeRawUnsafe,
    $transaction: async (ops) => Promise.all(ops),
  };
  return { executor, executeRawUnsafe };
}

describe("assertRlsRoleUsable", () => {
  it("is a no-op when APP_DB_ROLE was never set", async () => {
    const { executor, executeRawUnsafe } = fakeExecutor();

    await expect(assertRlsRoleUsable(executor, undefined, null)).resolves.toBeUndefined();
    expect(executeRawUnsafe).not.toHaveBeenCalled();
  });

  // The failing case: on origin/main, `RLS_ROLE` silently became `null` for
  // an invalid APP_DB_ROLE and getTenantDb() ran the query anyway, with no
  // role switch and no error. This is the regression case for that gap.
  it("closure P1.3: refuses an invalid APP_DB_ROLE without touching the database", async () => {
    const { executor, executeRawUnsafe } = fakeExecutor();
    const rawRole = 'app_user"; DROP ROLE postgres; --';

    await expect(assertRlsRoleUsable(executor, rawRole, null)).rejects.toThrow(
      /not a bare SQL identifier/,
    );
    await expect(assertRlsRoleUsable(executor, rawRole, null)).rejects.toThrow(
      /APP_DB_ROLE is set to/,
    );
    expect(executeRawUnsafe).not.toHaveBeenCalled();
  });

  it("verifies a valid role by probing SET LOCAL ROLE", async () => {
    const { executor, executeRawUnsafe } = fakeExecutor();

    await expect(assertRlsRoleUsable(executor, "app_user", "app_user")).resolves.toBeUndefined();
    expect(executeRawUnsafe).toHaveBeenCalledWith('SET LOCAL ROLE "app_user"');
  });

  it("wraps a Postgres SET ROLE failure in a clear APP_DB_ROLE-specific error", async () => {
    const { executor } = fakeExecutor(() => {
      throw new Error('role "app_typo" does not exist');
    });

    await expect(assertRlsRoleUsable(executor, "app_typo", "app_typo")).rejects.toThrow(
      /APP_DB_ROLE="app_typo" could not be assumed via SET ROLE/,
    );
    await expect(assertRlsRoleUsable(executor, "app_typo", "app_typo")).rejects.toThrow(
      /role "app_typo" does not exist/,
    );
  });
});

describe("createRlsRoleVerifier", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("probes at most once and caches a successful verification", async () => {
    const { executor, executeRawUnsafe } = fakeExecutor();
    const verify = createRlsRoleVerifier("app_user", "app_user");

    await verify(executor);
    await verify(executor);
    await verify(executor);

    expect(executeRawUnsafe).toHaveBeenCalledTimes(1);
  });

  it("caches a failure too, so a known-bad role is not re-probed on every query", async () => {
    const { executor, executeRawUnsafe } = fakeExecutor(() => {
      throw new Error('role "app_typo" does not exist');
    });
    const verify = createRlsRoleVerifier("app_typo", "app_typo");

    await expect(verify(executor)).rejects.toThrow(/could not be assumed/);
    await expect(verify(executor)).rejects.toThrow(/could not be assumed/);

    expect(executeRawUnsafe).toHaveBeenCalledTimes(1);
  });

  it("never touches the database for an invalid identifier, on any call", async () => {
    const { executor, executeRawUnsafe } = fakeExecutor();
    const verify = createRlsRoleVerifier('app_user"; --', null);

    await expect(verify(executor)).rejects.toThrow(/not a bare SQL identifier/);
    await expect(verify(executor)).rejects.toThrow(/not a bare SQL identifier/);
    expect(executeRawUnsafe).not.toHaveBeenCalled();
  });

  it("stays a no-op on every call when APP_DB_ROLE is unset", async () => {
    const { executor, executeRawUnsafe } = fakeExecutor();
    const verify = createRlsRoleVerifier(undefined, null);

    await expect(verify(executor)).resolves.toBeUndefined();
    await expect(verify(executor)).resolves.toBeUndefined();
    expect(executeRawUnsafe).not.toHaveBeenCalled();
  });
});
