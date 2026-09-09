/**
 * `RouterBillingRepository` against a real Prisma client.
 *
 * `router-billing.sql.test.ts` proves the *SQL* is sound by issuing it by
 * hand. That leaves the gap this file closes: nothing asserted that Prisma
 * emits that SQL. A `updateMany({ where: { balance: { gte } } })` that quietly
 * became a read-then-write, or a `$transaction` that did not roll back the
 * decrement when the reservation insert collided, would pass every existing
 * test and lose money in production.
 *
 * So this runs the generated client, its query compiler and the driver adapter
 * unchanged, over PGlite on a loopback socket — no database service, and
 * therefore no reason to skip it.
 */
import { createPglitePrismaClient, type PrismaTestDatabase } from "@nebutra/db/testing";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { RouterBillingRepository } from "../router-billing.repository";
import { ROUTER_DDL } from "./router-schema";

const TENANT = "tenant_personal_1";
const OTHER = "tenant_personal_2";
const KEY = "key_1";

describe("RouterBillingRepository (real Prisma over PGlite)", () => {
  let database: PrismaTestDatabase;
  let repository: RouterBillingRepository;

  beforeAll(async () => {
    database = await createPglitePrismaClient();
    await database.prisma.$executeRawUnsafe(ROUTER_DDL);
    repository = new RouterBillingRepository(database.prisma);
  }, 60_000);

  afterAll(async () => {
    await database?.close();
  });

  beforeEach(async () => {
    const prisma = database.prisma;
    await prisma.$executeRawUnsafe(
      "TRUNCATE credit_balances, credit_transactions, usage_ledger_entries, router_reservations, api_keys, model_configs",
    );
    await prisma.$executeRawUnsafe(
      `INSERT INTO credit_balances (id, tenant_id, balance) VALUES
         ('cb_1', '${TENANT}', 1.0000), ('cb_2', '${OTHER}', 50.0000)`,
    );
    await prisma.$executeRawUnsafe(
      `INSERT INTO api_keys (id, name, key_hash, key_prefix, tenant_id)
         VALUES ('${KEY}', 'k', 'hash_1', 'sk-sailor', '${TENANT}')`,
    );
    await prisma.$executeRawUnsafe(
      `INSERT INTO model_configs
         (id, model_name, provider, input_price_per_million, output_price_per_million,
          unit, published, is_active)
       VALUES ('mc_1', 'gpt-x', 'OPENAI', 1.000000, 10.000000, 'PER_1M_TOKENS', true, true)`,
    );
  });

  async function balance(tenantId = TENANT): Promise<number> {
    const row = await database.prisma.creditBalance.findUnique({ where: { tenantId } });
    return Number(row?.balance ?? 0);
  }

  describe("findPrice", () => {
    it("returns the row with the Decimals already numbers", async () => {
      await expect(repository.findPrice("gpt-x")).resolves.toMatchObject({
        modelName: "gpt-x",
        unit: "PER_1M_TOKENS",
        published: true,
        isActive: true,
        inputPerMTok: 1,
        outputPerMTok: 10,
        cacheReadPerMTok: null,
      });
    });

    it("returns null for a model nobody sells", async () => {
      await expect(repository.findPrice("gpt-nope")).resolves.toBeNull();
    });
  });

  describe("getKeySpend", () => {
    it("reports the daily counter as zero once it belongs to an earlier UTC day", async () => {
      await database.prisma.$executeRawUnsafe(
        `UPDATE api_keys SET cost_daily = 4, cost_total = 9,
           cost_daily_reset_at = TIMESTAMP '2026-09-01 00:00:00' WHERE id = '${KEY}'`,
      );
      const spend = await repository.getKeySpend(KEY, new Date("2026-09-08T04:00:00Z"));
      expect(spend).toMatchObject({ costDaily: 0, costTotal: 9, saveLogs: false });
    });

    it("keeps the counter inside the same UTC day, including late in it", async () => {
      await database.prisma.$executeRawUnsafe(
        `UPDATE api_keys SET cost_daily = 4, cost_total = 9,
           cost_daily_reset_at = TIMESTAMP '2026-09-08 00:00:00' WHERE id = '${KEY}'`,
      );
      const spend = await repository.getKeySpend(KEY, new Date("2026-09-08T23:59:59Z"));
      expect(spend?.costDaily).toBe(4);
    });
  });

  describe("reserve", () => {
    it("holds the money and records the hold in one transaction", async () => {
      await expect(
        repository.reserve({ tenantId: TENANT, requestId: "req_1", keyId: KEY, amount: 0.4 }),
      ).resolves.toBe(true);
      expect(await balance()).toBeCloseTo(0.6, 4);
      const held = await database.prisma.routerReservation.findUnique({ where: { id: "req_1" } });
      expect(Number(held?.amount)).toBeCloseTo(0.4, 6);
    });

    it("refuses what the balance cannot cover, and writes no hold when it does", async () => {
      await expect(
        repository.reserve({ tenantId: TENANT, requestId: "req_2", amount: 5 }),
      ).resolves.toBe(false);
      expect(await balance()).toBeCloseTo(1, 4);
      await expect(
        database.prisma.routerReservation.findUnique({ where: { id: "req_2" } }),
      ).resolves.toBeNull();
    });

    it("admits only as many calls as the balance can cover", async () => {
      // Sequential on purpose: PGlite serves one connection, so six interactive
      // transactions at once exhaust it and prove nothing about the predicate.
      // True contention is a row lock on `UPDATE … WHERE balance >= $1` and is
      // covered against a real engine in `router-billing.sql.test.ts`. What is
      // proven here is that Prisma emits that conditional update at all.
      const results: boolean[] = [];
      for (let i = 0; i < 6; i += 1) {
        results.push(
          await repository.reserve({ tenantId: TENANT, requestId: `req_c${i}`, amount: 0.3 }),
        );
      }
      expect(results.filter(Boolean)).toHaveLength(3);
      expect(await balance()).toBeCloseTo(0.1, 4);
    });

    it("charges one hold for a retried admit, and rolls the second decrement back", async () => {
      await repository.reserve({ tenantId: TENANT, requestId: "req_3", amount: 0.4 });
      await expect(
        repository.reserve({ tenantId: TENANT, requestId: "req_3", amount: 0.4 }),
      ).resolves.toBe(true);
      // The tell: without the rollback the balance would be 0.2.
      expect(await balance()).toBeCloseTo(0.6, 4);
    });

    it("takes no hold for a free model, and provisions the balance row", async () => {
      await expect(
        repository.reserve({ tenantId: "tenant_new", requestId: "req_4", amount: 0 }),
      ).resolves.toBe(true);
      expect(await balance("tenant_new")).toBe(0);
    });
  });

  describe("release", () => {
    it("returns the hold exactly once, however many times it is called", async () => {
      await repository.reserve({ tenantId: TENANT, requestId: "req_5", amount: 0.5 });
      await repository.release({ tenantId: TENANT, requestId: "req_5", amount: 0.5 });
      await repository.release({ tenantId: TENANT, requestId: "req_5", amount: 0.5 });
      expect(await balance()).toBeCloseTo(1, 4);
    });

    it("will not credit another tenant's request id", async () => {
      await repository.reserve({ tenantId: TENANT, requestId: "req_6", amount: 0.5 });
      await repository.release({ tenantId: OTHER, requestId: "req_6", amount: 0.5 });
      expect(await balance(OTHER)).toBeCloseTo(50, 4);
      expect(await balance()).toBeCloseTo(0.5, 4);
    });
  });

  describe("settle", () => {
    const settleInput = (over: Record<string, unknown> = {}) => ({
      tenantId: TENANT,
      keyId: KEY,
      requestId: "req_s",
      idempotencyKey: "router:req_s",
      model: "gpt-x",
      quantity: 1_000,
      unit: "token",
      unitCost: 0.000_001,
      totalCost: 0.12,
      currency: "USD",
      reserved: 0.5,
      metadata: { product: "router" },
      now: new Date("2026-09-08T10:00:00Z"),
      ...over,
    });

    it("writes the ledger row, returns the unspent hold and moves the key counters", async () => {
      await repository.reserve({ tenantId: TENANT, requestId: "req_s", amount: 0.5 });
      await expect(repository.settle(settleInput())).resolves.toMatchObject({
        settled: true,
        charged: 0.12,
      });

      expect(await balance()).toBeCloseTo(0.88, 4);
      const entry = await database.prisma.usageLedgerEntry.findFirst();
      expect(entry).toMatchObject({ resource: "gpt-x", unit: "token" });
      expect(Number(entry?.totalCost)).toBeCloseTo(0.12, 6);
      expect(entry?.quantity).toBe(1_000n);

      const key = await database.prisma.aPIKey.findUnique({ where: { id: KEY } });
      expect(Number(key?.costDaily)).toBeCloseTo(0.12, 6);
      expect(Number(key?.costTotal)).toBeCloseTo(0.12, 6);
      expect(key?.costDailyResetAt?.toISOString()).toBe("2026-09-08T00:00:00.000Z");
    });

    it("collapses a replayed settle to a complete no-op", async () => {
      await repository.reserve({ tenantId: TENANT, requestId: "req_s", amount: 0.5 });
      await repository.settle(settleInput());
      await expect(repository.settle(settleInput())).resolves.toEqual({
        settled: false,
        reason: "duplicate",
      });
      expect(await balance()).toBeCloseTo(0.88, 4);
      await expect(database.prisma.usageLedgerEntry.count()).resolves.toBe(1);
      const key = await database.prisma.aPIKey.findUnique({ where: { id: KEY } });
      expect(Number(key?.costTotal)).toBeCloseTo(0.12, 6);
    });

    it("takes only the charge when the sweep already returned the hold", async () => {
      await repository.reserve({ tenantId: TENANT, requestId: "req_s", amount: 0.5 });
      await repository.release({ tenantId: TENANT, requestId: "req_s", amount: 0.5 });
      await repository.settle(settleInput());
      // Returning `reserved` a second time here would be inventing money.
      expect(await balance()).toBeCloseTo(0.88, 4);
    });

    it("writes a zero-cost row and returns the whole hold for an unbillable request", async () => {
      await repository.reserve({ tenantId: TENANT, requestId: "req_s", amount: 0.5 });
      await repository.settle(settleInput({ totalCost: 0, quantity: 0 }));
      expect(await balance()).toBeCloseTo(1, 4);
      await expect(database.prisma.usageLedgerEntry.count()).resolves.toBe(1);
      // No money moved, so there is no credit transaction to write.
      await expect(database.prisma.creditTransaction.count()).resolves.toBe(0);
    });

    it("debits a post-paid request that never held anything", async () => {
      // A multipart image edit: the model is a form field, so no hold was taken
      // and `reserved` is genuinely zero. The settle is a plain debit, and the
      // absent reservation row must not be read as "the sweep beat us here".
      await repository.settle(
        settleInput({
          requestId: "req_img",
          idempotencyKey: "router:req_img",
          model: "gpt-image-2",
          unit: "image",
          quantity: 2,
          unitCost: 0.04,
          totalCost: 0.08,
          reserved: 0,
        }),
      );
      expect(await balance()).toBeCloseTo(0.92, 4);
      const entry = await database.prisma.usageLedgerEntry.findFirst();
      expect(entry).toMatchObject({ resource: "gpt-image-2", unit: "image" });
      expect(entry?.quantity).toBe(2n);
      expect(Number(entry?.totalCost)).toBeCloseTo(0.08, 6);
      // The debit is explained, as every balance move must be.
      const credit = await database.prisma.creditTransaction.findFirst();
      expect(Number(credit?.amount)).toBeCloseTo(-0.08, 6);
      const key = await database.prisma.aPIKey.findUnique({ where: { id: KEY } });
      expect(Number(key?.costTotal)).toBeCloseTo(0.08, 6);
    });

    it("resets the daily counter on the first settle of a new UTC day", async () => {
      await database.prisma.$executeRawUnsafe(
        `UPDATE api_keys SET cost_daily = 4, cost_total = 9,
           cost_daily_reset_at = TIMESTAMP '2026-09-07 00:00:00' WHERE id = '${KEY}'`,
      );
      await repository.reserve({ tenantId: TENANT, requestId: "req_s", amount: 0.5 });
      await repository.settle(settleInput());
      const key = await database.prisma.aPIKey.findUnique({ where: { id: KEY } });
      expect(Number(key?.costDaily)).toBeCloseTo(0.12, 6);
      expect(Number(key?.costTotal)).toBeCloseTo(9.12, 6);
    });
  });

  describe("sweepExpired", () => {
    it("refunds an expired hold once and explains it with a credit transaction", async () => {
      const now = new Date("2026-09-08T10:00:00Z");
      await repository.reserve({
        tenantId: TENANT,
        requestId: "req_x",
        keyId: KEY,
        amount: 0.4,
        now,
        ttlMs: 1,
      });
      const result = await repository.sweepExpired({ now: new Date(now.getTime() + 60_000) });
      expect(result).toMatchObject({ swept: 1, tenantIds: [TENANT] });
      expect(result.refunded).toBeCloseTo(0.4, 6);
      expect(await balance()).toBeCloseTo(1, 4);

      const tx = await database.prisma.creditTransaction.findFirst();
      expect(tx).toMatchObject({ type: "REFUND", relatedId: "router:reservation:req_x" });

      // A second pass has nothing left to give back.
      await expect(
        repository.sweepExpired({ now: new Date(now.getTime() + 120_000) }),
      ).resolves.toMatchObject({ swept: 0 });
      expect(await balance()).toBeCloseTo(1, 4);
    });

    it("leaves a hold that has not expired alone", async () => {
      const now = new Date("2026-09-08T10:00:00Z");
      await repository.reserve({ tenantId: TENANT, requestId: "req_y", amount: 0.4, now });
      await expect(repository.sweepExpired({ now })).resolves.toMatchObject({ swept: 0 });
      expect(await balance()).toBeCloseTo(0.6, 4);
    });

    it("scoped to a tenant, touches nobody else's holds", async () => {
      const now = new Date("2026-09-08T10:00:00Z");
      await repository.reserve({
        tenantId: TENANT,
        requestId: "req_a",
        amount: 0.4,
        now,
        ttlMs: 1,
      });
      await repository.reserve({ tenantId: OTHER, requestId: "req_b", amount: 2, now, ttlMs: 1 });
      const later = new Date(now.getTime() + 60_000);
      await expect(
        repository.sweepExpired({ tenantId: TENANT, now: later }),
      ).resolves.toMatchObject({ swept: 1 });
      expect(await balance(OTHER)).toBeCloseTo(48, 4);
    });
  });
});
