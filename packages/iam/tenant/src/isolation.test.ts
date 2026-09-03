import { afterEach, describe, expect, it, vi } from "vitest";
import { generateRlsPolicySql, withRls } from "./isolation";
import { TenantIsolationError } from "./types";

describe("generateRlsPolicySql", () => {
  it("generates deterministic shared-schema RLS policy SQL for sorted tables", () => {
    expect(
      generateRlsPolicySql({
        tables: ["users", "audit_logs"],
      }),
    ).toMatchInlineSnapshot(`
      "ALTER TABLE "audit_logs" ENABLE ROW LEVEL SECURITY;
      ALTER TABLE "audit_logs" FORCE ROW LEVEL SECURITY;
      DROP POLICY IF EXISTS "tenant_isolation_audit_logs" ON "audit_logs";
      CREATE POLICY "tenant_isolation_audit_logs" ON "audit_logs"
        USING ("tenant_id" = current_setting('app.current_tenant_id', true))
        WITH CHECK ("tenant_id" = current_setting('app.current_tenant_id', true));

      ALTER TABLE "users" ENABLE ROW LEVEL SECURITY;
      ALTER TABLE "users" FORCE ROW LEVEL SECURITY;
      DROP POLICY IF EXISTS "tenant_isolation_users" ON "users";
      CREATE POLICY "tenant_isolation_users" ON "users"
        USING ("tenant_id" = current_setting('app.current_tenant_id', true))
        WITH CHECK ("tenant_id" = current_setting('app.current_tenant_id', true));"
    `);
  });

  it("quotes schemas, table names, policy names, and custom tenant columns safely", () => {
    expect(
      generateRlsPolicySql({
        policyPrefix: "tenant policy",
        schema: 'customer "private"',
        tables: ['Order "Line"'],
        tenantColumn: "org.id",
      }),
    ).toContain(
      'DROP POLICY IF EXISTS "tenant policy_Order ""Line""" ON "customer ""private"""."Order ""Line""";',
    );
    expect(
      generateRlsPolicySql({
        policyPrefix: "tenant policy",
        schema: 'customer "private"',
        tables: ['Order "Line"'],
        tenantColumn: "org.id",
      }),
    ).toContain('"org.id" = current_setting');
  });

  it("supports read-only policies without WITH CHECK", () => {
    expect(
      generateRlsPolicySql({
        command: "SELECT",
        tables: ["events"],
      }),
    ).not.toContain("WITH CHECK");
  });

  it("rejects empty table lists", () => {
    expect(() => generateRlsPolicySql({ tables: [] })).toThrow(TenantIsolationError);
  });
});

describe("withRls", () => {
  const originalEnv = process.env.NODE_ENV;
  const originalRole = process.env.APP_DB_ROLE;

  afterEach(() => {
    process.env.NODE_ENV = originalEnv;
    if (originalRole === undefined) {
      delete process.env.APP_DB_ROLE;
    } else {
      process.env.APP_DB_ROLE = originalRole;
    }
  });

  it("throws instead of returning an unisolated client without $extends", () => {
    expect(() => withRls({} as never, "org_1")).toThrow(TenantIsolationError);
    expect(() => withRls({} as never, "org_1")).toThrow(/does not support \$extends/);
  });

  it("throws instead of running the raw query when the client cannot SET LOCAL", () => {
    const prisma = {
      $extends: vi.fn(),
    };

    expect(() => withRls(prisma as never, "org_1")).toThrow(TenantIsolationError);
    expect(() => withRls(prisma as never, "org_1")).toThrow(/transaction-local RLS/);
    expect(prisma.$extends).not.toHaveBeenCalled();
  });

  it("refuses production use without APP_DB_ROLE", () => {
    process.env.NODE_ENV = "production";
    delete process.env.APP_DB_ROLE;

    expect(() =>
      withRls(
        {
          $extends: vi.fn(),
          $transaction: vi.fn(),
          $executeRaw: vi.fn(),
        } as never,
        "org_1",
      ),
    ).toThrow(/APP_DB_ROLE/);
  });

  // Closure P1.3 — the failing case: on origin/main, `withRls` resolved
  // APP_DB_ROLE with the permissive `resolveRlsRole`, so an invalid value
  // silently became "no role configured" and the query ran unisolated (or,
  // in production, tripped the separate "APP_DB_ROLE is required" check only
  // because a valid role happens to look identical to none being set at
  // all). Regression case: refuse before ever touching `$extends`.
  it("closure P1.3: refuses an APP_DB_ROLE that is not a bare SQL identifier", () => {
    process.env.NODE_ENV = "test";
    process.env.APP_DB_ROLE = 'app_user"; DROP ROLE postgres; --';
    const prisma = {
      $extends: vi.fn(),
      $transaction: vi.fn(),
      $executeRaw: vi.fn(),
    };

    expect(() => withRls(prisma as never, "org_1")).toThrow(TenantIsolationError);
    expect(() => withRls(prisma as never, "org_1")).toThrow(/bare SQL identifier/);
    expect(prisma.$extends).not.toHaveBeenCalled();
  });

  it("applies tenant context inside a transaction when the client is capable", async () => {
    process.env.NODE_ENV = "test";
    delete process.env.APP_DB_ROLE;

    const executeRaw = vi.fn();
    const transaction = vi.fn(async (ops: unknown[]) => {
      const last = ops[ops.length - 1];
      return [...ops.slice(0, -1), await (last as Promise<unknown>)];
    });
    const query = vi.fn().mockResolvedValue([{ id: "user_1" }]);
    const prisma = {
      $transaction: transaction,
      $executeRaw: executeRaw,
      $extends(extension: { query: { $allOperations: Function } }) {
        return {
          run: (args: unknown) =>
            extension.query.$allOperations({
              args,
              query,
            }),
        };
      },
    };

    const isolated = withRls(prisma as never, "org_1") as {
      run: (args: unknown) => Promise<unknown>;
    };
    await expect(isolated.run({ where: {} })).resolves.toEqual([{ id: "user_1" }]);
    expect(transaction).toHaveBeenCalled();
    expect(query).toHaveBeenCalled();
  });
});
