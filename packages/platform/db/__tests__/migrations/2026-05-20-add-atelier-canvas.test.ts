/**
 * Migration test: 2026-05-20 — add tenant-scoped Atelier canvas.
 *
 * Template-project contract:
 *   1. `schema.prisma` owns the model and table mapping.
 *   2. The checked-in migration is fail-loud; Prisma owns replay through
 *      `_prisma_migrations`, so SQL-level IF NOT EXISTS must not mask drift.
 *   3. Tenant RLS policy ships with the migration, not an out-of-band script.
 */

import { readdirSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function resolveMigrationSql(): string {
  const migrationsRoot = resolve(__dirname, "../../prisma/migrations");
  const match = readdirSync(migrationsRoot, { withFileTypes: true }).find(
    (entry) => entry.isDirectory() && entry.name.endsWith("_add_atelier_canvas"),
  );
  if (!match) {
    throw new Error(
      `Migration directory ending in "_add_atelier_canvas" not found in ${migrationsRoot}.`,
    );
  }
  return readFileSync(join(migrationsRoot, match.name, "migration.sql"), "utf8");
}

function readSchema(): string {
  return readFileSync(resolve(__dirname, "../../prisma/schema.prisma"), "utf8");
}

function getModelBlock(schema: string, modelName: string): string {
  const match = schema.match(new RegExp(`model ${modelName} \\{[\\s\\S]*?\\n\\}`));
  if (!match) {
    throw new Error(`Prisma model ${modelName} not found.`);
  }
  return match[0];
}

function withoutSqlComments(sql: string): string {
  return sql
    .split("\n")
    .filter((line) => !line.trimStart().startsWith("--"))
    .join("\n");
}

describe("migration: 2026-05-20 — add Atelier canvas without template drift", () => {
  it("keeps the Prisma model mapped to the migration table shape", () => {
    const model = getModelBlock(readSchema(), "AtelierCanvas");

    expect(model).toContain("id             String");
    expect(model).toContain('tenantId String   @map("tenant_id")');
    expect(model).toContain(
      'scene          Json     @default("{\\"elements\\":[],\\"files\\":[]}")',
    );
    expect(model).toContain("thumbnail      String?");
    expect(model).toContain(
      "tenant Tenant @relation(fields: [tenantId], references: [id], onDelete: Cascade)",
    );
    expect(model).toContain("@@unique([tenantId, id])");
    expect(model).toContain("@@index([tenantId, updatedAt])");
    expect(model).toContain('@@map("atelier_canvas")');
    expect(model).toContain('@@schema("public")');
  });

  it("uses a fail-loud Prisma migration instead of SQL-level drift masks", () => {
    const migration = resolveMigrationSql();
    const executableSql = withoutSqlComments(migration);

    expect(migration).toContain('CREATE TABLE "public"."atelier_canvas"');
    expect(migration).toContain('"tenant_id" TEXT NOT NULL');
    expect(migration).toContain('CREATE UNIQUE INDEX "atelier_canvas_tenant_id_id_key"');
    expect(migration).toContain('CREATE INDEX "atelier_canvas_tenant_id_updated_at_idx"');
    expect(executableSql).not.toMatch(/\bIF\s+NOT\s+EXISTS\b/i);
    expect(executableSql).not.toMatch(/\bDO\s+\$\$/i);
  });

  it("ships tenant RLS policy with the migration", () => {
    const migration = resolveMigrationSql();

    expect(migration).toContain('ALTER TABLE "public"."atelier_canvas" ENABLE ROW LEVEL SECURITY');
    expect(migration).toContain('CREATE POLICY "atelier_canvas_bypass"');
    expect(migration).toContain('CREATE POLICY "atelier_canvas_tenant"');
    expect(migration).toContain('USING ("tenant_id" = current_org_id())');
    expect(migration).toContain('WITH CHECK ("tenant_id" = current_org_id())');
  });
});
