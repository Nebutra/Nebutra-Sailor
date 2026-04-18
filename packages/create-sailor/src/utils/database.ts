import fs from "node:fs";
import path from "node:path";

/**
 * Database selection applier for create-sailor.
 *
 * Maps the `--db` CLI flag to concrete filesystem mutations:
 *  - `postgres` → keep Prisma schema as-is, set Postgres DATABASE_URL
 *  - `mysql`    → rewrite `provider = "mysql"`, set MySQL DATABASE_URL
 *  - `sqlite`   → rewrite `provider = "sqlite"`, drop `directUrl`, use file URL
 *  - `none`     → delete the entire `packages/db` directory
 */

export type DatabaseChoice = "postgresql" | "mysql" | "sqlite" | "none";

function safeRm(target: string): void {
  if (fs.existsSync(target)) {
    fs.rmSync(target, { recursive: true, force: true });
  }
}

function setProvider(schema: string, provider: "mysql" | "sqlite"): string {
  return schema.replace(/provider\s*=\s*"postgresql"/, `provider = "${provider}"`);
}

function stripDirectUrl(schema: string): string {
  // Remove the `directUrl = env("...")` line entirely.
  return schema.replace(/^\s*directUrl\s*=\s*env\([^)]*\)\s*\n/gm, "");
}

function stripExtensionsAndFeatures(schema: string): string {
  // postgres-only options that break mysql/sqlite: `extensions = [...]` on
  // datasource and `postgresqlExtensions` in generator previewFeatures.
  let next = schema.replace(/^\s*extensions\s*=\s*\[[^\]]*\]\s*\n/gm, "");
  next = next.replace(/previewFeatures\s*=\s*\[\s*"postgresqlExtensions"\s*\]\s*\n/g, "");
  return next;
}

function appendEnv(targetDir: string, content: string): void {
  const envExamplePath = path.join(targetDir, ".env.example");
  if (fs.existsSync(envExamplePath)) {
    fs.appendFileSync(envExamplePath, "\n" + content);
  } else {
    fs.writeFileSync(envExamplePath, content);
  }
}

export async function applyDatabaseSelection(
  targetDir: string,
  db: DatabaseChoice,
  projectName: string,
): Promise<void> {
  const dbPkgDir = path.join(targetDir, "packages", "db");

  if (db === "none") {
    safeRm(dbPkgDir);
    return;
  }

  const schemaPath = path.join(dbPkgDir, "prisma", "schema.prisma");

  // Build a reasonable default DATABASE_URL per provider.
  let databaseUrl: string;
  if (db === "postgresql") {
    databaseUrl = `postgresql://postgres:postgres@localhost:5432/${projectName}`;
  } else if (db === "mysql") {
    databaseUrl = `mysql://root:root@localhost:3306/${projectName}`;
  } else {
    databaseUrl = "file:./dev.db";
  }

  appendEnv(targetDir, `# Database (${db})\nDATABASE_URL="${databaseUrl}"\n`);

  if (!fs.existsSync(schemaPath)) return;

  const original = fs.readFileSync(schemaPath, "utf8");
  let next = original;

  if (db === "mysql") {
    next = setProvider(next, "mysql");
    next = stripExtensionsAndFeatures(next);
  } else if (db === "sqlite") {
    next = setProvider(next, "sqlite");
    next = stripDirectUrl(next);
    next = stripExtensionsAndFeatures(next);
  }

  if (next !== original) {
    fs.writeFileSync(schemaPath, next);
  }
}
