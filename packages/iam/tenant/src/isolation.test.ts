import { describe, expect, it } from "vitest";
import { generateRlsPolicySql } from "./isolation";
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
