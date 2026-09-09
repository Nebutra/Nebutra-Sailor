/**
 * The Router money spine's guarantees are SQL guarantees, so they are proven
 * against a real engine, not a mocked Prisma.
 *
 * `RouterBillingRepository` issues exactly the statements below:
 *
 * - `reserve()`  → `UPDATE credit_balances SET balance = balance - $1
 *                   WHERE tenant_id = $2 AND balance >= $1`
 * - `settle()`   → `INSERT INTO usage_ledger_entries …` guarded by the unique
 *                   `(tenant_id, idempotency_key)`, then a signed increment
 *                   returning the unspent part of the hold.
 *
 * What has to hold: two concurrent calls cannot both be admitted against the
 * same dollar, a replayed settle moves nothing, and RLS on `credit_balances`
 * filters by tenant for a *personal* tenant id, not only an org one.
 *
 * PGlite runs this on every `pnpm test`. Point `RLS_ATTACK_DATABASE_URL` (or a
 * localhost `DATABASE_URL`) at a real PostgreSQL and the same SQL replays there.
 */
import {
  availableBackends,
  becomeTenant,
  randomRoleName,
  type SqlClient,
} from "@nebutra/db/testing";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

const TENANT = "tenant_personal_1";
const OTHER = "tenant_personal_2";

const SCHEMA = `
  CREATE TABLE credit_balances (
    id text PRIMARY KEY,
    tenant_id text NOT NULL UNIQUE,
    balance numeric(10,4) NOT NULL DEFAULT 0,
    currency varchar(3) NOT NULL DEFAULT 'USD'
  );
  CREATE TABLE usage_ledger_entries (
    id text PRIMARY KEY,
    tenant_id text NOT NULL,
    idempotency_key varchar(191) NOT NULL,
    total_cost numeric(10,6),
    UNIQUE (tenant_id, idempotency_key)
  );
`;

/** The exact predicate `RouterBillingRepository.reserve` relies on. */
async function reserve(db: SqlClient, tenantId: string, amount: number): Promise<boolean> {
  const rows = await db.query<{ id: string }>(
    `UPDATE credit_balances SET balance = balance - $1
       WHERE tenant_id = $2 AND balance >= $1
       RETURNING id`,
    [amount, tenantId],
  );
  return rows.length === 1;
}

async function balanceOf(db: SqlClient, tenantId: string): Promise<number> {
  const rows = await db.query<{ balance: string }>(
    "SELECT balance FROM credit_balances WHERE tenant_id = $1",
    [tenantId],
  );
  return Number(rows[0]?.balance ?? 0);
}

describe.each(availableBackends("router_billing"))("router money spine ($name)", ({ open }) => {
  let db: SqlClient;

  beforeEach(async () => {
    db = await open();
    await db.exec(SCHEMA);
    await db.query(
      "INSERT INTO credit_balances (id, tenant_id, balance) VALUES ($1, $2, $3), ($4, $5, $6)",
      ["cb_1", TENANT, "1.0000", "cb_2", OTHER, "50.0000"],
    );
  });

  afterEach(async () => {
    await db.close();
  });

  it("admits only as many calls as the balance can cover", async () => {
    // Ten requests, each holding $0.30, against $1.00. The harness owns one
    // connection, so these interleave rather than truly race — what is proven
    // here is the predicate itself. Real parallel contention is Postgres's
    // row lock on the same `UPDATE … WHERE balance >= $1`, which is why the
    // check lives in the statement and not in the application.
    const results = await Promise.all(Array.from({ length: 10 }, () => reserve(db, TENANT, 0.3)));
    expect(results.filter(Boolean)).toHaveLength(3);
    expect(await balanceOf(db, TENANT)).toBeCloseTo(0.1, 4);
  });

  it("admits exactly one of two concurrent debits the balance can only cover once", async () => {
    const [first, second] = await Promise.all([reserve(db, TENANT, 0.9), reserve(db, TENANT, 0.9)]);
    expect([first, second].filter(Boolean)).toHaveLength(1);
    expect(await balanceOf(db, TENANT)).toBeCloseTo(0.1, 4);
  });

  it("never lets the balance go negative, whatever the order", async () => {
    expect(await reserve(db, TENANT, 0.9)).toBe(true);
    expect(await reserve(db, TENANT, 0.9)).toBe(false);
    expect(await balanceOf(db, TENANT)).toBeCloseTo(0.1, 4);
  });

  it("returns the unspent hold as one signed increment at settle", async () => {
    expect(await reserve(db, TENANT, 0.5)).toBe(true);
    const charged = 0.12;
    await db.query("UPDATE credit_balances SET balance = balance + $1 WHERE tenant_id = $2", [
      0.5 - charged,
      TENANT,
    ]);
    expect(await balanceOf(db, TENANT)).toBeCloseTo(0.88, 4);
  });

  it("collapses a replayed settle to a no-op on the idempotency key", async () => {
    const insert = () =>
      db.query(
        "INSERT INTO usage_ledger_entries (id, tenant_id, idempotency_key) VALUES ($1,$2,$3)",
        [Math.random().toString(36).slice(2), TENANT, "router:req_1"],
      );
    await insert();
    await expect(insert()).rejects.toThrow();
    const rows = await db.query<{ n: string }>(
      "SELECT count(*) AS n FROM usage_ledger_entries WHERE tenant_id = $1",
      [TENANT],
    );
    expect(Number(rows[0]?.n)).toBe(1);
  });

  it("keeps RLS on credit_balances filtering by a personal tenant id", async () => {
    const role = randomRoleName("router_wallet");
    db.role = role;
    await db.exec(`
      CREATE ROLE ${role} NOSUPERUSER NOBYPASSRLS LOGIN;
      ALTER TABLE credit_balances ENABLE ROW LEVEL SECURITY;
      ALTER TABLE credit_balances FORCE ROW LEVEL SECURITY;
      CREATE POLICY credit_balances_isolation ON credit_balances
        USING (tenant_id = COALESCE(current_setting('app.current_tenant_id', true), ''))
        WITH CHECK (tenant_id = COALESCE(current_setting('app.current_tenant_id', true), ''));
      GRANT ALL ON TABLE credit_balances TO ${role};
    `);

    await becomeTenant(db, role, TENANT);
    const visible = await db.query<{ tenant_id: string }>("SELECT tenant_id FROM credit_balances");
    expect(visible.map((r) => r.tenant_id)).toEqual([TENANT]);

    // The other tenant's balance is not merely hidden — it cannot be spent.
    expect(await reserve(db, OTHER, 1)).toBe(false);

    await db.exec("RESET ROLE");
    expect(await balanceOf(db, OTHER)).toBeCloseTo(50, 4);
  });
});
