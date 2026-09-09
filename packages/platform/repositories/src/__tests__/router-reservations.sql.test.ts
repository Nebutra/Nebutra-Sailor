/**
 * A hold that is not a record is money the customer loses when we crash.
 *
 * `RouterBillingRepository` decrements `credit_balances.balance` before the
 * upstream call. That decrement is only safe because it is written together
 * with a `router_reservations` row, and given back when the row expires. Those
 * are SQL guarantees — atomicity of the two writes, and a delete-first lease
 * that makes the refund happen exactly once — so they are proven against a real
 * engine rather than a mocked Prisma.
 *
 * The statements below are the ones the repository issues:
 *
 * - `reserve()` → conditional decrement + insert, one transaction. A repeated
 *   request id collides on the primary key and takes the decrement down with it.
 * - `settle()`  → delete the reservation, then move the balance by
 *   `reserved - charged` only if the delete found the hold still standing.
 * - `sweepExpired()` → `DELETE … RETURNING` as the lease, then refund and write
 *   a `CreditTransaction`.
 *
 * PGlite runs this on every `pnpm test`; point `RLS_ATTACK_DATABASE_URL` (or a
 * localhost `DATABASE_URL`) at a real PostgreSQL and the same SQL replays there.
 */
import { availableBackends, type SqlClient } from "@nebutra/db/testing";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

const TENANT = "tenant_personal_1";

const SCHEMA = `
  CREATE TABLE credit_balances (
    id text PRIMARY KEY,
    tenant_id text NOT NULL UNIQUE,
    balance numeric(10,4) NOT NULL DEFAULT 0,
    currency varchar(3) NOT NULL DEFAULT 'USD'
  );
  CREATE TABLE router_reservations (
    id text PRIMARY KEY,
    tenant_id text NOT NULL,
    api_key_id text,
    amount numeric(12,6) NOT NULL,
    created_at timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expires_at timestamp(3) NOT NULL
  );
  CREATE INDEX router_reservations_tenant_id_expires_at_idx
    ON router_reservations(tenant_id, expires_at);
  CREATE TABLE credit_transactions (
    id text PRIMARY KEY,
    credit_balance_id text NOT NULL,
    type text NOT NULL,
    amount numeric(10,4) NOT NULL,
    balance_after numeric(10,4) NOT NULL,
    related_id text,
    UNIQUE (credit_balance_id, type, related_id)
  );
`;

/**
 * The hold and its record, atomically: the insert draws its row from the
 * conditional decrement, so an insufficient balance writes nothing and a
 * duplicate request id rolls the decrement back.
 */
async function reserve(
  db: SqlClient,
  requestId: string,
  amount: number,
  expiresAt: Date,
): Promise<boolean> {
  try {
    const rows = await db.query<{ id: string }>(
      `WITH held AS (
         UPDATE credit_balances SET balance = balance - $1
          WHERE tenant_id = $2 AND balance >= $1
          RETURNING id
       )
       INSERT INTO router_reservations (id, tenant_id, api_key_id, amount, expires_at)
       SELECT $3, $2, 'key_1', $1, $4 FROM held
       RETURNING id`,
      [amount, TENANT, requestId, expiresAt.toISOString()],
    );
    return rows.length === 1;
  } catch {
    // Primary-key collision: this request already holds money. The statement
    // rolled back, so no second decrement happened.
    return true;
  }
}

/** Close the hold and take the charge, refusing to refund a hold already swept. */
async function settle(db: SqlClient, requestId: string, charged: number): Promise<void> {
  const claimed = await db.query<{ amount: string }>(
    "DELETE FROM router_reservations WHERE id = $1 RETURNING amount",
    [requestId],
  );
  const reserved = claimed.length === 1 ? Number(claimed[0]?.amount) : 0;
  await db.query("UPDATE credit_balances SET balance = balance + $1 WHERE tenant_id = $2", [
    reserved - charged,
    TENANT,
  ]);
}

/** The expiry sweep. The delete is the lease; only its winner refunds. */
async function sweep(db: SqlClient, now: Date): Promise<number> {
  const expired = await db.query<{ id: string; tenant_id: string; amount: string }>(
    "SELECT id, tenant_id, amount FROM router_reservations WHERE expires_at < $1 ORDER BY expires_at",
    [now.toISOString()],
  );
  let swept = 0;
  for (const row of expired) {
    const claimed = await db.query<{ id: string }>(
      "DELETE FROM router_reservations WHERE id = $1 RETURNING id",
      [row.id],
    );
    if (claimed.length !== 1) continue;
    const balance = await db.query<{ id: string; balance: string }>(
      "UPDATE credit_balances SET balance = balance + $1 WHERE tenant_id = $2 RETURNING id, balance",
      [row.amount, row.tenant_id],
    );
    await db.query(
      `INSERT INTO credit_transactions (id, credit_balance_id, type, amount, balance_after, related_id)
       VALUES ($1, $2, 'REFUND', $3, $4, $5)`,
      [
        `ct_${row.id}`,
        balance[0]?.id,
        row.amount,
        balance[0]?.balance,
        `router:reservation:${row.id}`,
      ],
    );
    swept += 1;
  }
  return swept;
}

async function balanceOf(db: SqlClient): Promise<number> {
  const rows = await db.query<{ balance: string }>(
    "SELECT balance FROM credit_balances WHERE tenant_id = $1",
    [TENANT],
  );
  return Number(rows[0]?.balance ?? 0);
}

async function holds(db: SqlClient): Promise<number> {
  const rows = await db.query<{ n: string }>("SELECT count(*) AS n FROM router_reservations");
  return Number(rows[0]?.n ?? 0);
}

const PAST = new Date("2026-09-09T00:00:00.000Z");
const NOW = new Date("2026-09-09T02:00:00.000Z");
const FUTURE = new Date("2026-09-09T04:00:00.000Z");

describe.each(availableBackends("router_reservations"))("router reservations ($name)", ({
  open,
}) => {
  let db: SqlClient;

  beforeEach(async () => {
    db = await open();
    await db.exec(SCHEMA);
    await db.query("INSERT INTO credit_balances (id, tenant_id, balance) VALUES ($1, $2, $3)", [
      "cb_1",
      TENANT,
      "1.0000",
    ]);
  });

  afterEach(async () => {
    await db.close();
  });

  it("records every hold it takes, and records nothing when it refuses", async () => {
    expect(await reserve(db, "req_1", 0.4, FUTURE)).toBe(true);
    expect(await holds(db)).toBe(1);
    expect(await balanceOf(db)).toBeCloseTo(0.6, 4);

    expect(await reserve(db, "req_2", 5, FUTURE)).toBe(false);
    expect(await holds(db)).toBe(1);
    expect(await balanceOf(db)).toBeCloseTo(0.6, 4);
  });

  it("gives an abandoned hold back exactly once, however often the sweep runs", async () => {
    await reserve(db, "req_dead", 0.4, PAST);
    expect(await balanceOf(db)).toBeCloseTo(0.6, 4);

    expect(await sweep(db, NOW)).toBe(1);
    expect(await balanceOf(db)).toBeCloseTo(1, 4);
    expect(await holds(db)).toBe(0);

    // The customer is whole. A second pass must not make them richer.
    expect(await sweep(db, NOW)).toBe(0);
    expect(await balanceOf(db)).toBeCloseTo(1, 4);
  });

  it("refunds once when two sweeps race the same expired hold", async () => {
    await reserve(db, "req_dead", 0.4, PAST);
    const [a, b] = await Promise.all([sweep(db, NOW), sweep(db, NOW)]);
    expect(a + b).toBe(1);
    expect(await balanceOf(db)).toBeCloseTo(1, 4);
  });

  it("writes a credit transaction for the refund — no balance moves unexplained", async () => {
    await reserve(db, "req_dead", 0.4, PAST);
    await sweep(db, NOW);
    const rows = await db.query<{ type: string; amount: string; related_id: string }>(
      "SELECT type, amount, related_id FROM credit_transactions",
    );
    expect(rows).toHaveLength(1);
    expect(rows[0]?.type).toBe("REFUND");
    expect(Number(rows[0]?.amount)).toBeCloseTo(0.4, 4);
    expect(rows[0]?.related_id).toBe("router:reservation:req_dead");
  });

  it("leaves no row behind after a settle, and the sweep cannot double-refund it", async () => {
    await reserve(db, "req_ok", 0.4, PAST);
    await settle(db, "req_ok", 0.12);
    expect(await holds(db)).toBe(0);
    expect(await balanceOf(db)).toBeCloseTo(0.88, 4);

    expect(await sweep(db, NOW)).toBe(0);
    expect(await balanceOf(db)).toBeCloseTo(0.88, 4);
  });

  it("takes only the charge when a settle lands after its hold was swept", async () => {
    await reserve(db, "req_late", 0.4, PAST);
    await sweep(db, NOW);
    expect(await balanceOf(db)).toBeCloseTo(1, 4);

    // The request finished after all. It owes 0.12 — not 0.12 minus a hold
    // that has already been handed back.
    await settle(db, "req_late", 0.12);
    expect(await balanceOf(db)).toBeCloseTo(0.88, 4);
  });

  it("admits one of two concurrent holds the balance can only cover once", async () => {
    const [first, second] = await Promise.all([
      reserve(db, "req_a", 0.9, FUTURE),
      reserve(db, "req_b", 0.9, FUTURE),
    ]);
    expect([first, second].filter(Boolean)).toHaveLength(1);
    expect(await holds(db)).toBe(1);
    expect(await balanceOf(db)).toBeCloseTo(0.1, 4);
    expect(await balanceOf(db)).toBeGreaterThanOrEqual(0);
  });

  it("does not take a second hold when the same request id is admitted twice", async () => {
    expect(await reserve(db, "req_retry", 0.4, FUTURE)).toBe(true);
    expect(await reserve(db, "req_retry", 0.4, FUTURE)).toBe(true);
    expect(await holds(db)).toBe(1);
    expect(await balanceOf(db)).toBeCloseTo(0.6, 4);
  });
});
