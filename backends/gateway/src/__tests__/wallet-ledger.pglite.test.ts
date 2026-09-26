/**
 * The product-wallet ledger against a real Prisma client (ADR 2026-09-27).
 *
 * Lots, memberships and the upkeep jobs are money rules that only mean
 * something when the SQL runs: which lot a spend draws on, what an expiry takes
 * back, whether a replayed order extends a membership twice. So this runs
 * `@nebutra/billing` over the generated client and PGlite, with the tables
 * those rules touch, and checks the numbers.
 */
import {
  addCredits,
  applyMembershipPurchase,
  configureBillingTenantDb,
  deductCredits,
  expireCreditLots,
  getCreditBalanceFresh,
  getExpiringCredits,
  getMembership,
  grantDueMemberships,
} from "@nebutra/billing";
import { createPglitePrismaClient, type PrismaTestDatabase } from "@nebutra/db/testing";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

const DDL = `
  CREATE TYPE "CreditTransactionType" AS ENUM
    ('PURCHASE','USAGE','REFUND','ADJUSTMENT','EXPIRATION','BONUS');
  CREATE TYPE "CreditLotSource" AS ENUM ('SUBSCRIPTION','PURCHASE','PROMO');
  CREATE TABLE tenants (id text PRIMARY KEY);
  CREATE TABLE credit_balances (
    id text PRIMARY KEY,
    tenant_id text NOT NULL REFERENCES tenants(id),
    product varchar(32) NOT NULL,
    balance numeric(10,4) NOT NULL DEFAULT 0,
    currency varchar(3) NOT NULL DEFAULT 'USD',
    updated_at timestamp(3) NOT NULL DEFAULT now(),
    UNIQUE (tenant_id, product)
  );
  CREATE TABLE credit_transactions (
    id text PRIMARY KEY,
    credit_balance_id text NOT NULL REFERENCES credit_balances(id),
    type "CreditTransactionType" NOT NULL,
    amount numeric(10,4) NOT NULL,
    balance_after numeric(10,4) NOT NULL,
    description text,
    expires_at timestamp(3),
    related_id text,
    metadata jsonb NOT NULL DEFAULT '{}',
    created_at timestamp(3) NOT NULL DEFAULT now(),
    UNIQUE (credit_balance_id, type, related_id)
  );
  CREATE TABLE credit_lots (
    id text PRIMARY KEY,
    credit_balance_id text NOT NULL REFERENCES credit_balances(id),
    source "CreditLotSource" NOT NULL,
    amount numeric(10,4) NOT NULL,
    remaining numeric(10,4) NOT NULL,
    expires_at timestamp(3) NOT NULL,
    related_id text,
    created_at timestamp(3) NOT NULL DEFAULT now()
  );
  CREATE TABLE memberships (
    id text PRIMARY KEY,
    tenant_id text NOT NULL REFERENCES tenants(id),
    product varchar(32) NOT NULL,
    tier varchar(32) NOT NULL,
    starts_at timestamp(3) NOT NULL,
    ends_at timestamp(3) NOT NULL,
    monthly_credits integer NOT NULL DEFAULT 0,
    next_grant_at timestamp(3),
    applied_orders text[] DEFAULT ARRAY[]::text[],
    created_at timestamp(3) NOT NULL DEFAULT now(),
    updated_at timestamp(3) NOT NULL,
    UNIQUE (tenant_id, product)
  );
`;

const ORG = "tenant_1";
const DAY = 24 * 60 * 60 * 1000;

describe("product wallet ledger (real Prisma over PGlite)", () => {
  let database: PrismaTestDatabase;

  beforeAll(async () => {
    database = await createPglitePrismaClient();
    await database.prisma.$executeRawUnsafe(DDL);
    configureBillingTenantDb(() => database.prisma);
  }, 60_000);

  afterAll(async () => {
    await database?.close();
  });

  beforeEach(async () => {
    await database.prisma.$executeRawUnsafe(
      "TRUNCATE memberships, credit_lots, credit_transactions, credit_balances, tenants CASCADE",
    );
    await database.prisma.$executeRawUnsafe(`INSERT INTO tenants (id) VALUES ('${ORG}')`);
  });

  const balance = async (product: string) => (await getCreditBalanceFresh(ORG, product)).balance;

  it("spends the soonest-expiring credits first, and the never-expiring part last", async () => {
    await addCredits({ organizationId: ORG, product: "kuanlan", amount: 500, type: "BONUS" });
    await addCredits({
      organizationId: ORG,
      product: "kuanlan",
      amount: 300,
      type: "PURCHASE",
      relatedId: "pack",
      lot: { source: "PURCHASE", expiresAt: new Date(Date.now() + 700 * DAY) },
    });
    await addCredits({
      organizationId: ORG,
      product: "kuanlan",
      amount: 200,
      type: "PURCHASE",
      relatedId: "month",
      lot: { source: "SUBSCRIPTION", expiresAt: new Date(Date.now() + 20 * DAY) },
    });

    await deductCredits({ organizationId: ORG, product: "kuanlan", amount: 250 });

    expect(await balance("kuanlan")).toBe(750);
    const expiring = await getExpiringCredits(ORG, "kuanlan");
    // The month's 200 went first, then 50 of the pack; the 500 never-expiring is untouched.
    expect(expiring.map((l) => [l.source, l.remaining])).toEqual([["PURCHASE", 250]]);
  });

  it("takes back what an expired lot still holds, once, with a ledger row saying so", async () => {
    await addCredits({ organizationId: ORG, product: "para", amount: 100, type: "BONUS" });
    await addCredits({
      organizationId: ORG,
      product: "para",
      amount: 300,
      type: "PURCHASE",
      relatedId: "month",
      lot: { source: "SUBSCRIPTION", expiresAt: new Date(Date.now() + DAY) },
    });
    await deductCredits({ organizationId: ORG, product: "para", amount: 120 });

    const later = new Date(Date.now() + 2 * DAY);
    expect(await expireCreditLots(database.prisma, { now: later })).toEqual({
      expired: 1,
      errors: 0,
    });
    expect(await expireCreditLots(database.prisma, { now: later })).toEqual({
      expired: 0,
      errors: 0,
    });

    // 300 granted, 120 spent from it: 180 expires, the 100 that never expires stays.
    expect(await balance("para")).toBe(100);
    const rows = await database.prisma.creditTransaction.findMany({
      where: { type: "EXPIRATION" },
    });
    expect(rows.map((r) => Number(r.amount))).toEqual([-180]);
  });

  it("never lets an expiry take a balance below zero", async () => {
    await addCredits({
      organizationId: ORG,
      product: "router",
      amount: 10,
      type: "PURCHASE",
      relatedId: "promo",
      lot: { source: "PROMO", expiresAt: new Date(Date.now() + DAY) },
    });
    // A spend path that does not draw on lots (Router's holds) leaves the lot looking full.
    await database.prisma.creditBalance.updateMany({ data: { balance: 4 } });

    await expireCreditLots(database.prisma, { now: new Date(Date.now() + 2 * DAY) });

    expect(await balance("router")).toBe(0);
  });

  describe("memberships", () => {
    const buy = (orderId: string, tier: string, days: number, now = new Date()) =>
      applyMembershipPurchase({
        orderId,
        organizationId: ORG,
        product: "kuanlan",
        tier,
        days,
        monthlyCredits: 3200,
        now,
      });

    it("starts now and grants the first month at once; a replayed order changes nothing", async () => {
      const now = new Date();
      await buy("o1", "pro", 30, now);
      await buy("o1", "pro", 30, now);

      const membership = await getMembership(ORG, "kuanlan");
      expect(membership?.tier).toBe("pro");
      expect(membership?.endsAt.getTime()).toBe(now.getTime() + 30 * DAY);
      expect(await balance("kuanlan")).toBe(3200);
    });

    it("extends the same tier from where it ends, and grants that month when it arrives", async () => {
      const now = new Date();
      await buy("o1", "pro", 30, now);
      await buy("o2", "pro", 30, now);

      expect((await getMembership(ORG, "kuanlan"))?.endsAt.getTime()).toBe(
        now.getTime() + 60 * DAY,
      );
      expect(await balance("kuanlan")).toBe(3200);

      const monthTwo = new Date(now.getTime() + 30 * DAY + 1000);
      expect(await grantDueMemberships(database.prisma, { now: monthTwo })).toEqual({
        granted: 1,
        errors: 0,
      });
      await grantDueMemberships(database.prisma, { now: monthTwo });
      // The first month's 3,200 expired at its end; the job takes that back separately.
      await expireCreditLots(database.prisma, { now: monthTwo });
      expect(await balance("kuanlan")).toBe(3200);
    });

    it("pays an annual membership monthly, and stops at its end", async () => {
      const now = new Date();
      await buy("year", "pro", 365, now);
      let granted = 0;
      for (let month = 1; month <= 14; month++) {
        const at = new Date(now.getTime() + month * 30 * DAY + 1000);
        granted += (await grantDueMemberships(database.prisma, { now: at })).granted;
      }
      // Months 2–13 start inside the year (day 30 … day 360); nothing after it.
      expect(granted).toBe(12);
    });

    it("replaces a different tier from now", async () => {
      const now = new Date();
      await buy("o1", "pro", 30, now);
      const later = new Date(now.getTime() + 10 * DAY);
      await buy("o2", "max", 30, later);

      const membership = await getMembership(ORG, "kuanlan", later);
      expect(membership?.tier).toBe("max");
      expect(membership?.endsAt.getTime()).toBe(later.getTime() + 30 * DAY);
    });

    it("is gone once its period ends", async () => {
      const now = new Date();
      await buy("o1", "pro", 30, now);
      expect(await getMembership(ORG, "kuanlan", new Date(now.getTime() + 31 * DAY))).toBeNull();
    });
  });
});
