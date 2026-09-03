/**
 * Shared dual-backend SQL client for RLS tests.
 *
 * PGlite (an in-memory Postgres WASM build) always runs in CI — no external
 * service required. When a real PostgreSQL is reachable (RLS_ATTACK_DATABASE_URL,
 * or a localhost DATABASE_URL — see the `test` job in .github/workflows/ci.yml,
 * which now runs a `postgres:16-alpine` service for this file), the same SQL
 * replays against it too, in its own throwaway schema per test run.
 */
import type { PGlite } from "@electric-sql/pglite";

export interface SqlClient {
  kind: string;
  role?: string;
  exec(sql: string): Promise<void>;
  query<T extends Record<string, unknown>>(sql: string, params?: unknown[]): Promise<T[]>;
  close(): Promise<void>;
}

export async function createPgliteClient(): Promise<SqlClient> {
  const { PGlite: PGliteCtor } = await import("@electric-sql/pglite");
  const db: PGlite = new PGliteCtor();
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

export async function createPostgresClient(
  connectionString: string,
  schemaPrefix = "rls_attack",
): Promise<SqlClient> {
  const { Client } = await import("pg");
  const client = new Client({ connectionString });
  await client.connect();
  const schema = `${schemaPrefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  await client.query(`CREATE SCHEMA ${schema}`);
  // Unlike the built-in "public" schema, a freshly created schema grants
  // USAGE only to its owner. The throwaway role each test creates cannot see
  // (let alone query) anything in it without this — a non-owner role would
  // otherwise silently fail over to a same-named table in "public" instead
  // (found via search_path, but built for a different test entirely), which
  // is exactly the kind of failure a Postgres-only backend needs to catch.
  await client.query(`GRANT USAGE ON SCHEMA ${schema} TO PUBLIC`);
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

/** RLS_ATTACK_DATABASE_URL, or a DATABASE_URL that plainly targets localhost. */
export function localhostDatabaseUrl(): string | undefined {
  const explicit = process.env.RLS_ATTACK_DATABASE_URL;
  if (explicit) return explicit;
  const url = process.env.DATABASE_URL;
  if (!url?.startsWith("postgres")) return undefined;
  if (!/localhost|127\.0\.0\.1/u.test(url)) return undefined;
  return url;
}

export async function becomeTenant(db: SqlClient, role: string, tenantId: string): Promise<void> {
  await db.exec(`SET ROLE ${role}`);
  await db.query(`SELECT set_config('app.current_tenant_id', $1, false)`, [tenantId]);
}

export function randomRoleName(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

export interface Backend {
  name: string;
  open: () => Promise<SqlClient>;
}

/** pglite always; postgresql appended only when a real database is reachable. */
export function availableBackends(schemaPrefix?: string): Backend[] {
  const backends: Backend[] = [{ name: "pglite", open: createPgliteClient }];
  const postgresUrl = localhostDatabaseUrl();
  if (postgresUrl) {
    backends.push({
      name: "postgresql",
      open: () => createPostgresClient(postgresUrl, schemaPrefix),
    });
  }
  return backends;
}
