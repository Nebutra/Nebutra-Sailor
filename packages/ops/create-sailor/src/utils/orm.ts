import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

/**
 * ORM selection applier.
 *
 * Prisma is the primary, always-on ORM in the scaffold (the auth / billing /
 * audit / oauth packages were built against PrismaClient and would break if it
 * were removed). When the user picks `--orm=drizzle`, we layer in a SECOND
 * package — `packages/platform/db-drizzle` — that exposes a Drizzle client
 * pointing at the same DATABASE_URL. New code can be written against Drizzle;
 * existing Prisma-backed code keeps working.
 *
 * This is "dual-ORM mode", not "Drizzle migration". A real one-way swap to
 * Drizzle would mean rewriting ~60 files across apps + packages + gateway —
 * deferred until enough new code lands on Drizzle to make the swap worth the
 * blast radius.
 *
 * For `--orm=prisma` / `--orm=none`: no-op (Prisma is already in the scaffold).
 */

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export type OrmChoice = "prisma" | "drizzle" | "none";

function resolveDrizzleTemplateDir(): string | null {
  const candidates = [
    // dist/index.js → ../templates/orm/drizzle
    path.join(__dirname, "..", "templates", "orm", "drizzle"),
    // src/utils/orm.ts → ../../templates/orm/drizzle
    path.join(__dirname, "..", "..", "templates", "orm", "drizzle"),
  ];
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return candidate;
  }
  return null;
}

function copyRecursive(src: string, dst: string): void {
  fs.mkdirSync(dst, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, entry.name);
    const d = path.join(dst, entry.name);
    if (entry.isDirectory()) {
      copyRecursive(s, d);
    } else {
      fs.copyFileSync(s, d);
    }
  }
}

/**
 * Add the `db-drizzle` package to the scaffolded monorepo, alongside the
 * primary Prisma `packages/platform/db`. Idempotent — re-running silently
 * overwrites the package contents but never touches Prisma.
 *
 * Requires `--db=postgres` (the templated schema mirrors uses Postgres-only
 * Drizzle types). For mysql/sqlite the applier no-ops and logs a hint into
 * the project's README rather than shipping a broken adapter.
 */
export async function applyOrmSelection(
  targetDir: string,
  orm: OrmChoice,
  db: "postgresql" | "mysql" | "sqlite" | "none",
): Promise<{ applied: boolean; reason?: string }> {
  if (orm !== "drizzle") return { applied: false };
  if (db !== "postgresql") {
    return {
      applied: false,
      reason: `Drizzle template currently targets Postgres only; --db=${db} keeps Prisma as sole ORM`,
    };
  }

  const templateDir = resolveDrizzleTemplateDir();
  if (!templateDir) {
    return {
      applied: false,
      reason: "Drizzle template directory not found in package — bundling error",
    };
  }

  const dstDir = path.join(targetDir, "packages", "platform", "db-drizzle");
  copyRecursive(templateDir, dstDir);

  // pnpm-workspace.yaml already covers packages/platform/* via glob, so no
  // workspace mutation needed. Root package.json scripts already proxy via
  // turbo so the new package's db:* scripts surface automatically.

  return { applied: true };
}
