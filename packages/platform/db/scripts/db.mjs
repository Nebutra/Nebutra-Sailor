#!/usr/bin/env node
// =============================================================================
// The one command that brings a database to the schema — any host, any time.
// =============================================================================
//   pnpm db:deploy   apply pending migrations, then platform.sql and the
//                    generated RLS, then prove the result matches
//   pnpm db:check    read-only: report drift, exit 1 if there is any
//   pnpm db:adopt    once per database that predates the baseline: verify it
//                    already has the baseline's shape, then record the baseline
//                    as applied in place of the old history. Changes no table.
//
// Runs the same way from a container entrypoint, a Fly release_command, a K8s
// init container, CI, or a laptop — it needs DIRECT_URL (or DATABASE_URL) and
// nothing else. `prisma migrate deploy` takes Postgres' advisory lock, and the
// SQL step takes its own, so two instances starting at once are safe.
//
// Drift means any of: a migration in this checkout the database has not
// applied; a table, column or index that differs from schema.prisma; a policy
// or RLS switch that differs from prisma/generated/rls.sql. Nothing here asks
// anyone to run SQL by hand.
// =============================================================================

import { execFileSync } from "node:child_process";
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const say = (line) => process.stdout.write(`${line}\n`);
const warn = (line) => process.stderr.write(`${line}\n`);

const pkg = join(dirname(fileURLToPath(import.meta.url)), "..");
const url = process.env.DIRECT_URL || process.env.DATABASE_URL;
const appRole = process.env.APP_DB_ROLE || "app_user";
const LOCK = 7_021_733; // arbitrary, stable: "nebutra db"
const BASELINE = "00000000000000_baseline";

const command = process.argv[2];
if (!["deploy", "check", "adopt"].includes(command)) {
  warn("usage: db.mjs deploy|check|adopt");
  process.exit(2);
}
if (!url) {
  warn("DIRECT_URL or DATABASE_URL must be set");
  process.exit(2);
}

const prisma = (args, { allowFail = false } = {}) => {
  try {
    // The package's own prisma binary, not `pnpm exec`: a deploy container may
    // ship node_modules without pnpm.
    return {
      code: 0,
      out: execFileSync(join(pkg, "node_modules/.bin/prisma"), args, {
        cwd: pkg,
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"],
        env: { ...process.env, DATABASE_URL: url },
      }),
    };
  } catch (error) {
    if (!allowFail) {
      process.stderr.write(error.stdout ?? "");
      process.stderr.write(error.stderr ?? "");
      throw error;
    }
    return { code: error.status ?? 1, out: `${error.stdout ?? ""}${error.stderr ?? ""}` };
  }
};

const client = () => {
  const parsed = new URL(url);
  const local = ["localhost", "127.0.0.1", "::1"].includes(parsed.hostname);
  return new pg.Client({
    connectionString: url,
    ssl: local ? undefined : { rejectUnauthorized: false },
  });
};

const rlsSql = readFileSync(join(pkg, "prisma/generated/rls.sql"), "utf8");
const platformSql = readFileSync(join(pkg, "prisma/platform.sql"), "utf8");

/** The policy set and RLS switches rls.sql declares, read back from its text. */
function expectedRls() {
  const policies = new Set();
  const on = new Set();
  const off = new Set();
  for (const m of rlsSql.matchAll(/CREATE POLICY "([^"]+)" ON "([^"]+)"\."([^"]+)"/g))
    policies.add(`${m[2]}.${m[3]}.${m[1]}`);
  for (const m of rlsSql.matchAll(
    /ALTER TABLE "([^"]+)"\."([^"]+)" (ENABLE|DISABLE) ROW LEVEL SECURITY/g,
  ))
    (m[3] === "ENABLE" ? on : off).add(`${m[1]}.${m[2]}`);
  return { policies, on, off };
}

async function check() {
  const problems = [];

  // 1. Migrations: every folder in this checkout is applied.
  const local = readdirSync(join(pkg, "prisma/migrations"), { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .sort();
  const db = client();
  await db.connect();
  try {
    const history = await db.query(
      "select to_regclass('public._prisma_migrations') is not null as ok",
    );
    const applied = history.rows[0].ok
      ? new Set(
          (
            await db.query(
              "select migration_name from _prisma_migrations where finished_at is not null and rolled_back_at is null",
            )
          ).rows.map((r) => r.migration_name),
        )
      : new Set();
    const pending = local.filter((name) => !applied.has(name));
    if (pending.length)
      problems.push(`${pending.length} migration(s) not applied: ${pending.join(", ")}`);

    // 3. RLS: exactly the generated policies, and every switch as generated.
    const { policies, on, off } = expectedRls();
    const schemas = [...new Set([...on, ...off].map((t) => t.split(".")[0]))];
    const live = await db.query(
      "select schemaname||'.'||tablename||'.'||policyname as p from pg_policies where schemaname = any($1)",
      [schemas],
    );
    const livePolicies = new Set(live.rows.map((r) => r.p));
    const missing = [...policies].filter((p) => !livePolicies.has(p));
    const extra = [...livePolicies].filter((p) => !policies.has(p));
    if (missing.length)
      problems.push(
        `${missing.length} policy(ies) missing: ${missing.slice(0, 5).join(", ")}${missing.length > 5 ? " …" : ""}`,
      );
    if (extra.length)
      problems.push(
        `${extra.length} policy(ies) not in schema.prisma: ${extra.slice(0, 5).join(", ")}${extra.length > 5 ? " …" : ""}`,
      );
    const switches = await db.query(
      "select n.nspname||'.'||c.relname as t, c.relrowsecurity as rls from pg_class c join pg_namespace n on n.oid = c.relnamespace where c.relkind = 'r' and n.nspname = any($1)",
      [schemas],
    );
    for (const { t, rls } of switches.rows) {
      if (on.has(t) && !rls) problems.push(`RLS is off on ${t}, schema.prisma says on`);
      if (off.has(t) && rls) problems.push(`RLS is on for ${t}, schema.prisma says off`);
    }
  } finally {
    await db.end();
  }

  // 2. Structure: nothing between the database and schema.prisma.
  const diff = prisma(
    [
      "migrate",
      "diff",
      "--from-config-datasource",
      "--to-schema",
      "prisma/schema.prisma",
      "--exit-code",
    ],
    { allowFail: true },
  );
  if (diff.code === 2)
    problems.push(
      "tables/columns/indexes differ from schema.prisma (run `prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma --script` to see)",
    );
  else if (diff.code !== 0)
    problems.push(`could not diff the schema: ${diff.out.trim().split("\n").pop()}`);

  return problems;
}

/**
 * What the database's migration history says about where it came from. Only
 * FINISHED rows count: a failed `migrate deploy` leaves an unfinished row, and
 * reading that as "applied" would call a database adopted that is not.
 */
async function history() {
  const db = client();
  await db.connect();
  try {
    const tables = (
      await db.query(
        "select count(*)::int as n from pg_tables where schemaname = 'public' and tablename <> '_prisma_migrations'",
      )
    ).rows[0].n;
    const exists = (
      await db.query("select to_regclass('public._prisma_migrations') is not null as ok")
    ).rows[0].ok;
    if (!exists) return { kind: tables === 0 ? "empty" : "unmanaged", tables };
    const all = (
      await db.query(
        "select migration_name, finished_at is not null as done from _prisma_migrations where rolled_back_at is null",
      )
    ).rows;
    const failed = all.filter((r) => !r.done).map((r) => r.migration_name);
    const applied = all.filter((r) => r.done).map((r) => r.migration_name);
    if (failed.length) return { kind: "failed", failed, tables };
    if (applied.includes(BASELINE)) return { kind: "baseline" };
    if (applied.length) return { kind: "legacy", legacy: applied.length, tables };
    return { kind: tables === 0 ? "empty" : "unmanaged", tables };
  } finally {
    await db.end();
  }
}

async function applyPlatformAndRls() {
  const db = client();
  await db.connect();
  try {
    await db.query("BEGIN");
    await db.query("SELECT pg_advisory_xact_lock($1)", [LOCK]);
    await db.query("SELECT set_config('nebutra.app_role', $1, true)", [appRole]);
    await db.query(platformSql);
    await db.query(rlsSql);
    await db.query("COMMIT");
  } catch (error) {
    await db.query("ROLLBACK").catch(() => {});
    throw error;
  } finally {
    await db.end();
  }
}

async function adopt() {
  const state = await history();
  if (state.kind === "baseline") {
    say("✓ already on the baseline — nothing to adopt");
    return;
  }
  if (state.kind === "empty") {
    throw new Error("this database is empty — run `db:deploy`, which builds it from the baseline");
  }
  // legacy, unmanaged, or a failed attempt at the baseline itself: all fine to
  // adopt, as long as the tables below already are the baseline.
  // The only proof that matters: the live tables already are the baseline.
  const diff = prisma(
    [
      "migrate",
      "diff",
      "--from-config-datasource",
      "--to-schema",
      "prisma/schema.prisma",
      "--script",
    ],
    { allowFail: true },
  );
  const pending = diff.out
    .split("\n")
    .filter((l) => l.trim() && !l.startsWith("--") && !/^(Loaded|Prisma schema)/.test(l));
  if (pending.length) {
    throw new Error(
      `the database does not match schema.prisma yet, so it is not the baseline. Bring it level first (apply its pending legacy migrations), then adopt. Prisma would still run:\n${pending.slice(0, 20).join("\n")}`,
    );
  }
  say(
    `▸ structure matches schema.prisma — replacing ${state.legacy ?? 0} legacy history row(s) with the baseline`,
  );
  if (state.kind !== "unmanaged") {
    const db = client();
    await db.connect();
    try {
      await db.query("DELETE FROM _prisma_migrations");
    } finally {
      await db.end();
    }
  }
  process.stdout.write(prisma(["migrate", "resolve", "--applied", BASELINE]).out);
  say("▸ platform.sql + generated rls.sql");
  await applyPlatformAndRls();
}

async function deploy() {
  const state = await history();
  if (state.kind === "legacy") {
    throw new Error(
      "this database predates the baseline (its history has no 00000000000000_baseline). Run `db:adopt` once — it records the baseline without touching a table. `migrate deploy` here would try to create tables that exist.",
    );
  }
  if (state.kind === "unmanaged") {
    throw new Error(
      `this database has ${state.tables} tables but no migration history (it was built by \`db push\`). If it matches schema.prisma, \`db:adopt\` records the baseline for it.`,
    );
  }
  if (state.kind === "failed") {
    throw new Error(
      `a migration failed here and was never resolved: ${state.failed.join(", ")}. Postgres rolled its changes back; fix the cause, then \`prisma migrate resolve --rolled-back <name>\` and deploy again.`,
    );
  }
  say("▸ prisma migrate deploy");
  process.stdout.write(prisma(["migrate", "deploy"]).out);

  say("▸ platform.sql + generated rls.sql");
  await applyPlatformAndRls();
}

try {
  if (command === "deploy") await deploy();
  if (command === "adopt") await adopt();
  const problems = await check();
  if (problems.length) {
    warn(`✗ database has drifted from the schema:\n  - ${problems.join("\n  - ")}`);
    process.exit(1);
  }
  say("✓ database matches schema.prisma, its migrations and its row-level security");
} catch (error) {
  warn(`✗ ${error.message}`);
  process.exit(1);
}
