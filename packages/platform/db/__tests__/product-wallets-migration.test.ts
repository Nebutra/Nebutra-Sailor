/**
 * The product-wallets migration re-keys `credit_balances` from one row per
 * tenant to one per (tenant, product). It runs against production data, so the
 * backfill is exercised here on a real Postgres engine: each existing balance
 * goes to the product that last tagged its ledger, and an untagged one to
 * Router (ADR 2026-09-27).
 */
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { PGlite } from "@electric-sql/pglite";
import { uuid_ossp } from "@electric-sql/pglite/contrib/uuid_ossp";
import { vector } from "@electric-sql/pglite/vector";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const migrationsDir = join(dirname(fileURLToPath(import.meta.url)), "..", "prisma", "migrations");
const TARGET = "20260927100000_product_wallets";
const read = (name: string) => readFileSync(join(migrationsDir, name, "migration.sql"), "utf8");
const before = readdirSync(migrationsDir, { withFileTypes: true })
  .filter((d) => d.isDirectory() && d.name < TARGET)
  .map((d) => d.name)
  .sort();

let db: PGlite;

beforeAll(async () => {
  db = new PGlite({ extensions: { vector, uuid_ossp } });
  for (const name of before) await db.exec(read(name));
  await db.exec(`
    INSERT INTO tenants (id, kind) VALUES ('t_k', 'INDIVIDUAL'), ('t_r', 'INDIVIDUAL'), ('t_x', 'INDIVIDUAL');
    INSERT INTO credit_balances (id, tenant_id, balance, updated_at) VALUES
      ('b_k', 't_k', 900, now()), ('b_r', 't_r', 12.5, now()), ('b_x', 't_x', 3, now());
    INSERT INTO credit_transactions (id, credit_balance_id, type, amount, balance_after, metadata, created_at) VALUES
      ('x1', 'b_k', 'USAGE', -100, 900, '{"app":"kuanlan","taskId":"t1"}', now() - interval '1 day'),
      ('x2', 'b_k', 'BONUS', 1000, 1000, '{}', now()),
      ('x3', 'b_r', 'USAGE', -0.5, 12.5, '{"product":"router"}', now());
  `);
  await db.exec(read(TARGET));
});

afterAll(async () => {
  await db?.close();
});

describe("product wallets migration", () => {
  it("gives each existing balance the product that last tagged its ledger", async () => {
    const { rows } = await db.query<{ id: string; product: string; balance: string }>(
      "SELECT id, product, balance::text FROM credit_balances ORDER BY id",
    );
    expect(rows).toEqual([
      { id: "b_k", product: "kuanlan", balance: "900.0000" },
      { id: "b_r", product: "router", balance: "12.5000" },
      { id: "b_x", product: "router", balance: "3.0000" },
    ]);
  });

  it("lets a tenant hold a second balance for another product, but not two for one", async () => {
    await db.exec(
      "INSERT INTO credit_balances (id, tenant_id, product, updated_at) VALUES ('b_k2', 't_k', 'para', now())",
    );
    await expect(
      db.exec(
        "INSERT INTO credit_balances (id, tenant_id, product, updated_at) VALUES ('b_k3', 't_k', 'para', now())",
      ),
    ).rejects.toThrow(/duplicate key/);
  });
});
