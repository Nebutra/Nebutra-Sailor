#!/usr/bin/env node
// =============================================================================
// The preview database — Postgres with no Postgres to install.
// =============================================================================
//   node scripts/preview-db.mjs [serve]   start it (foreground), print the URL
//     --run "<cmd>"     run <cmd> with DATABASE_URL/DIRECT_URL/APP_DB_ROLE set,
//                       stop the database when it exits (a dev-set wrapper)
//     --idle-exit <ms>  stop after <ms> with no connections (auto-started mode)
//     --port <n>        default NEBUTRA_PREVIEW_DB_PORT or 54329
//     --no-seed         skip the demo organization and admin
//   node scripts/preview-db.mjs seed      add the demo data (idempotent)
//   node scripts/preview-db.mjs reset     delete the preview data directory
//   node scripts/preview-db.mjs env       print the env lines apps need
//
// PGlite (Postgres 17 in WASM) runs in this one process, persisted under
// <project>/.nebutra/pglite/, and is served over the Postgres wire protocol on
// 127.0.0.1 — so every app, the gateway and `prisma` reach it through the same
// `pg` + @prisma/adapter-pg path production uses, just with a local URL.
// scripts/preview/wire.mjs explains how N connections share one engine.
//
// The database is built by the same command every deploy runs — scripts/db.mjs
// deploy: migrations, platform.sql, generated rls.sql, then the drift check.
// It re-runs whenever any of those files change; otherwise a warm start skips
// it. Nothing here is imported by application code: `@nebutra/db` only ever
// spawns this file (src/preview.ts), and only when DATABASE_URL is unset or
// `pglite:` outside production.
// =============================================================================

import { execFileSync, spawn } from "node:child_process";
import { createHash, randomBytes, scrypt } from "node:crypto";
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { connect } from "node:net";
import { dirname, isAbsolute, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const say = (line) => process.stdout.write(`[preview-db] ${line}\n`);
const warn = (line) => process.stderr.write(`[preview-db] ${line}\n`);

const pkg = join(dirname(fileURLToPath(import.meta.url)), "..");
const DEFAULT_PORT = 54329;

// ── configuration ───────────────────────────────────────────────────────────

const argv = process.argv.slice(2);
const command = argv[0] && !argv[0].startsWith("--") ? argv.shift() : "serve";
const flag = (name) => {
  const i = argv.indexOf(`--${name}`);
  if (i === -1) return undefined;
  const next = argv[i + 1];
  return next === undefined || next.startsWith("--") ? true : next;
};

/** The project root: the nearest pnpm workspace above the cwd, else the cwd. */
function projectRoot() {
  let dir = resolve(process.cwd());
  for (;;) {
    if (existsSync(join(dir, "pnpm-workspace.yaml"))) return dir;
    const parent = dirname(dir);
    if (parent === dir) return process.cwd();
    dir = parent;
  }
}

const root = projectRoot();
const rawUrl = (process.env.DATABASE_URL ?? "").trim();
const explicitPreview = /^(pglite|file):/i.test(rawUrl);
const realUrl = rawUrl && !explicitPreview ? rawUrl : null;

/** `pglite:./dir`, `pglite:///abs/dir`, `file:./dir` choose the data directory. */
function dataDirFromUrl(url) {
  const rest = url.replace(/^(pglite|file):(\/\/)?/i, "");
  if (!rest) return null;
  return isAbsolute(rest) ? rest : resolve(root, rest);
}

const home = process.env.NEBUTRA_PREVIEW_DB_DIR
  ? resolve(root, process.env.NEBUTRA_PREVIEW_DB_DIR)
  : join(root, ".nebutra", "pglite");
const dataDir = (explicitPreview && dataDirFromUrl(rawUrl)) || join(home, "data");
const stateDir = explicitPreview && dataDirFromUrl(rawUrl) ? `${dataDir}.state` : home;
const port = Number(flag("port") ?? process.env.NEBUTRA_PREVIEW_DB_PORT ?? DEFAULT_PORT);
const appRole = process.env.APP_DB_ROLE || "app_user";
if (!/^[a-z_][a-z0-9_]*$/.test(appRole)) {
  warn(`APP_DB_ROLE=${JSON.stringify(appRole)} is not a bare SQL identifier`);
  process.exit(2);
}

/** What every client uses. PGlite serves one database; the name is not checked. */
export const previewUrl = (p = port) =>
  `postgresql://postgres:postgres@127.0.0.1:${p}/postgres?sslmode=disable`;

const ADMIN = {
  email: process.env.NEBUTRA_PREVIEW_ADMIN_EMAIL || "admin@example.com",
  password: process.env.NEBUTRA_PREVIEW_ADMIN_PASSWORD || "preview-demo",
};

// ── helpers ─────────────────────────────────────────────────────────────────

function portOpen(p) {
  return new Promise((done) => {
    const socket = connect({ port: p, host: "127.0.0.1" });
    socket.once("connect", () => {
      socket.destroy();
      done(true);
    });
    socket.once("error", () => done(false));
  });
}

function pidAlive(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

/** Everything `db.mjs deploy` applies. When it changes, the database is re-deployed. */
function schemaStamp() {
  const hash = createHash("sha256");
  const migrations = join(pkg, "prisma/migrations");
  for (const name of readdirSync(migrations, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .sort()) {
    hash.update(name);
    hash.update(readFileSync(join(migrations, name, "migration.sql")));
  }
  hash.update(readFileSync(join(pkg, "prisma/platform.sql")));
  hash.update(readFileSync(join(pkg, "prisma/generated/rls.sql")));
  hash.update(appRole);
  return hash.digest("hex");
}

/** Better Auth's own password format (@better-auth/utils/password, node build). */
function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  return new Promise((done, fail) =>
    scrypt(
      password.normalize("NFKC"),
      salt,
      64,
      { N: 16384, r: 16, p: 1, maxmem: 128 * 16384 * 16 * 2 },
      (error, key) => (error ? fail(error) : done(`${salt}:${key.toString("hex")}`)),
    ),
  );
}

/**
 * One organization (also the tenant), one owner who can sign in with a
 * password through Better Auth. Idempotent; runs in one transaction.
 * `query(sql, params)` is PGlite's or pg's — both take $n parameters.
 */
async function seed(query) {
  const { rows } = await query(
    "select count(*)::int as n from public.auth_users where email = $1",
    [ADMIN.email],
  );
  if (rows[0].n > 0) return false;
  const password = await hashPassword(ADMIN.password);
  const user = "preview_admin";
  const org = "preview_org";
  await query("BEGIN");
  try {
    const statements = [
      [
        `insert into public.auth_users (id, email, email_verified, name, created_at, updated_at)
         values ($1, $2, true, 'Preview Admin', now(), now()) on conflict do nothing`,
        [user, ADMIN.email],
      ],
      [
        `insert into public.auth_accounts (id, user_id, account_id, provider_id, password, created_at, updated_at)
         values ($1, $2, $2, 'credential', $3, now(), now()) on conflict do nothing`,
        [`${user}_credential`, user, password],
      ],
      [
        `insert into public.users (id, email, name, created_at, updated_at)
         values ($1, $2, 'Preview Admin', now(), now()) on conflict do nothing`,
        [user, ADMIN.email],
      ],
      [
        `insert into public.organizations (id, clerk_id, name, slug, created_at, updated_at)
         values ($1, $1, 'Preview Workspace', 'preview', now(), now()) on conflict do nothing`,
        [org],
      ],
      [
        `insert into public.tenants (id, kind, lifecycle_state, organization_id, created_at)
         values ($1, 'ORGANIZATION', 'organization_owned', $1, now()) on conflict do nothing`,
        [org],
      ],
      [
        `insert into public.organization_members (id, organization_id, user_id, role, created_at)
         values ($1, $2, $3, 'OWNER', now()) on conflict do nothing`,
        [`${org}_${user}`, org, user],
      ],
      [
        `insert into better_auth.organization (id, name, slug, created_at)
         values ($1, 'Preview Workspace', 'preview', now()) on conflict do nothing`,
        [org],
      ],
      [
        `insert into better_auth.member (id, user_id, organization_id, role, created_at)
         values ($1, $2, $3, 'owner', now()) on conflict do nothing`,
        [`${org}_${user}`, user, org],
      ],
    ];
    for (const [sql, params] of statements) await query(sql, params);
    await query("COMMIT");
  } catch (error) {
    await query("ROLLBACK").catch(() => undefined);
    throw error;
  }
  return true;
}

function printCredentials() {
  say(`demo sign-in: ${ADMIN.email} / ${ADMIN.password}  (organization "Preview Workspace")`);
}

// ── serve ───────────────────────────────────────────────────────────────────

async function openEngine() {
  const [{ PGlite }, { vector }, { uuid_ossp }, { createWireServer }] = await Promise.all([
    import("@electric-sql/pglite"),
    import("@electric-sql/pglite/vector"),
    import("@electric-sql/pglite/contrib/uuid_ossp"),
    import("./preview/wire.mjs"),
  ]);
  mkdirSync(dataDir, { recursive: true });
  const db = await PGlite.create({ dataDir, extensions: { vector, uuid_ossp } });
  return { db, createWireServer };
}

/**
 * Bring the engine to the schema with the deploy command itself, over a
 * private port nobody else knows yet. Skipped when nothing it applies changed.
 */
async function bootstrap(db, wire) {
  // Provisioning, not deployment (scripts/provision-fresh-database.sh does this
  // for a real database): the runtime role platform.sql grants to and
  // getTenantDb switches into. PGlite has no logins, so NOLOGIN is exact.
  await db.exec(
    `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = '${appRole}') THEN CREATE ROLE ${appRole} NOLOGIN; END IF; END $$;`,
  );

  const stampFile = join(stateDir, "deployed.sha256");
  const stamp = schemaStamp();
  if (existsSync(stampFile) && readFileSync(stampFile, "utf8").trim() === stamp) return false;

  const privatePort = await wire.listen(0);
  const url = previewUrl(privatePort);
  say("building the database: prisma migrate deploy, platform.sql, rls.sql (db:deploy)");
  // Asynchronously: db.mjs connects back to the wire server in THIS process.
  const code = await new Promise((done) => {
    const child = spawn(process.execPath, [join(pkg, "scripts/db.mjs"), "deploy"], {
      cwd: pkg,
      stdio: ["ignore", "pipe", "inherit"],
      env: { ...process.env, DATABASE_URL: url, DIRECT_URL: url, APP_DB_ROLE: appRole },
    });
    let pending = "";
    child.stdout.on("data", (chunk) => {
      const lines = (pending + chunk).split("\n");
      pending = lines.pop() ?? "";
      for (const line of lines) if (line) say(`  ${line}`);
    });
    child.on("exit", (exit) => {
      if (pending) say(`  ${pending}`);
      done(exit ?? 1);
    });
  });
  if (code !== 0) throw new Error(`db:deploy failed against the preview database (exit ${code})`);
  mkdirSync(stateDir, { recursive: true });
  writeFileSync(stampFile, `${stamp}\n`);
  return true;
}

async function serve() {
  if (realUrl) {
    warn("DATABASE_URL points at a real database; the preview database is not needed.");
    process.exit(2);
  }
  const lockFile = join(stateDir, "server.json");
  if (existsSync(lockFile)) {
    const held = JSON.parse(readFileSync(lockFile, "utf8"));
    if (held.pid !== process.pid && pidAlive(held.pid)) {
      if (held.port === port && (await portOpen(port))) {
        say(`already running (pid ${held.pid}) at ${previewUrl()}`);
        if (flag("run")) process.exit(await runChild(String(flag("run"))));
        return;
      }
      warn(`${dataDir} is in use by pid ${held.pid} on port ${held.port}`);
      process.exit(1);
    }
  }
  if (await portOpen(port)) {
    warn(`port ${port} is taken by another program; set NEBUTRA_PREVIEW_DB_PORT`);
    process.exit(1);
  }

  const started = Date.now();
  mkdirSync(stateDir, { recursive: true });
  writeFileSync(lockFile, JSON.stringify({ pid: process.pid, port }));
  const { db, createWireServer } = await openEngine();
  let idleTimer;
  const idleExit = flag("idle-exit") ? Number(flag("idle-exit")) : 0;
  const wire = createWireServer(db, {
    onConnectionCountChange(n) {
      if (!idleExit) return;
      clearTimeout(idleTimer);
      if (n === 0) idleTimer = setTimeout(() => shutdown(0), idleExit);
    },
  });

  let stopping = false;
  async function shutdown(code) {
    if (stopping) return;
    stopping = true;
    await wire.close().catch(() => undefined);
    await db.close().catch(() => undefined);
    rmSync(lockFile, { force: true });
    process.exit(code);
  }
  process.on("SIGINT", () => shutdown(0));
  process.on("SIGTERM", () => shutdown(0));

  try {
    const deployed = await bootstrap(db, wire);
    let seeded = false;
    if (!flag("no-seed")) seeded = await seed((sql, params) => db.query(sql, params));
    await wire.listen(port);
    const ms = Date.now() - started;
    say(
      `ready in ${ms} ms${deployed ? " (built from migrations)" : ""}${seeded ? ", demo data seeded" : ""}`,
    );
    say(`DATABASE_URL=${previewUrl()}`);
    say(`data: ${dataDir}`);
    // What PGlite is not, said once, where the developer reads it.
    say(
      "limits: one Postgres session shared by all connections (transactions take turns); " +
        "statement/lock timeouts accepted but not enforced; no login roles — every connection " +
        `is the owner, getTenantDb switches to ${appRole} for RLS; no query cancel. Local preview only.`,
    );
    printCredentials();
    if (idleExit) idleTimer = setTimeout(() => shutdown(0), idleExit);
  } catch (error) {
    warn(error.message);
    await shutdown(1);
    return;
  }

  if (flag("run")) await shutdown(await runChild(String(flag("run"))));
}

/** Run a command with the preview database in its environment; resolve its exit code. */
function runChild(cmd) {
  return new Promise((done) => {
    const child = spawn(cmd, {
      shell: true,
      stdio: "inherit",
      env: {
        ...process.env,
        DATABASE_URL: previewUrl(),
        DIRECT_URL: previewUrl(),
        APP_DB_ROLE: appRole,
      },
    });
    const forward = (signal) => child.kill(signal);
    process.on("SIGINT", forward);
    process.on("SIGTERM", forward);
    child.on("exit", (code, signal) => done(code ?? (signal ? 1 : 0)));
  });
}

// ── other commands ──────────────────────────────────────────────────────────

async function seedCommand() {
  if (realUrl) {
    // A real database gets the package's own Prisma seed — never a demo admin
    // with a published password.
    execFileSync("pnpm", ["--filter", "@nebutra/db", "db:seed"], { stdio: "inherit", cwd: root });
    return;
  }
  if (await portOpen(port)) {
    const pg = (await import("pg")).default;
    const client = new pg.Client({ connectionString: previewUrl() });
    await client.connect();
    try {
      const added = await seed((sql, params) => client.query(sql, params));
      say(added ? "demo data seeded" : "demo data already present");
    } finally {
      await client.end();
    }
  } else {
    const { db, createWireServer } = await openEngine();
    const wire = createWireServer(db);
    try {
      await bootstrap(db, wire);
      const added = await seed((sql, params) => db.query(sql, params));
      say(added ? "demo data seeded" : "demo data already present");
    } finally {
      await wire.close();
      await db.close();
    }
  }
  printCredentials();
}

async function reset() {
  const lockFile = join(stateDir, "server.json");
  if (existsSync(lockFile)) {
    const held = JSON.parse(readFileSync(lockFile, "utf8"));
    if (pidAlive(held.pid)) {
      warn(`the preview database is running (pid ${held.pid}); stop it first`);
      process.exit(1);
    }
  }
  rmSync(dataDir, { recursive: true, force: true });
  rmSync(join(stateDir, "deployed.sha256"), { force: true });
  say(`removed ${dataDir}`);
}

switch (command) {
  case "serve":
    await serve();
    break;
  case "seed":
    await seedCommand();
    break;
  case "reset":
    await reset();
    break;
  case "env":
    process.stdout.write(
      `DATABASE_URL=${previewUrl()}\nDIRECT_URL=${previewUrl()}\nAPP_DB_ROLE=${appRole}\n`,
    );
    break;
  default:
    warn(
      "usage: preview-db.mjs [serve|seed|reset|env] [--run <cmd>] [--port <n>] [--idle-exit <ms>] [--no-seed]",
    );
    process.exit(2);
}
