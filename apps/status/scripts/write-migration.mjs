#!/usr/bin/env node
/**
 * Write the next migration from the schema diff, with no Postgres to install.
 *
 * Prisma diffs the existing migrations against the schema by replaying them on
 * a shadow database. That database is PGlite here, served over a local socket
 * for the length of this script, so `db:migration <name>` works on any laptop
 * and in CI. The SQL is written to prisma/migrations/<timestamp>_<name>/ for
 * review; `prisma migrate deploy` applies it.
 *
 *   pnpm --filter @nebutra/status-app db:migration add_subscribers
 */
import { execFile } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, writeFileSync } from "node:fs";
import { createServer } from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { PGlite } from "@electric-sql/pglite";
import { PGLiteSocketServer } from "@electric-sql/pglite-socket";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const name = (process.argv[2] ?? "").replace(/[^a-z0-9_]/gi, "_").toLowerCase();
if (!name) {
  console.error("usage: write-migration.mjs <name>");
  process.exit(2);
}

const migrationsDir = path.join(root, "prisma", "migrations");
const hasMigrations =
  existsSync(migrationsDir) && readdirSync(migrationsDir).some((d) => /^\d{14}_/.test(d));

function freePort() {
  return new Promise((resolve, reject) => {
    const server = createServer();
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const { port } = server.address();
      server.close(() => resolve(port));
    });
  });
}

const db = new PGlite();
const port = await freePort();
const socket = new PGLiteSocketServer({ db, port, host: "127.0.0.1" });
await socket.start();

try {
  const from = hasMigrations ? ["--from-migrations", migrationsDir] : ["--from-empty"];
  // Asynchronous on purpose: the PGlite socket server lives in this process,
  // and a synchronous child would block the event loop it answers on.
  const { stdout: sql } = await promisify(execFile)(
    "npx",
    ["prisma", "migrate", "diff", ...from, "--to-schema", "prisma/schema.prisma", "--script"],
    {
      cwd: root,
      encoding: "utf8",
      env: {
        ...process.env,
        STATUS_DATABASE_URL: `postgresql://postgres:postgres@127.0.0.1:${port}/template1?sslmode=disable`,
        STATUS_SHADOW_DATABASE_URL: `postgresql://postgres:postgres@127.0.0.1:${port}/template1?sslmode=disable`,
      },
    },
  );
  if (!/\b(CREATE|ALTER|DROP)\b/.test(sql)) {
    process.stdout.write("Schema and migrations already agree; nothing written.\n");
  } else {
    const stamp = new Date().toISOString().replace(/\D/g, "").slice(0, 14);
    const dir = path.join(migrationsDir, `${stamp}_${name}`);
    mkdirSync(dir, { recursive: true });
    writeFileSync(path.join(dir, "migration.sql"), sql);
    if (!existsSync(path.join(migrationsDir, "migration_lock.toml"))) {
      writeFileSync(path.join(migrationsDir, "migration_lock.toml"), 'provider = "postgresql"\n');
    }
    process.stdout.write(
      `Wrote ${path.relative(root, dir)}/migration.sql — review it before committing.\n`,
    );
  }
} finally {
  await socket.stop();
  await db.close();
}
