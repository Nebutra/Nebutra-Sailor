import { beforeEach, describe, expect, it, vi } from "vitest";
import { configureBillingTenantDb } from "../../db";
import { addCredits, deductCredits, getCreditAllowanceForPlan, getCreditBalance } from "../service";

const db = vi.hoisted(() => ({
  creditBalance: {
    create: vi.fn(),
    findUnique: vi.fn(),
  },
}));

const tenantDb = vi.hoisted(() => vi.fn(() => db));

describe("credits service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    configureBillingTenantDb((orgId) => tenantDb(orgId));
    db.creditBalance.create.mockReset();
    db.creditBalance.findUnique.mockReset();
    tenantDb.mockImplementation(() => db);
  });

  it("creates a zero balance row scoped by tenantId when the organization has no balance", async () => {
    db.creditBalance.findUnique.mockResolvedValueOnce(null);
    db.creditBalance.create.mockResolvedValueOnce({
      id: "bal_1",
      tenantId: "org_1",
      balance: 0,
      currency: "USD",
    });

    await expect(getCreditBalance("org_1")).resolves.toEqual({
      organizationId: "org_1",
      balance: 0,
      currency: "USD",
    });

    expect(db.creditBalance.findUnique).toHaveBeenCalledWith({
      where: { tenantId: "org_1" },
    });
    expect(db.creditBalance.create).toHaveBeenCalledWith({
      data: { tenantId: "org_1", balance: 0, currency: "USD" },
    });
  });

  it("uses tenantId in add/deduct write paths and records balanceAfter from the updated balance", async () => {
    const tx = {
      creditBalance: {
        findUnique: vi.fn(),
        upsert: vi.fn(),
        update: vi.fn(),
        updateMany: vi.fn(),
      },
      creditTransaction: {
        create: vi.fn(),
        findFirst: vi.fn(),
      },
    };
    type TransactionMock = typeof tx;
    const transactionalDb = {
      ...db,
      $transaction: vi.fn(async (callback: (tx: TransactionMock) => Promise<unknown>) =>
        callback(tx),
      ),
    };
    tenantDb.mockReturnValueOnce(transactionalDb as never);

    tx.creditBalance.upsert.mockResolvedValueOnce({ id: "bal_1", tenantId: "org_1" });
    tx.creditBalance.update.mockResolvedValueOnce({
      id: "bal_1",
      tenantId: "org_1",
      balance: 150,
      currency: "USD",
    });
    tx.creditTransaction.create.mockResolvedValueOnce({
      id: "tx_add",
      type: "BONUS",
      amount: 50,
      balanceAfter: 150,
      description: "Bonus",
      expiresAt: null,
      relatedId: "bonus_1",
      metadata: {},
      createdAt: new Date("2026-06-05T00:00:00.000Z"),
    });

    await expect(
      addCredits({
        organizationId: "org_1",
        amount: 50,
        type: "BONUS",
        description: "Bonus",
        relatedId: "bonus_1",
      }),
    ).resolves.toMatchObject({
      id: "tx_add",
      organizationId: "org_1",
      amount: 50,
      balanceAfter: 150,
    });

    expect(tx.creditBalance.upsert).toHaveBeenCalledWith({
      where: { tenantId: "org_1" },
      create: { tenantId: "org_1", balance: 0, currency: "USD" },
      update: {},
    });
    expect(tx.creditTransaction.findFirst).toHaveBeenCalledWith({
      where: { creditBalanceId: "bal_1", relatedId: "bonus_1", type: "BONUS" },
    });
    expect(tx.creditBalance.update).toHaveBeenCalledWith({
      where: { tenantId: "org_1" },
      data: { balance: { increment: 50 } },
    });

    tenantDb.mockReturnValueOnce(transactionalDb as never);
    tx.creditBalance.findUnique.mockResolvedValueOnce({
      id: "bal_1",
      tenantId: "org_1",
      balance: 150,
      currency: "USD",
    });
    tx.creditBalance.updateMany.mockResolvedValueOnce({ count: 1 });
    tx.creditBalance.findUnique.mockResolvedValueOnce({
      id: "bal_1",
      tenantId: "org_1",
      balance: 125,
      currency: "USD",
    });
    tx.creditTransaction.create.mockResolvedValueOnce({
      id: "tx_usage",
      type: "USAGE",
      amount: -25,
      balanceAfter: 125,
      description: "Agent run",
      expiresAt: null,
      relatedId: "run_1",
      metadata: {},
      createdAt: new Date("2026-06-05T00:00:00.000Z"),
    });

    await expect(
      deductCredits({
        organizationId: "org_1",
        amount: 25,
        description: "Agent run",
        relatedId: "run_1",
      }),
    ).resolves.toMatchObject({
      id: "tx_usage",
      amount: -25,
      balanceAfter: 125,
    });

    expect(tx.creditBalance.updateMany).toHaveBeenCalledWith({
      where: { tenantId: "org_1", balance: { gte: 25 } },
      data: { balance: { decrement: 25 } },
    });
  });

  it("does not deduct credits twice when a usage relatedId is replayed", async () => {
    const existingUsage = {
      id: "tx_usage",
      type: "USAGE",
      amount: -25,
      balanceAfter: 125,
      description: "Agent run",
      expiresAt: null,
      relatedId: "run_1",
      metadata: {},
      createdAt: new Date("2026-06-05T00:00:00.000Z"),
    };
    const tx = {
      creditBalance: {
        findUnique: vi.fn().mockResolvedValue({
          id: "bal_1",
          tenantId: "org_1",
          balance: 125,
          currency: "USD",
        }),
        updateMany: vi.fn(),
      },
      creditTransaction: {
        create: vi.fn(),
        findFirst: vi.fn().mockResolvedValue(existingUsage),
      },
    };
    type TransactionMock = typeof tx;
    const transactionalDb = {
      ...db,
      $transaction: vi.fn(async (callback: (tx: TransactionMock) => Promise<unknown>) =>
        callback(tx),
      ),
    };
    tenantDb.mockReturnValueOnce(transactionalDb as never);

    await expect(
      deductCredits({
        organizationId: "org_1",
        amount: 25,
        description: "Agent run",
        relatedId: "run_1",
      }),
    ).resolves.toMatchObject({
      id: "tx_usage",
      amount: -25,
      balanceAfter: 125,
      relatedId: "run_1",
    });

    expect(tx.creditTransaction.findFirst).toHaveBeenCalledWith({
      where: { creditBalanceId: "bal_1", relatedId: "run_1", type: "USAGE" },
    });
    expect(tx.creditBalance.updateMany).not.toHaveBeenCalled();
    expect(tx.creditTransaction.create).not.toHaveBeenCalled();
  });

  it("returns a plan-scoped daily credit allowance for app consumption", () => {
    expect(getCreditAllowanceForPlan("FREE")).toEqual({
      plan: "FREE",
      dailyRefresh: 300,
      includedMonthly: 1500,
      refreshTime: "08:00 UTC",
    });
    expect(getCreditAllowanceForPlan("PRO").dailyRefresh).toBe(1000);
    expect(getCreditAllowanceForPlan("ENTERPRISE").includedMonthly).toBe(-1);
  });
});
