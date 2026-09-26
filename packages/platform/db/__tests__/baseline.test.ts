/**
 * The whole database, from empty, the way `pnpm db:deploy` builds it: the
 * baseline migration, then platform.sql, then the generated rls.sql — in a
 * real Postgres engine (PGlite, with the same extensions production runs).
 *
 * Before the 2026-09-25 convergence no file could do this: the migration
 * history started at a migration that ALTERed tables nothing had created. The
 * per-migration tests that lived in __tests__/migrations asserted what each
 * old file added; their contracts are the schema's now, and the ones worth
 * keeping as named guarantees are the cases below.
 */
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { PGlite } from "@electric-sql/pglite";
import { uuid_ossp } from "@electric-sql/pglite/contrib/uuid_ossp";
import { vector } from "@electric-sql/pglite/vector";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const prismaDir = join(dirname(fileURLToPath(import.meta.url)), "..", "prisma");
const read = (...parts: string[]) => readFileSync(join(prismaDir, ...parts), "utf8");

const migrations = readdirSync(join(prismaDir, "migrations"), { withFileTypes: true })
  .filter((d) => d.isDirectory())
  .map((d) => d.name)
  .sort();

let db: PGlite;

beforeAll(async () => {
  db = new PGlite({ extensions: { vector, uuid_ossp } });
  for (const name of migrations) await db.exec(read("migrations", name, "migration.sql"));
  await db.exec(read("platform.sql"));
  await db.exec(read("generated", "rls.sql"));
}, 120_000);

afterAll(async () => {
  await db?.close();
});

async function scalar<T>(sql: string, params: unknown[] = []): Promise<T> {
  const { rows } = await db.query<{ v: T }>(sql, params);
  return rows[0]?.v as T;
}

describe("database from empty", () => {
  it("starts from a baseline, so an empty database can be built at all", () => {
    expect(migrations[0]).toBe("00000000000000_baseline");
  });

  it("creates every model's table", async () => {
    const models = (read("schema.prisma").match(/^model \w+ \{/gm) ?? []).length;
    const tables = await scalar<number>(
      "select count(*)::int as v from pg_tables where schemaname in ('public', 'better_auth')",
    );
    expect(tables).toBe(models);
  });

  it("installs exactly the policies rls.sql generates, and nothing else", async () => {
    const generated = (read("generated", "rls.sql").match(/^CREATE POLICY /gm) ?? []).length;
    const live = await scalar<number>("select count(*)::int as v from pg_policies");
    expect(live).toBe(generated);
  });

  it("leaves no second tenant helper behind", async () => {
    expect(
      await scalar<number>(
        "select count(*)::int as v from pg_proc where proname = 'current_org_id'",
      ),
    ).toBe(0);
  });
});

describe("guarantees the old per-migration tests carried", () => {
  it("stores access invite codes hashed only — no plaintext column", async () => {
    const columns = await db.query<{ column_name: string }>(
      "select column_name from information_schema.columns where table_schema = 'public' and table_name = 'access_invite_codes'",
    );
    const names = columns.rows.map((r) => r.column_name);
    expect(names).toEqual(expect.arrayContaining(["code_hash", "code_prefix"]));
    expect(names).not.toContain("code");
  });

  it("cascades Better Auth members away with their user", async () => {
    const rule = await scalar<string>(
      `select rc.delete_rule as v
         from information_schema.referential_constraints rc
         join information_schema.key_column_usage k on k.constraint_name = rc.constraint_name
        where k.table_schema = 'better_auth' and k.table_name = 'member' and k.column_name = 'user_id'`,
    );
    expect(rule).toBe("CASCADE");
  });

  it("keeps organization slugs unique", async () => {
    await db.exec(
      `insert into better_auth.organization (id, name, slug, created_at) values ('o1', 'A', 'same', now())`,
    );
    await expect(
      db.exec(
        `insert into better_auth.organization (id, name, slug, created_at) values ('o2', 'B', 'same', now())`,
      ),
    ).rejects.toThrow(/unique/i);
  });
});

describe("what Prisma cannot express", () => {
  it("seeds the retention windows", async () => {
    expect(
      await scalar<number>(
        "select keep_days as v from retention_policies where table_name = 'audit_logs'",
      ),
    ).toBe(365);
    expect(await scalar<number>("select count(*)::int as v from retention_policies")).toBe(8);
  });

  it("refuses a retention window of zero days", async () => {
    await expect(
      db.exec("insert into retention_policies (table_name, keep_days) values ('x', 0)"),
    ).rejects.toThrow(/keep_days_check/);
  });

  it("ships the retention sweep", async () => {
    expect(
      await scalar<number>(
        "select count(*)::int as v from pg_proc where proname = 'purge_expired_rows'",
      ),
    ).toBe(1);
  });

  it("is idempotent: platform.sql and rls.sql apply cleanly a second time", async () => {
    await db.exec(read("platform.sql"));
    await db.exec(read("generated", "rls.sql"));
    const generated = (read("generated", "rls.sql").match(/^CREATE POLICY /gm) ?? []).length;
    expect(await scalar<number>("select count(*)::int as v from pg_policies")).toBe(generated);
  });
});
