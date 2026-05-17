import fs from "node:fs";
import path from "node:path";
import type { FlagSelection } from "./prune-schema";

interface ParsedConditional {
  flag: string;
  values: string[];
}

export interface MigrationPruneResult {
  kept: string[];
  removed: string[];
  skipped: string[];
}

const SQL_CONDITIONAL_RE = /^--\s*@conditional\(([A-Za-z][A-Za-z0-9_-]*)=([^)]+)\)\s*$/m;

function parseSqlConditional(source: string): ParsedConditional | null {
  const match = SQL_CONDITIONAL_RE.exec(source);
  if (!match) return null;
  const [, flag, valuesRaw] = match;
  const values = valuesRaw
    .split("|")
    .map((value) => value.trim())
    .filter(Boolean);
  return { flag, values };
}

function stripSqlConditional(source: string): string {
  return source.replace(SQL_CONDITIONAL_RE, "").replace(/^\n/, "");
}

/**
 * Prune feature-gated Prisma migrations after cloning the template.
 *
 * Schema pruning alone is not enough for a template repo: a generated app can
 * still inherit optional tables through checked-in migration directories. This
 * utility lets canonical repo migrations remain durable while generated apps
 * only keep migrations for selected feature flags.
 */
export function pruneMigrationsByFlags(
  migrationsDir: string,
  flags: FlagSelection,
): MigrationPruneResult {
  const result: MigrationPruneResult = { kept: [], removed: [], skipped: [] };
  if (!fs.existsSync(migrationsDir)) return result;

  const entries = fs
    .readdirSync(migrationsDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .sort((a, b) => a.name.localeCompare(b.name));

  for (const entry of entries) {
    const migrationDir = path.join(migrationsDir, entry.name);
    const migrationPath = path.join(migrationDir, "migration.sql");
    if (!fs.existsSync(migrationPath)) {
      result.skipped.push(entry.name);
      continue;
    }

    const source = fs.readFileSync(migrationPath, "utf8");
    const conditional = parseSqlConditional(source);
    if (!conditional) {
      result.skipped.push(entry.name);
      continue;
    }

    const selected = flags[conditional.flag];
    const shouldKeep = selected !== undefined && conditional.values.includes(selected);
    if (shouldKeep) {
      fs.writeFileSync(migrationPath, stripSqlConditional(source));
      result.kept.push(entry.name);
      continue;
    }

    fs.rmSync(migrationDir, { recursive: true, force: true });
    result.removed.push(entry.name);
  }

  return result;
}
