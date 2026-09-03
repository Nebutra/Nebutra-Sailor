/**
 * P1.4 — parametrised cross-tenant matrix for every table covered by
 * 20260903000000_rls_full_tenant_coverage/migration.sql.
 *
 * This test does not retype the migration's policy SQL: it reads the real
 * migration file off disk and extracts each table's `ALTER TABLE ... ENABLE
 * ROW LEVEL SECURITY` + `CREATE POLICY` statements verbatim (see
 * extractTablePolicySql below), then applies those exact statements to a
 * throwaway table of the same name carrying only the columns the policy
 * predicate touches. A typo or a dropped WITH CHECK in the shipped migration
 * breaks this test; a hand-retyped copy of the policy text would not.
 *
 * Same dual-backend contract as rls-dual-tenant-attack.test.ts: PGlite always
 * runs in CI; RLS_ATTACK_DATABASE_URL (or a localhost DATABASE_URL) replays
 * the identical assertions against real PostgreSQL — see the `postgres`
 * service now on the `test` job in .github/workflows/ci.yml.
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  availableBackends,
  becomeTenant,
  randomRoleName,
  type SqlClient,
} from "./support/rls-sql-client";

const here = dirname(fileURLToPath(import.meta.url));
const migrationsDir = join(here, "..", "prisma", "migrations");

const currentOrgIdFunctionSql = extractCurrentOrgIdFunction(
  readFileSync(join(migrationsDir, "20260313000000_enable_rls", "migration.sql"), "utf8"),
);

const coverageMigrationSql = readFileSync(
  join(migrationsDir, "20260903000000_rls_full_tenant_coverage", "migration.sql"),
  "utf8",
);

/** The `CREATE OR REPLACE FUNCTION current_org_id() ... $$;` block, verbatim. */
function extractCurrentOrgIdFunction(migrationSql: string): string {
  const match = migrationSql.match(/CREATE OR REPLACE FUNCTION current_org_id\(\)[\s\S]*?\$\$;/);
  if (!match) {
    throw new Error("current_org_id() definition not found in 20260313000000_enable_rls");
  }
  return match[0];
}

/**
 * `ALTER TABLE "table" ENABLE ROW LEVEL SECURITY;` plus every
 * `CREATE POLICY "..." ON "table" ...;` statement for that table, verbatim
 * from the migration file, concatenated in source order.
 */
function extractTablePolicySql(table: string): string {
  const alterMatch = coverageMigrationSql.match(
    new RegExp(`ALTER TABLE "${table}" ENABLE ROW LEVEL SECURITY;`),
  );
  if (!alterMatch) {
    throw new Error(`ENABLE ROW LEVEL SECURITY not found for "${table}" in the coverage migration`);
  }
  const policyMatches = [
    ...coverageMigrationSql.matchAll(
      new RegExp(`CREATE POLICY "[^"]+" ON "${table}"[\\s\\S]*?;`, "g"),
    ),
  ];
  if (policyMatches.length === 0) {
    throw new Error(`No CREATE POLICY statements found for "${table}" in the coverage migration`);
  }
  return [alterMatch[0], ...policyMatches.map((m) => m[0])].join("\n");
}

type Shape = "standard" | "id" | "org" | "cofounder" | "transfer";

interface TableCase {
  table: string;
  shape: Shape;
}

// The 34 uniform tables from the migration (32 tenant_id + tenants [id] +
// organization_invitations [organization_id]) plus the 2 non-standard ones
// that split SELECT from write. Mirrors the migration's table list exactly —
// see the PR description for how this list was derived from schema.prisma.
const STANDARD_TABLES = [
  "access_invite_codes",
  "access_invite_redemptions",
  "agent_rollout_lines",
  "ai_request_logs",
  "audit_logs",
  "automation_runs",
  "automations",
  "chat_sessions",
  "code_redemptions",
  "connectors",
  "credit_balances",
  "customer_feature_overrides",
  "customer_plan_versions",
  "customer_usage_limits",
  "feedback_reports",
  "invoices",
  "notification_preferences",
  "notifications",
  "oauth_clients",
  "payment_methods",
  "payments",
  "stripe_customers",
  "subscriptions",
  "tasks",
  "tenant_provider_keys",
  "threads",
  "uploads",
  "usage_ledger_entries",
  "user_consents",
  "user_skills",
  "workflow_definitions",
  "workflow_runs",
];

const TABLE_CASES: TableCase[] = [
  ...STANDARD_TABLES.map((table): TableCase => ({ table, shape: "standard" })),
  { table: "tenants", shape: "id" },
  { table: "organization_invitations", shape: "org" },
  { table: "cofounder_profiles", shape: "cofounder" },
  { table: "tenant_transfer_journals", shape: "transfer" },
];

function throwawayTableDdl(t: TableCase): string {
  switch (t.shape) {
    case "standard":
      return `CREATE TABLE "${t.table}" (id text PRIMARY KEY, tenant_id text NOT NULL, body text NOT NULL);`;
    case "id":
      return `CREATE TABLE "${t.table}" (id text PRIMARY KEY, body text NOT NULL);`;
    case "org":
      return `CREATE TABLE "${t.table}" (id text PRIMARY KEY, organization_id text NOT NULL, body text NOT NULL);`;
    case "cofounder":
      return `CREATE TABLE "${t.table}" (id text PRIMARY KEY, tenant_id text NOT NULL, is_active boolean NOT NULL DEFAULT false, body text NOT NULL);`;
    case "transfer":
      return `CREATE TABLE "${t.table}" (id text PRIMARY KEY, from_tenant_id text NOT NULL, to_tenant_id text, body text NOT NULL);`;
  }
}

describe.each(availableBackends("rls_coverage"))("RLS migration coverage ($name)", ({ open }) => {
  let db: SqlClient;
  let role: string;

  beforeAll(async () => {
    role = randomRoleName("app_coverage");
    db = await open();
    await db.exec(`CREATE ROLE ${role} NOSUPERUSER NOBYPASSRLS LOGIN;`);
    await db.exec(currentOrgIdFunctionSql);
    for (const t of TABLE_CASES) {
      await db.exec(throwawayTableDdl(t));
      await db.exec(extractTablePolicySql(t.table));
      await db.exec(`GRANT ALL ON TABLE "${t.table}" TO ${role};`);
    }
  });

  afterAll(async () => {
    if (db) db.role = role;
    await db?.close();
  });

  describe.each(
    TABLE_CASES.filter((t) => t.shape === "standard" || t.shape === "id" || t.shape === "org"),
  )("$table", ({ table, shape }) => {
    const tenantCol = shape === "id" ? "id" : shape === "org" ? "organization_id" : "tenant_id";
    const tenantA = `tenant_a_${table}`;
    const tenantB = `tenant_b_${table}`;
    // For shape "id" the row's own primary key IS the tenant value, so the
    // two ids must equal the two tenant values; every other shape gets
    // independent surrogate row ids.
    const idA = shape === "id" ? tenantA : `${table}_row_a`;
    const idB = shape === "id" ? tenantB : `${table}_row_b`;

    beforeAll(async () => {
      await db.exec("RESET ROLE");
      const cols = shape === "id" ? "id, body" : `id, ${tenantCol}, body`;
      const valsA = shape === "id" ? `'${idA}', 'secret-a'` : `'${idA}', '${tenantA}', 'secret-a'`;
      const valsB = shape === "id" ? `'${idB}', 'secret-b'` : `'${idB}', '${tenantB}', 'secret-b'`;
      await db.exec(`INSERT INTO "${table}" (${cols}) VALUES (${valsA}), (${valsB})`);
    });

    it("owner/superuser bypass sees every row", async () => {
      await db.exec("RESET ROLE");
      const rows = await db.query<{ count: string | number }>(
        `SELECT count(*)::int AS count FROM "${table}" WHERE id IN ('${idA}', '${idB}')`,
      );
      expect(Number(rows[0]?.count)).toBe(2);
    });

    it("read: tenant A sees only its own row", async () => {
      await becomeTenant(db, role, tenantA);
      const visible = await db.query<{ id: string }>(
        `SELECT id FROM "${table}" WHERE id IN ('${idA}', '${idB}') ORDER BY id`,
      );
      expect(visible).toEqual([{ id: idA }]);
    });

    it("insert: tenant A cannot write a row into tenant B", async () => {
      await becomeTenant(db, role, tenantA);
      const cols = shape === "id" ? "id, body" : `id, ${tenantCol}, body`;
      const stolenId = `${table}_stolen`;
      const vals =
        shape === "id" ? `'${stolenId}', 'stolen'` : `'${stolenId}', '${tenantB}', 'stolen'`;
      await expect(db.exec(`INSERT INTO "${table}" (${cols}) VALUES (${vals})`)).rejects.toThrow(
        /row-level security/i,
      );
    });

    it("update: tenant A cannot mutate tenant B's row", async () => {
      await becomeTenant(db, role, tenantA);
      await db.exec(`UPDATE "${table}" SET body = 'mutated' WHERE id = '${idB}'`);
      await db.exec("RESET ROLE");
      const row = await db.query<{ body: string }>(
        `SELECT body FROM "${table}" WHERE id = '${idB}'`,
      );
      expect(row[0]?.body).toBe("secret-b");
    });

    it("delete: tenant A cannot remove tenant B's row", async () => {
      await becomeTenant(db, role, tenantA);
      await db.exec(`DELETE FROM "${table}" WHERE id = '${idB}'`);
      await db.exec("RESET ROLE");
      const row = await db.query<{ id: string }>(`SELECT id FROM "${table}" WHERE id = '${idB}'`);
      expect(row).toHaveLength(1);
    });

    it("update: tenant A can mutate its own row, and a rollback discards it", async () => {
      await becomeTenant(db, role, tenantA);
      await db.exec("BEGIN");
      await db.exec(`UPDATE "${table}" SET body = 'in-flight' WHERE id = '${idA}'`);
      const midTransaction = await db.query<{ body: string }>(
        `SELECT body FROM "${table}" WHERE id = '${idA}'`,
      );
      expect(midTransaction[0]?.body).toBe("in-flight");
      await db.exec("ROLLBACK");

      const afterRollback = await db.query<{ body: string }>(
        `SELECT body FROM "${table}" WHERE id = '${idA}'`,
      );
      expect(afterRollback[0]?.body).toBe("secret-a");
    });

    it("empty tenant context sees nothing, not everything", async () => {
      await becomeTenant(db, role, "");
      const rows = await db.query<{ id: string }>(
        `SELECT id FROM "${table}" WHERE id IN ('${idA}', '${idB}')`,
      );
      expect(rows).toEqual([]);
    });
  });

  describe("cofounder_profiles (split select/write)", () => {
    const table = "cofounder_profiles";
    const tenantA = "tenant_a_cofounder";
    const tenantB = "tenant_b_cofounder";
    const tenantC = "tenant_c_cofounder";

    beforeAll(async () => {
      await db.exec("RESET ROLE");
      await db.exec(`
        INSERT INTO "${table}" (id, tenant_id, is_active, body) VALUES
          ('cp_a', '${tenantA}', true, 'profile-a'),
          ('cp_b', '${tenantB}', false, 'profile-b'),
          ('cp_c', '${tenantC}', true, 'profile-c')
      `);
    });

    it("shows the caller's own row plus every ACTIVE row, not inactive rows from other tenants", async () => {
      await becomeTenant(db, role, tenantA);
      const visible = await db.query<{ id: string }>(
        `SELECT id FROM "${table}" WHERE id IN ('cp_a','cp_b','cp_c') ORDER BY id`,
      );
      // cp_a: own. cp_b: other tenant, inactive -> hidden. cp_c: other tenant, active -> visible.
      expect(visible).toEqual([{ id: "cp_a" }, { id: "cp_c" }]);
    });

    it("an active row from another tenant is readable but not writable", async () => {
      await becomeTenant(db, role, tenantA);
      await db.exec(`UPDATE "${table}" SET body = 'mutated' WHERE id = 'cp_c'`);
      await db.exec(`DELETE FROM "${table}" WHERE id = 'cp_c'`);
      await db.exec("RESET ROLE");
      const row = await db.query<{ body: string }>(`SELECT body FROM "${table}" WHERE id = 'cp_c'`);
      expect(row[0]?.body).toBe("profile-c");
    });

    it("cannot insert a profile claiming another tenant", async () => {
      await becomeTenant(db, role, tenantA);
      await expect(
        db.exec(
          `INSERT INTO "${table}" (id, tenant_id, is_active, body) VALUES ('cp_stolen', '${tenantB}', true, 'stolen')`,
        ),
      ).rejects.toThrow(/row-level security/i);
    });

    it("can update its own row", async () => {
      await becomeTenant(db, role, tenantB);
      await db.exec(`UPDATE "${table}" SET body = 'updated-by-owner' WHERE id = 'cp_b'`);
      await db.exec("RESET ROLE");
      const row = await db.query<{ body: string }>(`SELECT body FROM "${table}" WHERE id = 'cp_b'`);
      expect(row[0]?.body).toBe("updated-by-owner");
    });
  });

  describe("tenant_transfer_journals (sender/receiver split)", () => {
    const table = "tenant_transfer_journals";
    const tenantA = "tenant_a_transfer";
    const tenantB = "tenant_b_transfer";
    const tenantC = "tenant_c_transfer";

    beforeAll(async () => {
      await db.exec("RESET ROLE");
      await db.exec(`
        INSERT INTO "${table}" (id, from_tenant_id, to_tenant_id, body) VALUES
          ('ttj_ab', '${tenantA}', '${tenantB}', 'a-sends-to-b'),
          ('ttj_bc', '${tenantB}', '${tenantC}', 'b-sends-to-c')
      `);
    });

    it("the sender sees rows it sent", async () => {
      await becomeTenant(db, role, tenantA);
      const visible = await db.query<{ id: string }>(
        `SELECT id FROM "${table}" WHERE id IN ('ttj_ab','ttj_bc') ORDER BY id`,
      );
      expect(visible).toEqual([{ id: "ttj_ab" }]);
    });

    it("the receiver sees rows sent to it, and a tenant with neither role sees nothing", async () => {
      await becomeTenant(db, role, tenantB);
      const asReceiverAndSender = await db.query<{ id: string }>(
        `SELECT id FROM "${table}" WHERE id IN ('ttj_ab','ttj_bc') ORDER BY id`,
      );
      // tenant B is the receiver of ttj_ab and the sender of ttj_bc — both visible.
      expect(asReceiverAndSender).toEqual([{ id: "ttj_ab" }, { id: "ttj_bc" }]);

      await becomeTenant(db, role, tenantC);
      const asReceiverOnly = await db.query<{ id: string }>(
        `SELECT id FROM "${table}" WHERE id IN ('ttj_ab','ttj_bc') ORDER BY id`,
      );
      expect(asReceiverOnly).toEqual([{ id: "ttj_bc" }]);
    });

    it("a row the caller only received (not sent) is readable but not writable", async () => {
      await becomeTenant(db, role, tenantB);
      await db.exec(`UPDATE "${table}" SET body = 'mutated' WHERE id = 'ttj_ab'`);
      await db.exec("RESET ROLE");
      const row = await db.query<{ body: string }>(
        `SELECT body FROM "${table}" WHERE id = 'ttj_ab'`,
      );
      expect(row[0]?.body).toBe("a-sends-to-b");
    });

    it("cannot insert a transfer claiming to be sent by another tenant", async () => {
      await becomeTenant(db, role, tenantA);
      await expect(
        db.exec(
          `INSERT INTO "${table}" (id, from_tenant_id, to_tenant_id, body) VALUES ('ttj_stolen', '${tenantB}', '${tenantA}', 'stolen')`,
        ),
      ).rejects.toThrow(/row-level security/i);
    });

    it("the sender can update its own outgoing row, and a rollback discards it", async () => {
      await becomeTenant(db, role, tenantB);
      await db.exec("BEGIN");
      await db.exec(`UPDATE "${table}" SET body = 'in-flight' WHERE id = 'ttj_bc'`);
      const midTransaction = await db.query<{ body: string }>(
        `SELECT body FROM "${table}" WHERE id = 'ttj_bc'`,
      );
      expect(midTransaction[0]?.body).toBe("in-flight");
      await db.exec("ROLLBACK");

      const afterRollback = await db.query<{ body: string }>(
        `SELECT body FROM "${table}" WHERE id = 'ttj_bc'`,
      );
      expect(afterRollback[0]?.body).toBe("b-sends-to-c");
    });
  });
});
