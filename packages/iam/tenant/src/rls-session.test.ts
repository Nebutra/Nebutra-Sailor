import { afterEach, describe, expect, it } from "vitest";
import { generateRlsPolicySql } from "./isolation";
import {
  applyTenantSession,
  isValidDbRole,
  resolveRlsRole,
  TENANT_SESSION_EXPRESSION,
  TENANT_SESSION_SETTING,
  type TenantSessionExecutor,
  tenantSessionOperations,
} from "./rls-session";
import { TenantIsolationError } from "./types";

interface Statement {
  sql: string;
  values: unknown[];
}

/** Render a tagged template the way a driver would: `$1`, `$2`, … placeholders. */
function renderTemplate(strings: TemplateStringsArray, values: unknown[]): string {
  return strings.reduce(
    (sql, part, index) => sql + part + (index < values.length ? `$${index + 1}` : ""),
    "",
  );
}

function recordingExecutor(options: { unsafe?: boolean } = {}): {
  executor: TenantSessionExecutor;
  statements: Statement[];
} {
  const statements: Statement[] = [];
  const executor: TenantSessionExecutor = {
    $executeRaw: (strings, ...values) => {
      statements.push({ sql: renderTemplate(strings, values), values });
      return Promise.resolve(1);
    },
    $executeRawUnsafe:
      options.unsafe === false
        ? undefined
        : (sql) => {
            statements.push({ sql, values: [] });
            return Promise.resolve(1);
          },
  };
  return { executor, statements };
}

const SET_TENANT: Statement = {
  sql: "SELECT set_config('app.current_tenant_id', $1, true)",
  values: ["org_1"],
};

describe("tenant session core", () => {
  const originalRole = process.env.APP_DB_ROLE;

  afterEach(() => {
    if (originalRole === undefined) {
      delete process.env.APP_DB_ROLE;
    } else {
      process.env.APP_DB_ROLE = originalRole;
    }
  });

  it("writes the same setting the generated RLS policies read", () => {
    expect(TENANT_SESSION_SETTING).toBe("app.current_tenant_id");
    expect(TENANT_SESSION_EXPRESSION).toBe("current_setting('app.current_tenant_id', true)");
    expect(generateRlsPolicySql({ tables: ["users"] })).toContain(TENANT_SESSION_EXPRESSION);

    const { executor, statements } = recordingExecutor();
    tenantSessionOperations(executor, "org_1", { role: null });
    expect(statements[0]?.sql).toContain(`set_config('${TENANT_SESSION_SETTING}'`);
  });

  it("sets only the transaction-local tenant setting when no role is configured", () => {
    const { executor, statements } = recordingExecutor();
    const ops = tenantSessionOperations(executor, "org_1", { role: null });

    expect(ops).toHaveLength(1);
    expect(statements).toEqual([SET_TENANT]);
  });

  it("switches to the configured role before setting the tenant", () => {
    const { executor, statements } = recordingExecutor();
    const ops = tenantSessionOperations(executor, "org_1", { role: "app_user" });

    expect(ops).toHaveLength(2);
    expect(statements).toEqual([{ sql: 'SET LOCAL ROLE "app_user"', values: [] }, SET_TENANT]);
  });

  it("resolves APP_DB_ROLE at call time when no role is given", () => {
    process.env.APP_DB_ROLE = "app_rls_probe";
    const { executor, statements } = recordingExecutor();

    tenantSessionOperations(executor, "org_1");

    expect(statements.map((s) => s.sql)).toEqual([
      'SET LOCAL ROLE "app_rls_probe"',
      SET_TENANT.sql,
    ]);
  });

  it("binds tenantId as a parameter instead of interpolating it", () => {
    const hostile = "org_1'; SELECT set_config('app.current_tenant_id', 'org_2', true); --";
    const { executor, statements } = recordingExecutor();

    tenantSessionOperations(executor, hostile, { role: null });

    expect(statements).toEqual([{ sql: SET_TENANT.sql, values: [hostile] }]);
    expect(statements[0]?.sql).not.toContain("org_2");
  });

  it("only accepts a bare SQL identifier as the role", async () => {
    expect(isValidDbRole("app_user")).toBe(true);
    expect(isValidDbRole("_role1")).toBe(true);
    expect(isValidDbRole("App_User")).toBe(false);
    expect(isValidDbRole('app_user"; DROP ROLE postgres; --')).toBe(false);
    expect(isValidDbRole("")).toBe(false);
    expect(isValidDbRole(undefined)).toBe(false);

    expect(resolveRlsRole({ APP_DB_ROLE: "app_user" })).toBe("app_user");
    expect(resolveRlsRole({ APP_DB_ROLE: 'app_user"; DROP ROLE postgres; --' })).toBeNull();
    expect(resolveRlsRole({})).toBeNull();

    const { executor, statements } = recordingExecutor();
    const rejectRole = () => tenantSessionOperations(executor, "org_1", { role: 'app"user' });
    expect(rejectRole).toThrow(TenantIsolationError);
    expect(rejectRole).toThrow(/bare SQL identifier/);
    expect(statements).toEqual([]);

    // Same refusal type on the interactive shape, so direct callers of either
    // entry point see the package's own error rather than a bare Error.
    await expect(applyTenantSession(executor, "org_1", { role: "App_User" })).rejects.toThrow(
      TenantIsolationError,
    );
    expect(statements).toEqual([]);
  });

  it("applyTenantSession runs the statements one after another", async () => {
    const order: string[] = [];
    let releaseRoleSwitch: () => void = () => {};
    const roleSwitched = new Promise<number>((resolve) => {
      releaseRoleSwitch = () => resolve(1);
    });
    const executor: TenantSessionExecutor = {
      $executeRaw: () => {
        order.push("set_config");
        return Promise.resolve(1);
      },
      $executeRawUnsafe: () => {
        order.push("set_role");
        return roleSwitched;
      },
    };

    const applied = applyTenantSession(executor, "org_1", { role: "app_user" });
    await Promise.resolve();
    expect(order).toEqual(["set_role"]);

    releaseRoleSwitch();
    await applied;
    expect(order).toEqual(["set_role", "set_config"]);
  });

  // Pre-merge `withRls` parity: an executor without `$executeRawUnsafe` cannot
  // switch role, and today that is skipped rather than refused. This is NOT the
  // desired contract — it is the gap closure item P1.3 closes (by throwing
  // `TenantIsolationError`). The test pins the current behaviour so the P1.3
  // PR has to flip it deliberately rather than change it in passing.
  it("P1.3 gap: currently skips the role switch when the executor cannot run unsafe SQL", () => {
    const { executor, statements } = recordingExecutor({ unsafe: false });

    tenantSessionOperations(executor, "org_1", { role: "app_user" });

    expect(statements).toEqual([SET_TENANT]);
  });
});
