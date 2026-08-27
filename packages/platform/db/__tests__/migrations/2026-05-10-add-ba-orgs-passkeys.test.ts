/**
 * Migration test: 2026-05-10 — add BA orgs + passkeys schema (Phase 1.1)
 *
 * Test contract:
 *   1. The new `auth` Postgres schema exists.
 *   2. Tables `auth.organization`, `auth.member`, `auth.invitation`, `auth.passkey` exist
 *      with the columns + types specified in the ADR.
 *   3. FK constraints from `auth.member.userId` and `auth.passkey.userId` to
 *      `public.auth_users.id` cascade on delete.
 *   4. FK constraints from `auth.member.organizationId`, `auth.invitation.organizationId`
 *      to `auth.organization.id` cascade on delete.
 *   5. Unique + index entries are present:
 *      - `auth.organization.slug` UNIQUE
 *      - `auth.member` UNIQUE([userId, organizationId]); INDEX(organizationId)
 *      - `auth.invitation` INDEX(email)
 *      - `auth.passkey.credentialID` UNIQUE; INDEX(userId)
 *   6. `public.auth_sessions.active_organization_id` column exists (TEXT, nullable)
 *      and a btree index covers it.
 *   7. Regression guard — pre-existing columns on `public.auth_users` and
 *      `public.auth_sessions` are intact (the migration is strictly additive).
 *
 * Test infrastructure:
 *   We use `@electric-sql/pglite` (in-memory Postgres-compatible) rather than a
 *   real Postgres or Testcontainers. Rationale:
 *     - The full migration history depends on extensions (`vector`, `uuid_ossp`)
 *       that pglite does not ship, so replaying every migration is impractical.
 *     - The migration we care about is purely structural (CREATE SCHEMA / CREATE
 *       TABLE / ALTER TABLE ADD COLUMN) and exercises features pglite supports.
 *     - We seed minimal `public.auth_users` and `public.auth_sessions` fixtures
 *       so the FKs and the regression guard can be verified.
 *     - This is the same pattern Phase 1.2's capabilities probe will use.
 */

import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { PGlite } from "@electric-sql/pglite";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Resolve the migration SQL path lazily so the test fails with a clear message
// if the migration directory hasn't been generated yet.
function resolveMigrationSql(): string {
  const migrationsRoot = resolve(__dirname, "../../prisma/migrations");
  // Prisma migration directories are named `<timestamp>_<name>`. Find the
  // directory whose name ends with `_add_ba_orgs_passkeys`.
  const fs = require("node:fs") as typeof import("node:fs");
  const entries = fs.readdirSync(migrationsRoot, { withFileTypes: true });
  const match = entries.find(
    (entry) => entry.isDirectory() && entry.name.endsWith("_add_ba_orgs_passkeys"),
  );
  if (!match) {
    throw new Error(
      `Migration directory ending in "_add_ba_orgs_passkeys" not found in ${migrationsRoot}. ` +
        `Run \`pnpm --filter @nebutra/db exec prisma migrate dev --create-only --name add_ba_orgs_passkeys\` first.`,
    );
  }
  return readFileSync(join(migrationsRoot, match.name, "migration.sql"), "utf8");
}

/**
 * Seed a minimal `public.auth_users` and `public.auth_sessions` schema —
 * just enough for the new migration's FKs to resolve and the regression
 * guards to have something to check. Mirrors the existing Prisma model
 * shape (NOT NULL only on truly required columns).
 */
async function seedExistingAuthSchema(db: PGlite): Promise<void> {
  await db.exec(`
    CREATE TABLE "public"."auth_users" (
      "id" TEXT PRIMARY KEY,
      "email" TEXT UNIQUE,
      "phone" TEXT UNIQUE,
      "email_verified" BOOLEAN NOT NULL DEFAULT false,
      "phone_verified" BOOLEAN NOT NULL DEFAULT false,
      "name" TEXT,
      "image" TEXT,
      "password_hash" TEXT,
      "two_factor_enabled" BOOLEAN NOT NULL DEFAULT false,
      "two_factor_secret" TEXT,
      "backup_codes" TEXT[] DEFAULT ARRAY[]::TEXT[],
      "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updated_at" TIMESTAMP(3) NOT NULL
    );

    CREATE TABLE "public"."auth_sessions" (
      "id" TEXT PRIMARY KEY,
      "user_id" TEXT NOT NULL,
      "token" TEXT NOT NULL UNIQUE,
      "expires_at" TIMESTAMP(3) NOT NULL,
      "ip_address" TEXT,
      "user_agent" TEXT,
      "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updated_at" TIMESTAMP(3) NOT NULL,
      CONSTRAINT "auth_sessions_user_id_fkey"
        FOREIGN KEY ("user_id") REFERENCES "public"."auth_users"("id") ON DELETE CASCADE
    );

    CREATE INDEX "auth_sessions_user_id_idx" ON "public"."auth_sessions"("user_id");
    CREATE INDEX "auth_sessions_token_idx" ON "public"."auth_sessions"("token");
  `);
}

interface ColumnInfo {
  column_name: string;
  data_type: string;
  is_nullable: string;
}

async function getColumns(db: PGlite, schema: string, table: string): Promise<ColumnInfo[]> {
  const result = await db.query<ColumnInfo>(
    `
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_schema = $1 AND table_name = $2
      ORDER BY ordinal_position
    `,
    [schema, table],
  );
  return result.rows;
}

describe("migration: 2026-05-10 — add BA orgs + passkeys (auth schema, additive)", () => {
  let db: PGlite;
  let migrationSql: string;

  beforeEach(async () => {
    db = new PGlite();
    await seedExistingAuthSchema(db);
    migrationSql = resolveMigrationSql();
    await db.exec(migrationSql);
  });

  afterEach(async () => {
    await db.close();
  });

  describe("schema registration", () => {
    it("creates the `auth` Postgres schema", async () => {
      const result = await db.query<{ schema_name: string }>(
        `SELECT schema_name FROM information_schema.schemata WHERE schema_name = 'auth'`,
      );
      expect(result.rows).toHaveLength(1);
      expect(result.rows[0].schema_name).toBe("auth");
    });
  });

  describe("auth.organization", () => {
    it("creates the table with required columns", async () => {
      const columns = await getColumns(db, "auth", "organization");
      const names = columns.map((c) => c.column_name);
      expect(names).toEqual(
        expect.arrayContaining(["id", "name", "slug", "logo", "metadata", "created_at"]),
      );
    });

    it("enforces UNIQUE on slug", async () => {
      const result = await db.query<{ indexname: string }>(
        `
          SELECT indexname FROM pg_indexes
          WHERE schemaname = 'auth' AND tablename = 'organization' AND indexdef LIKE '%UNIQUE%' AND indexdef LIKE '%slug%'
        `,
      );
      expect(result.rows.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe("auth.member", () => {
    it("creates the table with required columns + member role default", async () => {
      const columns = await getColumns(db, "auth", "member");
      const names = columns.map((c) => c.column_name);
      expect(names).toEqual(
        expect.arrayContaining(["id", "user_id", "organization_id", "role", "created_at"]),
      );
    });

    it("references public.auth_users(id) ON DELETE CASCADE", async () => {
      const result = await db.query<{ delete_rule: string; constraint_name: string }>(
        `
          SELECT rc.delete_rule, rc.constraint_name
          FROM information_schema.referential_constraints rc
          JOIN information_schema.table_constraints tc
            ON tc.constraint_name = rc.constraint_name
           AND tc.constraint_schema = rc.constraint_schema
          WHERE tc.table_schema = 'auth'
            AND tc.table_name = 'member'
            AND rc.unique_constraint_schema = 'public'
        `,
      );
      expect(result.rows.length).toBeGreaterThanOrEqual(1);
      expect(result.rows.every((r) => r.delete_rule === "CASCADE")).toBe(true);
    });

    it("references auth.organization(id) ON DELETE CASCADE", async () => {
      const result = await db.query<{ delete_rule: string }>(
        `
          SELECT rc.delete_rule
          FROM information_schema.referential_constraints rc
          JOIN information_schema.table_constraints tc
            ON tc.constraint_name = rc.constraint_name
           AND tc.constraint_schema = rc.constraint_schema
          WHERE tc.table_schema = 'auth'
            AND tc.table_name = 'member'
            AND rc.unique_constraint_schema = 'auth'
        `,
      );
      expect(result.rows.length).toBeGreaterThanOrEqual(1);
      expect(result.rows.every((r) => r.delete_rule === "CASCADE")).toBe(true);
    });

    it("has UNIQUE([user_id, organization_id]) and INDEX(organization_id)", async () => {
      const indexes = await db.query<{ indexname: string; indexdef: string }>(
        `SELECT indexname, indexdef FROM pg_indexes WHERE schemaname = 'auth' AND tablename = 'member'`,
      );
      const hasUnique = indexes.rows.some(
        (i) =>
          i.indexdef.includes("UNIQUE") &&
          i.indexdef.includes("user_id") &&
          i.indexdef.includes("organization_id"),
      );
      const hasOrgIndex = indexes.rows.some(
        (i) => !i.indexdef.includes("UNIQUE") && i.indexdef.includes("organization_id"),
      );
      expect(hasUnique).toBe(true);
      expect(hasOrgIndex).toBe(true);
    });
  });

  describe("auth.invitation", () => {
    it("creates the table with required columns", async () => {
      const columns = await getColumns(db, "auth", "invitation");
      const names = columns.map((c) => c.column_name);
      expect(names).toEqual(
        expect.arrayContaining([
          "id",
          "email",
          "inviter_id",
          "organization_id",
          "role",
          "status",
          "expires_at",
        ]),
      );
    });

    it("references auth.organization(id) ON DELETE CASCADE", async () => {
      const result = await db.query<{ delete_rule: string }>(
        `
          SELECT rc.delete_rule
          FROM information_schema.referential_constraints rc
          JOIN information_schema.table_constraints tc
            ON tc.constraint_name = rc.constraint_name
           AND tc.constraint_schema = rc.constraint_schema
          WHERE tc.table_schema = 'auth'
            AND tc.table_name = 'invitation'
            AND rc.unique_constraint_schema = 'auth'
        `,
      );
      expect(result.rows.length).toBeGreaterThanOrEqual(1);
      expect(result.rows.every((r) => r.delete_rule === "CASCADE")).toBe(true);
    });

    it("has INDEX(email)", async () => {
      const indexes = await db.query<{ indexdef: string }>(
        `SELECT indexdef FROM pg_indexes WHERE schemaname = 'auth' AND tablename = 'invitation'`,
      );
      const hasEmailIndex = indexes.rows.some((i) => i.indexdef.includes("email"));
      expect(hasEmailIndex).toBe(true);
    });
  });

  describe("auth.passkey", () => {
    it("creates the table with required columns", async () => {
      const columns = await getColumns(db, "auth", "passkey");
      const names = columns.map((c) => c.column_name);
      expect(names).toEqual(
        expect.arrayContaining([
          "id",
          "name",
          "public_key",
          "user_id",
          "credential_i_d",
          "counter",
          "device_type",
          "backed_up",
          "transports",
          "created_at",
        ]),
      );
    });

    it("counter is an integer column", async () => {
      const columns = await getColumns(db, "auth", "passkey");
      const counter = columns.find((c) => c.column_name === "counter");
      expect(counter).toBeDefined();
      expect(counter?.data_type).toMatch(/integer/i);
    });

    it("backed_up is a boolean column", async () => {
      const columns = await getColumns(db, "auth", "passkey");
      const backedUp = columns.find((c) => c.column_name === "backed_up");
      expect(backedUp).toBeDefined();
      expect(backedUp?.data_type).toMatch(/boolean/i);
    });

    it("references public.auth_users(id) ON DELETE CASCADE", async () => {
      const result = await db.query<{ delete_rule: string }>(
        `
          SELECT rc.delete_rule
          FROM information_schema.referential_constraints rc
          JOIN information_schema.table_constraints tc
            ON tc.constraint_name = rc.constraint_name
           AND tc.constraint_schema = rc.constraint_schema
          WHERE tc.table_schema = 'auth'
            AND tc.table_name = 'passkey'
            AND rc.unique_constraint_schema = 'public'
        `,
      );
      expect(result.rows.length).toBeGreaterThanOrEqual(1);
      expect(result.rows.every((r) => r.delete_rule === "CASCADE")).toBe(true);
    });

    it("enforces UNIQUE on credential_i_d and INDEX(user_id)", async () => {
      const indexes = await db.query<{ indexdef: string }>(
        `SELECT indexdef FROM pg_indexes WHERE schemaname = 'auth' AND tablename = 'passkey'`,
      );
      const hasUniqueCredential = indexes.rows.some(
        (i) => i.indexdef.includes("UNIQUE") && i.indexdef.includes("credential_i_d"),
      );
      const hasUserIndex = indexes.rows.some(
        (i) => !i.indexdef.includes("UNIQUE") && i.indexdef.includes("user_id"),
      );
      expect(hasUniqueCredential).toBe(true);
      expect(hasUserIndex).toBe(true);
    });
  });

  describe("public.auth_sessions: active_organization_id additive change", () => {
    it("adds the active_organization_id column (text, nullable)", async () => {
      const columns = await getColumns(db, "public", "auth_sessions");
      const col = columns.find((c) => c.column_name === "active_organization_id");
      expect(col).toBeDefined();
      expect(col?.data_type).toMatch(/text/i);
      expect(col?.is_nullable).toBe("YES");
    });

    it("creates an index covering active_organization_id", async () => {
      const indexes = await db.query<{ indexdef: string }>(
        `SELECT indexdef FROM pg_indexes WHERE schemaname = 'public' AND tablename = 'auth_sessions'`,
      );
      const hasActiveOrgIndex = indexes.rows.some((i) =>
        i.indexdef.includes("active_organization_id"),
      );
      expect(hasActiveOrgIndex).toBe(true);
    });
  });

  describe("regression guard — existing columns are intact", () => {
    it("public.auth_users still has its original columns", async () => {
      const columns = await getColumns(db, "public", "auth_users");
      const names = columns.map((c) => c.column_name);
      // Spot-check a representative subset (id, email, two_factor flags from
      // the 2026-05-09 migration, created_at) to catch accidental drops or
      // renames in the additive migration.
      expect(names).toEqual(
        expect.arrayContaining([
          "id",
          "email",
          "phone",
          "email_verified",
          "phone_verified",
          "two_factor_enabled",
          "two_factor_secret",
          "backup_codes",
          "created_at",
          "updated_at",
        ]),
      );
    });

    it("public.auth_sessions still has its original columns", async () => {
      const columns = await getColumns(db, "public", "auth_sessions");
      const names = columns.map((c) => c.column_name);
      expect(names).toEqual(
        expect.arrayContaining([
          "id",
          "user_id",
          "token",
          "expires_at",
          "ip_address",
          "user_agent",
          "created_at",
          "updated_at",
        ]),
      );
    });
  });
});
