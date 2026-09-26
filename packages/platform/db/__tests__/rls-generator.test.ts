/**
 * The rls generator's rules, on hand-built DMMF models. The generated file
 * itself is exercised end to end by rls-migration-coverage and baseline.
 */
import { describe, expect, it } from "vitest";
import { parseDirective, renderSql, resolveRules } from "../prisma/generators/rls-core.mjs";

type Field = {
  name: string;
  kind: "scalar" | "object";
  type: string;
  dbName?: string | null;
  isRequired?: boolean;
  relationFromFields?: string[];
  relationToFields?: string[];
};

const model = (
  name: string,
  fields: Field[],
  opts: { dbName?: string; documentation?: string; schema?: string } = {},
) => ({
  name,
  dbName: opts.dbName ?? null,
  schema: opts.schema,
  documentation: opts.documentation,
  fields,
});

const scalar = (name: string, dbName?: string): Field => ({
  name,
  kind: "scalar",
  type: "String",
  dbName: dbName ?? null,
});
const relation = (
  name: string,
  type: string,
  from: string,
  to = "id",
  isRequired = true,
): Field => ({
  name,
  kind: "object",
  type,
  isRequired,
  relationFromFields: [from],
  relationToFields: [to],
});

const invoice = model("Invoice", [scalar("id"), scalar("tenantId", "tenant_id")], {
  dbName: "invoices",
});

describe("parseDirective", () => {
  it("reads nested parentheses whole", () => {
    expect(parseDirective("Some prose.\n@rls using((a = 1) OR (b IN (SELECT 1)))")).toEqual([
      { name: "using", arg: "(a = 1) OR (b IN (SELECT 1))" },
    ]);
  });

  it("reads a read/write pair", () => {
    expect(parseDirective("@rls read(x) write(y)")).toEqual([
      { name: "read", arg: "x" },
      { name: "write", arg: "y" },
    ]);
  });

  it("returns null when there is no directive", () => {
    expect(parseDirective("just docs")).toBeNull();
  });
});

describe("resolveRules", () => {
  it("infers tenant isolation from a tenant_id column", () => {
    const rules = resolveRules([invoice]);
    expect(rules.get("Invoice")).toEqual({
      kind: "policy",
      write: '"tenant_id" = public.current_tenant_id()',
    });
  });

  it("infers a child's rule through its one tenant-scoped parent", () => {
    const item = model(
      "InvoiceItem",
      [
        scalar("id"),
        scalar("invoiceId", "invoice_id"),
        relation("invoice", "Invoice", "invoiceId"),
      ],
      {
        dbName: "invoice_items",
      },
    );
    const rules = resolveRules([invoice, item]);
    expect(rules.get("InvoiceItem")?.kind).toBe("policy");
    expect((rules.get("InvoiceItem") as { write: string }).write).toBe(
      '"invoice_id" IN (SELECT "id" FROM "public"."invoices" WHERE "tenant_id" = public.current_tenant_id())',
    );
  });

  it("refuses a table with no tenant column and no directive — every table needs an access decision", () => {
    const setting = model("Setting", [scalar("id"), scalar("value")]);
    expect(() => resolveRules([setting])).toThrow(/Setting: no tenant column/);
  });

  it("refuses to guess between two tenant-scoped parents", () => {
    const order = model("Order", [scalar("id"), scalar("tenantId", "tenant_id")], {
      dbName: "orders",
    });
    const both = model("Link", [
      scalar("id"),
      scalar("orderId"),
      scalar("invoiceId"),
      relation("order", "Order", "orderId"),
      relation("invoice", "Invoice", "invoiceId"),
    ]);
    expect(() => resolveRules([invoice, order, both])).toThrow(
      /more than one tenant-scoped parent/,
    );
  });

  it("honours an explicit directive over inference", () => {
    const rules = resolveRules([
      model("Plan", [scalar("id"), scalar("tenantId", "tenant_id")], {
        documentation: "@rls global",
      }),
    ]);
    expect(rules.get("Plan")).toEqual({ kind: "policy", write: "true" });
  });

  it("rejects an unknown directive", () => {
    expect(() =>
      resolveRules([model("X", [scalar("id")], { documentation: "@rls public" })]),
    ).toThrow(/unknown directive/);
  });
});

describe("renderSql", () => {
  it("writes one policy with no TO clause, so any runtime role name works", () => {
    const sql = renderSql([invoice], resolveRules([invoice]));
    const policy = sql.split("\n").find((l) => l.startsWith("CREATE POLICY"));
    expect(policy).toBe(
      'CREATE POLICY "invoices_rls" ON "public"."invoices" FOR ALL USING ("tenant_id" = public.current_tenant_id()) WITH CHECK ("tenant_id" = public.current_tenant_id());',
    );
    expect(policy).not.toMatch(/\bTO\b/);
  });

  it("splits read from write when asked", () => {
    const profile = model("Profile", [scalar("id")], {
      dbName: "profiles",
      documentation:
        "@rls read(is_active OR tenant_id = public.current_tenant_id()) write(tenant_id = public.current_tenant_id())",
    });
    const sql = renderSql([profile], resolveRules([profile]));
    expect(sql).toContain('CREATE POLICY "profiles_read" ON "public"."profiles" FOR SELECT USING');
    expect(sql).toContain('CREATE POLICY "profiles_write" ON "public"."profiles" FOR ALL USING');
  });

  it("drops every policy it does not define, and the retired helper", () => {
    const sql = renderSql([invoice], resolveRules([invoice]));
    expect(sql).toContain("('public', 'invoices', 'invoices_rls')");
    expect(sql).toContain("DROP FUNCTION IF EXISTS public.current_org_id();");
  });

  it("disables RLS on an off table and writes no policy for it", () => {
    const sys = model("Job", [scalar("id")], { dbName: "jobs", documentation: "@rls off" });
    const sql = renderSql([sys], resolveRules([sys]));
    expect(sql).toContain('ALTER TABLE "public"."jobs" DISABLE ROW LEVEL SECURITY;');
    expect(sql).not.toContain('CREATE POLICY "jobs');
  });
});
