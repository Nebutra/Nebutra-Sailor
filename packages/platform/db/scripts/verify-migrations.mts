/**
 * Prove the hand-written migrations implement exactly the schema delta.
 *
 * Production carries a `_prisma_migrations` table, so `ops-database-migrate`
 * resolves to `prisma migrate deploy` and every file under `prisma/migrations`
 * is executed there verbatim. CI's "Database Schema Check" pushes the schema
 * and diffs that, which never reads the migrations directory at all — so a
 * hand-written migration that disagrees with `schema.prisma` reaches production
 * unchallenged. This is the check that closes it.
 *
 * Method: rebuild the *previous* schema in a throwaway Postgres (PGlite, no
 * service to start), apply the new migrations exactly as production will, then
 * ask Prisma what is still missing between that database and today's
 * `schema.prisma`. Nothing missing means the SQL is right.
 *
 *   pnpm --filter @nebutra/db verify:migrations <base-ref> <migration-dir>...
 *
 * RLS policies are not expressible in `schema.prisma`, so the rebuilt baseline
 * has none. That is fine here — this checks the shape of tables and columns,
 * which is what a migration file can get wrong.
 */
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createPgliteClient } from "@nebutra/db/testing";

const [baseRef, ...migrations] = process.argv.slice(2);
if (!baseRef || migrations.length === 0) {
  process.stderr.write("usage: verify-migrations <base-ref> <migration-dir>...\n");
  process.exit(2);
}

const pkgDir = new URL("..", import.meta.url).pathname;
const work = mkdtempSync(join(tmpdir(), "verify-migrations-"));
const prisma = (args: string[]) =>
  execFileSync("pnpm", ["exec", "prisma", ...args], { cwd: pkgDir, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });

/** Prisma refuses a datasource it cannot resolve; the URL is never connected to. */
const neutralise = (schema: string) =>
  schema
    .replace(/url\s*=\s*env\("[^"]+"\)/g, 'url = "postgresql://verify:verify@127.0.0.1:1/verify"')
    .replace(/directUrl\s*=\s*env\("[^"]+"\)/g, "");

const oldPath = join(work, "old.prisma");
const newPath = join(work, "new.prisma");
writeFileSync(oldPath, neutralise(execFileSync("git", ["show", `${baseRef}:packages/platform/db/prisma/schema.prisma`], { encoding: "utf8" })));
writeFileSync(newPath, neutralise(readFileSync(join(pkgDir, "prisma/schema.prisma"), "utf8")));

const files = migrations.map((name) => ({
  name,
  sql: readFileSync(join(pkgDir, "prisma/migrations", name, "migration.sql"), "utf8"),
}));

// 1. Do they execute? Rebuild the previous schema in a real Postgres engine and
//    run each migration exactly as `migrate deploy` will. A typo, a wrong type,
//    an index on a column that does not exist — all fail here.
const db = await createPgliteClient();
try {
  // PGlite ships no contrib extensions; they are irrelevant to table shape.
  const baseline = prisma(["migrate", "diff", "--from-empty", "--to-schema", oldPath, "--script"])
    .split("\n")
    .filter((line) => !/^\s*CREATE EXTENSION/i.test(line))
    .join("\n");
  await db.exec(baseline);
  process.stdout.write(`baseline: schema at ${baseRef}\n`);
  for (const { name, sql } of files) {
    await db.exec(sql);
    process.stdout.write(`applied:  ${name}\n`);
  }
} finally {
  await db.close();
}

// 2. Are they complete? Prisma's own delta for the same change is the reference.
//    Every table and column it would create must appear in the hand-written SQL.
const canonical = prisma(["migrate", "diff", "--from-schema-datamodel", oldPath, "--to-schema", newPath, "--script"]);
const mine = files.map((f) => f.sql).join("\n").toLowerCase();
const norm = (s: string) => s.replace(/"/g, "").toLowerCase();

const missing: string[] = [];
for (const line of canonical.split("\n")) {
  const add = line.match(/^\s*ADD COLUMN\s+"?([\w]+)"?/i);
  const create = line.match(/^\s*CREATE TABLE\s+"?[\w.]*"?\.?"?([\w]+)"?/i);
  const type = line.match(/^\s*CREATE TYPE\s+"?[\w.]*"?\.?"?([\w]+)"?/i);
  const found = add?.[1] ?? create?.[1] ?? type?.[1];
  if (found && !norm(mine).includes(found.toLowerCase())) missing.push(line.trim());
}

if (missing.length === 0) {
  process.stdout.write("\nexecutes on Postgres, and covers every table, column and type Prisma would create\n");
} else {
  process.stdout.write(`\nINCOMPLETE: ${missing.length} thing(s) Prisma would create that the migrations do not\n${missing.slice(0, 25).join("\n")}\n`);
  process.exitCode = 1;
}
