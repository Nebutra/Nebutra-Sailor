import fs from "node:fs";
import path from "node:path";
import { type DatabaseHostMeta, getDatabaseHost } from "./database-host-meta";

/**
 * Database selection applier for create-sailor.
 *
 * Two orthogonal axes:
 *
 *   --db          ENGINE choice  (postgresql | mysql | sqlite | none)
 *   --db-host     HOST choice    (supabase | neon | vercel-postgres | planetscale
 *                                | railway | aliyun-rds | tencent-cdb | local | none)
 *
 * `applyDatabaseSelection` handles the engine (Prisma `provider`,
 * provider-specific schema cleanup like dropping `extensions`/`directUrl`).
 *
 * `applyDatabaseHostSelection` handles the host (multi-env-var blocks,
 * datasource extras like PlanetScale's relationMode, keeping directUrl when
 * the host uses pooler+direct split like Neon/Supabase).
 *
 * The two are applied in sequence: engine first, then host. A host with a
 * `forcedEngine` (e.g. PlanetScale = mysql) is the source of truth — the CLI
 * normalises `--db` to that engine before calling applyDatabaseSelection.
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
  // Categorized monorepo: packages/platform/db (post W3b). Old layout was packages/db.
  const dbPkgDir = path.join(targetDir, "packages", "platform", "db");

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

// ── Host applier ────────────────────────────────────────────────────────────

function envFileContent(targetDir: string): string {
  const p = path.join(targetDir, ".env.example");
  return fs.existsSync(p) ? fs.readFileSync(p, "utf8") : "";
}

function setOrAppendEnvVar(targetDir: string, name: string, value: string, comment?: string): void {
  const envPath = path.join(targetDir, ".env.example");
  const existing = envFileContent(targetDir);
  const line = comment ? `# ${comment}\n${name}="${value}"\n` : `${name}="${value}"\n`;

  // Replace existing assignment if present
  const re = new RegExp(`^\\s*${name}\\s*=.*$`, "m");
  if (re.test(existing)) {
    fs.writeFileSync(envPath, existing.replace(re, `${name}="${value}"`));
    return;
  }
  if (existing) {
    fs.appendFileSync(envPath, `\n${line}`);
  } else {
    fs.writeFileSync(envPath, line);
  }
}

function injectDatasourceExtras(targetDir: string, extras: string[]): void {
  const schemaPath = path.join(targetDir, "packages", "platform", "db", "prisma", "schema.prisma");
  if (!fs.existsSync(schemaPath)) return;
  const src = fs.readFileSync(schemaPath, "utf8");
  const datasourceRegex = /(datasource\s+db\s*\{[^}]*?)(\n})/;
  const match = src.match(datasourceRegex);
  if (!match) return;

  // Avoid duplicate injection: skip if any of the extras already present.
  const filteredExtras = extras.filter((line) => !src.includes(line.trim()));
  if (filteredExtras.length === 0) return;

  const block = filteredExtras.map((line) => `  ${line}`).join("\n");
  const patched = src.replace(datasourceRegex, `$1\n${block}$2`);
  fs.writeFileSync(schemaPath, patched);
}

function ensureDirectUrlInDatasource(targetDir: string): void {
  const schemaPath = path.join(targetDir, "packages", "platform", "db", "prisma", "schema.prisma");
  if (!fs.existsSync(schemaPath)) return;
  const src = fs.readFileSync(schemaPath, "utf8");
  if (/directUrl\s*=\s*env\(/.test(src)) return; // already present
  const datasourceRegex =
    /(datasource\s+db\s*\{[\s\S]*?url\s*=\s*env\(\s*"DATABASE_URL"\s*\)[^\n]*\n)/;
  if (!datasourceRegex.test(src)) return;
  fs.writeFileSync(schemaPath, src.replace(datasourceRegex, `$1  directUrl = env("DIRECT_URL")\n`));
}

/**
 * Apply database HOST (managed-provider) configuration.
 *
 * Idempotent: replaces existing DATABASE_URL line rather than appending a
 * second copy. Should run AFTER applyDatabaseSelection so the engine is
 * already correct for the host.
 */
export async function applyDatabaseHostSelection(
  targetDir: string,
  host: DatabaseHostMeta,
  projectName: string,
): Promise<void> {
  if (host.id === "none" || host.id === "local") {
    // local default already handled by applyDatabaseSelection; nothing host-specific to do.
    return;
  }

  // Inject env vars, with the project-name placeholder substituted.
  for (const env of host.envVars) {
    const value = env.placeholder.replace(/\$PROJECT/g, projectName);
    setOrAppendEnvVar(targetDir, env.name, value, env.comment);
  }

  // Schema mutations for hosts that need them.
  if (host.prismaDatasourceExtras && host.prismaDatasourceExtras.length > 0) {
    injectDatasourceExtras(targetDir, host.prismaDatasourceExtras);
  }
  if (host.keepDirectUrl) {
    ensureDirectUrlInDatasource(targetDir);
  }
}

export type { DatabaseHostMeta };
export { getDatabaseHost };
