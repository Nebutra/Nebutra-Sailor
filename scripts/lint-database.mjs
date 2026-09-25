#!/usr/bin/env node
// CI guard: one source for the database (ADR 2026-09-25 database convergence).
//
// The database used to be described in four places — schema.prisma, two
// competing RLS models inside migrations, and hand-applied SQL under infra/ —
// and they drifted until no file could build an empty database. Everything now
// comes from packages/platform/db/prisma: schema.prisma (tables + `/// @rls`),
// platform.sql (functions, role settings), generated/rls.sql (policies), and
// migrations/ (baseline + generated deltas). This keeps it that way:
//
//   1. The baseline is frozen. Existing databases adopted it by checksum; a
//      changed baseline would silently diverge from every one of them.
//   2. Migrations change structure only. Policies, RLS switches, functions,
//      grants and roles in a migration file are applied once and then drift —
//      they belong in `/// @rls` or platform.sql, which re-apply every deploy.
//   3. A destructive statement needs a written reason: `-- nebutra:destructive <why>`.
//   4. Migration folders are Prisma-shaped and sort after the baseline.
//   5. No CREATE POLICY anywhere else in the repository — no second RLS source.
//
// Run: node scripts/lint-database.mjs

import { createHash } from "node:crypto";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const root = new URL("..", import.meta.url).pathname;
const prismaDir = join(root, "packages/platform/db/prisma");
const migrationsDir = join(prismaDir, "migrations");
const BASELINE = "00000000000000_baseline";
const config =
  JSON.parse(readFileSync(join(root, "governance.config.json"), "utf8")).database ?? {};

const errors = [];
const fail = (file, message) => errors.push(`${relative(root, file)}: ${message}`);

// 1. Frozen baseline ---------------------------------------------------------
const baselineFile = join(migrationsDir, BASELINE, "migration.sql");
const baselineSha = createHash("sha256").update(readFileSync(baselineFile)).digest("hex");
if (baselineSha !== config.baselineSha256) {
  fail(
    baselineFile,
    `the baseline changed (sha256 ${baselineSha.slice(0, 12)}…, pinned ${String(config.baselineSha256).slice(0, 12)}…). ` +
      "Every existing database adopted this exact file; change the schema with a new migration instead.",
  );
}

// 2–4. Every later migration -------------------------------------------------
const STATE_NOT_STRUCTURE = [
  [
    /\bCREATE\s+POLICY\b|\bALTER\s+POLICY\b|\bDROP\s+POLICY\b/i,
    "a policy — declare it with `/// @rls` on the model",
  ],
  [
    /\b(ENABLE|DISABLE|FORCE)\s+ROW\s+LEVEL\s+SECURITY\b/i,
    "an RLS switch — declare it with `/// @rls` on the model",
  ],
  [/\bCREATE\s+(OR\s+REPLACE\s+)?FUNCTION\b/i, "a function — put it in prisma/platform.sql"],
  [/\b(GRANT|REVOKE)\b/i, "a grant — put it in prisma/platform.sql"],
  [/\b(CREATE|ALTER|DROP)\s+ROLE\b/i, "a role — provisioning, not a migration"],
];
const DESTRUCTIVE = [
  /\bDROP\s+(TABLE|COLUMN|TYPE|SCHEMA|INDEX)\b/i,
  /\bALTER\s+COLUMN\s+"?\w+"?\s+(SET\s+DATA\s+)?TYPE\b/i,
  /\bRENAME\s+(COLUMN|TO)\b/i,
  /\bTRUNCATE\b/i,
  /\bDELETE\s+FROM\b/i,
];

const stripComments = (sql) => sql.replace(/--.*$/gm, "");
const folders = readdirSync(migrationsDir, { withFileTypes: true })
  .filter((d) => d.isDirectory())
  .map((d) => d.name)
  .sort();

if (folders[0] !== BASELINE)
  fail(migrationsDir, `the first migration must be ${BASELINE}, found ${folders[0]}`);

for (const name of folders) {
  if (name === BASELINE) continue;
  const file = join(migrationsDir, name, "migration.sql");
  if (!/^\d{14}_[a-z0-9_]+$/.test(name))
    fail(
      file,
      "folder must be <14-digit timestamp>_<snake_case>, as `prisma migrate dev` names it",
    );
  const sql = readFileSync(file, "utf8");
  const code = stripComments(sql);
  for (const [pattern, what] of STATE_NOT_STRUCTURE) {
    if (pattern.test(code))
      fail(file, `contains ${what}. Migrations run once; these must re-apply on every deploy.`);
  }
  if (DESTRUCTIVE.some((p) => p.test(code)) && !/^--\s*nebutra:destructive\s+\S/m.test(sql)) {
    fail(
      file,
      "drops, retypes, renames or deletes data. Say why on a line `-- nebutra:destructive <reason>` so a reviewer sees it was meant.",
    );
  }
}

// 5. No second RLS source ----------------------------------------------------
const SKIP_DIRS = new Set([
  "node_modules",
  ".git",
  "dist",
  ".next",
  ".turbo",
  "coverage",
  "__tests__",
  "docs",
  "research",
]);
const RLS_HOME = join(prismaDir, "generated", "rls.sql");
function walk(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (SKIP_DIRS.has(entry.name)) continue;
    const path = join(dir, entry.name);
    if (entry.isDirectory()) walk(path);
    else if (entry.name.endsWith(".sql") && path !== RLS_HOME && !path.startsWith(migrationsDir)) {
      if (statSync(path).size > 2_000_000) continue;
      if (/\bCREATE\s+POLICY\b/i.test(stripComments(readFileSync(path, "utf8")))) {
        fail(
          path,
          "defines a policy outside schema.prisma. Row-level security has one source: `/// @rls` → generated/rls.sql.",
        );
      }
    }
  }
}
walk(root);

if (errors.length) {
  console.error(`✗ database: ${errors.length} problem(s)\n  - ${errors.join("\n  - ")}`);
  process.exit(1);
}
console.log(
  `✓ database: baseline frozen, ${folders.length - 1} migration(s) structure-only, one RLS source`,
);
