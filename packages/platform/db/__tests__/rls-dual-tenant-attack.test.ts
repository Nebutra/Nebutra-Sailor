/**
 * Dual-tenant RLS attack: a non-bypass role must not read or write another
 * tenant's rows, even when it knows the primary key.
 *
 * PGlite runs this in CI. Set RLS_ATTACK_DATABASE_URL (or a localhost
 * DATABASE_URL) to replay the same SQL against real PostgreSQL.
 */
import { PGlite } from "@electric-sql/pglite";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

interface SqlClient {
  kind: string;
  role?: string;
  exec(sql: string): Promise<void>;
  query<T extends Record<string, unknown>>(sql: string, params?: unknown[]): Promise<T[]>;
  close(): Promise<void>;
}

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

async function createPgliteClient(): Promise<SqlClient> {
  const db = new PGlite();
  return {
    kind: "pglite",
    async exec(sql) {
      await db.exec(sql);
    },
    async query<T extends Record<string, unknown>>(sql: string, params: unknown[] = []) {
      const result = await db.query<T>(sql, params);
      return result.rows;
    },
    async close() {
      await db.close();
    },
  };
}

async function createPostgresClient(connectionString: string): Promise<SqlClient> {
  const { Client } = await import("pg");
  const client = new Client({ connectionString });
  await client.connect();
  const schema = `rls_attack_${Date.now().toString(36)}`;
  await client.query(`CREATE SCHEMA ${schema}`);
  await client.query(`SET search_path TO ${schema}, public`);
  const handle: SqlClient = {
    kind: "postgresql",
    async exec(sql) {
      await client.query(sql);
    },
    async query<T extends Record<string, unknown>>(sql: string, params: unknown[] = []) {
      const result = await client.query(sql, params);
      return result.rows as T[];
    },
    async close() {
      await client.query("RESET ROLE");
      await client.query(`DROP SCHEMA IF EXISTS ${schema} CASCADE`);
      if (handle.role) {
        await client.query(`DROP ROLE IF EXISTS ${handle.role}`);
      }
      await client.end();
    },
  };
  return handle;
}

function localhostDatabaseUrl(): string | undefined {
  const explicit = process.env.RLS_ATTACK_DATABASE_URL;
  if (explicit) return explicit;
  const url = process.env.DATABASE_URL;
  if (!url?.startsWith("postgres")) return undefined;
  if (!/localhost|127\.0\.0\.1/u.test(url)) return undefined;
  return url;
}

async function becomeTenant(db: SqlClient, role: string, tenantId: string): Promise<void> {
  await db.exec(`SET ROLE ${role}`);
  await db.query(`SELECT set_config('app.current_tenant_id', $1, false)`, [tenantId]);
}

async function seedTenants(db: SqlClient): Promise<void> {
  await db.exec("RESET ROLE");
  await db.exec(`
    INSERT INTO tenant_docs (id, tenant_id, body) VALUES
      ('a1', 'org_a', 'secret-a'),
      ('b1', 'org_b', 'secret-b')
  `);
}

const backends: Array<{ name: string; open: () => Promise<SqlClient> }> = [
  { name: "pglite", open: createPgliteClient },
];

const postgresUrl = localhostDatabaseUrl();
if (postgresUrl) {
  backends.push({
    name: "postgresql",
    open: () => createPostgresClient(postgresUrl),
  });
}

describe.each(backends)("dual-tenant RLS attack ($name)", ({ open }) => {
  let db: SqlClient;
  let role: string;

  beforeEach(() => {
    role = `app_tenant_${Math.random().toString(36).slice(2, 10)}`;
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
