/**
 * Migration test: 2026-05-12 — extend auth.invitation with token + acceptedAt
 * + declinedAt + createdAt (ADR-12 Phase 1, strictly additive).
 *
 * Test contract:
 *   1. Phase 1 additive columns exist on `auth.invitation`:
 *      - `token`         TEXT, nullable (UNIQUE NOT NULL is Phase 3, NOT here)
 *      - `accepted_at`   TIMESTAMP, nullable
 *      - `declined_at`   TIMESTAMP, nullable
 *      - `created_at`    TIMESTAMP, NOT NULL, DEFAULT now()
 *   2. `expires_at` remains nullable (Phase 1 keeps it nullable — Phase 3 will
 *      tighten to NOT NULL).
 *   3. Pre-existing columns (`id`, `email`, `inviter_id`, `organization_id`,
 *      `role`, `status`) are unchanged in name + nullability.
 *   4. `created_at` is populated by the column DEFAULT when INSERT omits it
 *      (regression guard: confirms the migration applies a DEFAULT NOW()).
 *
 * Test infrastructure mirrors the Phase 1.1 migration test
 * (2026-05-10-add-ba-orgs-passkeys.test.ts): pglite + raw SQL replay. We
 * pre-seed the existing `auth` schema state (organization + invitation in their
 * pre-Phase-1 shape) so the new migration runs against a realistic baseline.
 */

import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { PGlite } from "@electric-sql/pglite";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function resolveMigrationSql(): string {
  const migrationsRoot = resolve(__dirname, "../../prisma/migrations");
  const fs = require("node:fs") as typeof import("node:fs");
  const entries = fs.readdirSync(migrationsRoot, { withFileTypes: true });
  const match = entries.find(
    (entry) => entry.isDirectory() && entry.name.endsWith("_extend_ba_invitation"),
  );
  if (!match) {
    throw new Error(
      `Migration directory ending in "_extend_ba_invitation" not found in ${migrationsRoot}. ` +
        `Run \`pnpm --filter @nebutra/db exec prisma migrate dev --create-only --name extend_ba_invitation\` first.`,
    );
  }
  return readFileSync(join(migrationsRoot, match.name, "migration.sql"), "utf8");
}

/**
 * Seed the `auth.invitation` table in its PRE-Phase-1 shape so the migration
 * has a realistic target. Mirrors the schema produced by the 2026-05-10
 * `add_ba_orgs_passkeys` migration for the invitation table only — we don't
 * need the full surrounding schema for these assertions.
 */
async function seedPreMigrationAuthSchema(db: PGlite): Promise<void> {
  await db.exec(`
    CREATE SCHEMA IF NOT EXISTS "auth";

    CREATE TABLE "auth"."organization" (
      "id"         TEXT PRIMARY KEY,
      "name"       TEXT NOT NULL,
      "slug"       TEXT NOT NULL UNIQUE,
      "logo"       TEXT,
      "metadata"   TEXT,
      "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE "auth"."invitation" (
      "id"              TEXT PRIMARY KEY,
      "email"           TEXT NOT NULL,
      "inviter_id"      TEXT NOT NULL,
      "organization_id" TEXT NOT NULL,
      "role"            TEXT,
      "status"          TEXT NOT NULL DEFAULT 'pending',
      "expires_at"      TIMESTAMP(3),
      CONSTRAINT "invitation_organization_id_fkey"
        FOREIGN KEY ("organization_id") REFERENCES "auth"."organization"("id") ON DELETE CASCADE
    );

    CREATE INDEX "invitation_email_idx" ON "auth"."invitation"("email");
  `);
}

interface ColumnInfo {
  column_name: string;
  data_type: string;
  is_nullable: string;
  column_default: string | null;
}

async function getColumns(db: PGlite, schema: string, table: string): Promise<ColumnInfo[]> {
  const result = await db.query<ColumnInfo>(
    `
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_schema = $1 AND table_name = $2
      ORDER BY ordinal_position
    `,
    [schema, table],
  );
  return result.rows;
}

describe("migration: 2026-05-12 — extend auth.invitation (additive, ADR-12 phase 1)", () => {
  let db: PGlite;
  let migrationSql: string;

  beforeEach(async () => {
    db = new PGlite();
    await seedPreMigrationAuthSchema(db);
    migrationSql = resolveMigrationSql();
    await db.exec(migrationSql);
  });

  afterEach(async () => {
    await db.close();
  });

  describe("new columns", () => {
    it("adds `token` column (TEXT, nullable — UNIQUE NOT NULL deferred to phase 3)", async () => {
      const columns = await getColumns(db, "auth", "invitation");
      const token = columns.find((c) => c.column_name === "token");
      expect(token).toBeDefined();
      expect(token?.data_type).toMatch(/text/i);
      expect(token?.is_nullable).toBe("YES");
    });

    it("adds `accepted_at` column (timestamp, nullable)", async () => {
      const columns = await getColumns(db, "auth", "invitation");
      const acceptedAt = columns.find((c) => c.column_name === "accepted_at");
      expect(acceptedAt).toBeDefined();
      expect(acceptedAt?.data_type).toMatch(/timestamp/i);
      expect(acceptedAt?.is_nullable).toBe("YES");
    });

    it("adds `declined_at` column (timestamp, nullable)", async () => {
      const columns = await getColumns(db, "auth", "invitation");
      const declinedAt = columns.find((c) => c.column_name === "declined_at");
      expect(declinedAt).toBeDefined();
      expect(declinedAt?.data_type).toMatch(/timestamp/i);
      expect(declinedAt?.is_nullable).toBe("YES");
    });

    it("adds `created_at` column (timestamp, NOT NULL, with DEFAULT)", async () => {
      const columns = await getColumns(db, "auth", "invitation");
      const createdAt = columns.find((c) => c.column_name === "created_at");
      expect(createdAt).toBeDefined();
      expect(createdAt?.data_type).toMatch(/timestamp/i);
      expect(createdAt?.is_nullable).toBe("NO");
      // Must have a DEFAULT so adding the column to a non-empty table is safe.
      expect(createdAt?.column_default).not.toBeNull();
      expect(createdAt?.column_default).toMatch(/now|current_timestamp/i);
    });
  });

  describe("created_at DEFAULT populates on INSERT", () => {
    it("INSERT without created_at yields a non-null timestamp close to now()", async () => {
      await db.exec(`
        INSERT INTO "auth"."organization" ("id", "name", "slug")
        VALUES ('org_1', 'Acme', 'acme');
      `);
      await db.exec(`
        INSERT INTO "auth"."invitation" ("id", "email", "inviter_id", "organization_id", "status")
        VALUES ('inv_1', 'a@b.com', 'usr_1', 'org_1', 'pending');
      `);

      // Read created_at as an ISO string in UTC so the test is not affected by
      // the test machine's local timezone (pglite returns naive timestamps).
      const result = await db.query<{ created_at_iso: string }>(
        `SELECT to_char(created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') AS created_at_iso
         FROM "auth"."invitation" WHERE id = 'inv_1'`,
      );
      expect(result.rows).toHaveLength(1);
      expect(result.rows[0].created_at_iso).not.toBeNull();
      const createdAtMs = new Date(result.rows[0].created_at_iso).getTime();
      const nowMs = Date.now();
      // Allow ±60s skew between pglite's NOW() and the test machine clock.
      expect(Math.abs(nowMs - createdAtMs)).toBeLessThan(60_000);
    });
  });

  describe("regression — pre-existing shape is preserved", () => {
    it("expires_at remains nullable (NOT NULL tightening is phase 3)", async () => {
      const columns = await getColumns(db, "auth", "invitation");
      const expiresAt = columns.find((c) => c.column_name === "expires_at");
      expect(expiresAt).toBeDefined();
      expect(expiresAt?.is_nullable).toBe("YES");
    });

    it("original columns are intact in name + nullability", async () => {
      const columns = await getColumns(db, "auth", "invitation");
      const byName = new Map(columns.map((c) => [c.column_name, c]));

      // Identity + required fields — unchanged.
      expect(byName.get("id")?.is_nullable).toBe("NO");
      expect(byName.get("email")?.is_nullable).toBe("NO");
      expect(byName.get("inviter_id")?.is_nullable).toBe("NO");
      expect(byName.get("organization_id")?.is_nullable).toBe("NO");

      // role is BA-plugin nullable — must not be tightened in phase 1.
      expect(byName.get("role")?.is_nullable).toBe("YES");

      // status keeps its NOT NULL + default 'pending'.
      expect(byName.get("status")?.is_nullable).toBe("NO");
      expect(byName.get("status")?.column_default).toMatch(/pending/i);
    });

    it("no UNIQUE constraint on token (deferred to phase 3)", async () => {
      // ADR-12 explicitly defers the UNIQUE constraint to phase 3 so the
      // dual-write period can populate the column without uniqueness conflicts.
      const result = await db.query<{ indexdef: string }>(
        `SELECT indexdef FROM pg_indexes WHERE schemaname = 'auth' AND tablename = 'invitation'`,
      );
      const hasUniqueToken = result.rows.some(
        (r) => r.indexdef.includes("UNIQUE") && r.indexdef.includes("token"),
      );
      expect(hasUniqueToken).toBe(false);
    });
  });
});
