/**
 * Migration test: 2026-05-17 — add provider-agnostic cold-start access gate.
 *
 * Contract:
 *   1. Store invite codes as hashed secrets only (`code_hash` + `code_prefix`);
 *      no plaintext `code` column may exist.
 *   2. Support platform-level and tenant-scoped invites via `scope` + optional
 *      `tenant_id` without foreign-keying to a specific auth provider table.
 *   3. Redemption provenance is durable and cascades with its invite code.
 *   4. Indexes cover issuer quota checks, tenant admin views, prefix lookup,
 *      user redemption history, and code hash uniqueness.
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
    (entry) => entry.isDirectory() && entry.name.endsWith("_add_access_invite_gate"),
  );
  if (!match) {
    throw new Error(
      `Migration directory ending in "_add_access_invite_gate" not found in ${migrationsRoot}.`,
    );
  }
  return readFileSync(join(migrationsRoot, match.name, "migration.sql"), "utf8");
}

interface ColumnInfo {
  column_name: string;
  data_type: string;
  is_nullable: string;
}

async function getColumns(db: PGlite, table: string): Promise<ColumnInfo[]> {
  const result = await db.query<ColumnInfo>(
    `
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = $1
      ORDER BY ordinal_position
    `,
    [table],
  );
  return result.rows;
}

async function getIndexes(db: PGlite, table: string): Promise<string[]> {
  const result = await db.query<{ indexdef: string }>(
    `SELECT indexdef FROM pg_indexes WHERE schemaname = 'public' AND tablename = $1`,
    [table],
  );
  return result.rows.map((row) => row.indexdef);
}

describe("migration: 2026-05-17 — add access invite gate", () => {
  let db: PGlite;

  beforeEach(async () => {
    db = new PGlite();
    await db.exec(resolveMigrationSql());
  });

  afterEach(async () => {
    await db.close();
  });

  it("creates hashed access invite codes with no plaintext code column", async () => {
    const columns = await getColumns(db, "access_invite_codes");
    const names = columns.map((column) => column.column_name);

    expect(names).toEqual(
      expect.arrayContaining([
        "id",
        "code_hash",
        "code_prefix",
        "scope",
        "tenant_id",
        "issued_by_user_id",
        "status",
        "max_redemptions",
        "redemption_count",
        "expires_at",
        "revoked_at",
        "metadata",
        "created_at",
        "updated_at",
      ]),
    );
    expect(names).not.toContain("code");
    expect(columns.find((column) => column.column_name === "code_hash")?.is_nullable).toBe("NO");
    expect(columns.find((column) => column.column_name === "scope")?.is_nullable).toBe("NO");
    expect(columns.find((column) => column.column_name === "tenant_id")?.is_nullable).toBe("YES");
  });

  it("creates redemption provenance table with cascading invite-code FK", async () => {
    const columns = await getColumns(db, "access_invite_redemptions");
    const names = columns.map((column) => column.column_name);

    expect(names).toEqual(
      expect.arrayContaining([
        "id",
        "invite_code_id",
        "user_id",
        "tenant_id",
        "email",
        "ip_address",
        "redeemed_at",
        "metadata",
      ]),
    );

    const fk = await db.query<{ delete_rule: string }>(
      `
        SELECT rc.delete_rule
        FROM information_schema.referential_constraints rc
        JOIN information_schema.table_constraints tc
          ON tc.constraint_name = rc.constraint_name
         AND tc.constraint_schema = rc.constraint_schema
        WHERE tc.table_schema = 'public'
          AND tc.table_name = 'access_invite_redemptions'
      `,
    );
    expect(fk.rows.some((row) => row.delete_rule === "CASCADE")).toBe(true);
  });

  it("adds indexes for quota checks, admin views, lookup, and one-use redemption", async () => {
    const inviteIndexes = await getIndexes(db, "access_invite_codes");
    const redemptionIndexes = await getIndexes(db, "access_invite_redemptions");

    expect(
      inviteIndexes.some((index) => index.includes("UNIQUE") && index.includes("code_hash")),
    ).toBe(true);
    expect(
      inviteIndexes.some(
        (index) =>
          index.includes("issued_by_user_id") &&
          index.includes("status") &&
          index.includes("created_at"),
      ),
    ).toBe(true);
    expect(
      inviteIndexes.some((index) => index.includes("tenant_id") && index.includes("status")),
    ).toBe(true);
    expect(inviteIndexes.some((index) => index.includes("code_prefix"))).toBe(true);
    expect(
      redemptionIndexes.some(
        (index) => index.includes("UNIQUE") && index.includes("invite_code_id"),
      ),
    ).toBe(true);
    expect(
      redemptionIndexes.some((index) => index.includes("user_id") && index.includes("redeemed_at")),
    ).toBe(true);
  });
});
