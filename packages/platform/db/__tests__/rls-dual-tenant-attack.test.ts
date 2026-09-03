/**
 * Dual-tenant RLS attack: a non-bypass role must not read or write another
 * tenant's rows, even when it knows the primary key.
 *
 * PGlite runs this in CI. Set RLS_ATTACK_DATABASE_URL (or a localhost
 * DATABASE_URL) to replay the same SQL against real PostgreSQL — see the
 * `test` job in .github/workflows/ci.yml, which now runs a Postgres service
 * for exactly this file and rls-migration-coverage.test.ts.
 */
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  availableBackends,
  becomeTenant,
  randomRoleName,
  type SqlClient,
} from "./support/rls-sql-client";

function setupSql(role: string): string {
  return `
  CREATE ROLE ${role} NOSUPERUSER NOBYPASSRLS LOGIN;
  CREATE TABLE tenant_docs (
    id text PRIMARY KEY,
    tenant_id text NOT NULL,
    body text NOT NULL
  );
  ALTER TABLE tenant_docs ENABLE ROW LEVEL SECURITY;
  ALTER TABLE tenant_docs FORCE ROW LEVEL SECURITY;
  CREATE OR REPLACE FUNCTION current_org_id() RETURNS text
    LANGUAGE sql STABLE
  AS $$
    SELECT COALESCE(current_setting('app.current_tenant_id', true), '')
  $$;
  CREATE POLICY tenant_docs_isolation ON tenant_docs
    USING (tenant_id = current_org_id())
    WITH CHECK (tenant_id = current_org_id());
  GRANT ALL ON TABLE tenant_docs TO ${role};
`;
}

async function seedTenants(db: SqlClient): Promise<void> {
  await db.exec("RESET ROLE");
  await db.exec(`
    INSERT INTO tenant_docs (id, tenant_id, body) VALUES
      ('a1', 'org_a', 'secret-a'),
      ('b1', 'org_b', 'secret-b')
  `);
}

describe.each(availableBackends())("dual-tenant RLS attack ($name)", ({ open }) => {
  let db: SqlClient;
  let role: string;

  beforeEach(() => {
    role = randomRoleName("app_tenant");
  });

  afterEach(async () => {
    if (db) db.role = role;
    await db?.close();
  });

  it("keeps tenant B rows invisible and unwritable to tenant A", async () => {
    db = await open();
    await db.exec(setupSql(role));
    await seedTenants(db);

    const asOwner = await db.query<{ count: string | number }>(
      "SELECT count(*)::int AS count FROM tenant_docs",
    );
    expect(Number(asOwner[0]?.count)).toBe(2);

    await becomeTenant(db, role, "org_a");
    const visible = await db.query<{ id: string; body: string }>(
      "SELECT id, body FROM tenant_docs ORDER BY id",
    );
    expect(visible).toEqual([{ id: "a1", body: "secret-a" }]);

    await expect(
      db.exec(`INSERT INTO tenant_docs VALUES ('b2', 'org_b', 'stolen')`),
    ).rejects.toThrow(/row-level security/i);

    await expect(
      db.exec(`UPDATE tenant_docs SET body = 'mutated' WHERE id = 'b1'`),
    ).resolves.toBeUndefined();
    await expect(db.exec(`DELETE FROM tenant_docs WHERE id = 'b1'`)).resolves.toBeUndefined();

    await db.exec("RESET ROLE");
    const untouched = await db.query<{ id: string; body: string }>(
      "SELECT id, body FROM tenant_docs WHERE id = 'b1'",
    );
    expect(untouched).toEqual([{ id: "b1", body: "secret-b" }]);
  });

  it("rejects an empty tenant context instead of leaking every row", async () => {
    db = await open();
    await db.exec(setupSql(role));
    await seedTenants(db);
    await becomeTenant(db, role, "");

    const leaked = await db.query<{ id: string }>("SELECT id FROM tenant_docs");
    expect(leaked).toEqual([]);
  });

  it("switches isolation when the session tenant changes", async () => {
    db = await open();
    await db.exec(setupSql(role));
    await seedTenants(db);

    await becomeTenant(db, role, "org_a");
    expect(await db.query<{ id: string }>("SELECT id FROM tenant_docs")).toEqual([{ id: "a1" }]);

    await becomeTenant(db, role, "org_b");
    expect(await db.query<{ id: string }>("SELECT id FROM tenant_docs")).toEqual([{ id: "b1" }]);
  });
});
