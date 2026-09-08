import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * `@nebutra/billing` is mocked at the package boundary: it owns the ledger
 * semantics (atomic deduct, 402 on shortfall) and tests those itself. What is
 * under test here is 观澜's use of it — reserve before the model, refund once,
 * welcome once.
 */
const billing = vi.hoisted(() => ({
  configureBillingTenantDb: vi.fn(),
  deductCredits: vi.fn(),
  refundCredits: vi.fn(),
  addBonusCredits: vi.fn(),
  getCreditBalance: vi.fn(),
  getCreditTransactions: vi.fn(),
  getCreditAllowanceForPlan: vi.fn(() => ({ plan: "FREE", includedMonthly: 1500 })),
}));

vi.mock("@nebutra/billing", () => billing);
vi.mock("@nebutra/db", () => ({ getTenantDb: vi.fn() }));

describe("shoot credits", () => {
  const previous = { ...process.env };

  beforeEach(() => {
    for (const fn of Object.values(billing)) fn.mockClear?.();
    delete process.env.KUANLAN_SHOOT_PRICE_CREDITS;
  });

  afterEach(() => {
    process.env = { ...previous };
  });

  it("wires the tenant-scoped client into billing once, at import", async () => {
    await import("./credits");
    expect(billing.configureBillingTenantDb).toHaveBeenCalledTimes(1);
  });

  it("reserves the price against the Task id before anything is generated", async () => {
    billing.deductCredits.mockResolvedValue({ id: "tx1", balanceAfter: 1400 });
    const { reserveShootCredits } = await import("./credits");

    const r = await reserveShootCredits("t1", "task1");

    expect(r).toEqual({ transactionId: "tx1", balanceAfter: 1400 });
    expect(billing.deductCredits).toHaveBeenCalledWith(
      expect.objectContaining({ organizationId: "t1", amount: 100, relatedId: "task1" }),
    );
  });

  it("turns a ledger shortfall into a typed error carrying balance and price", async () => {
    billing.deductCredits.mockRejectedValue({ code: "INSUFFICIENT_CREDITS" });
    billing.getCreditBalance.mockResolvedValue({ balance: 40 });
    const { reserveShootCredits } = await import("./credits");

    await expect(reserveShootCredits("t1", "task1")).rejects.toMatchObject({
      name: "InsufficientCreditsError",
      balance: 40,
      price: 100,
    });
  });

  it("lets any other billing failure through untouched", async () => {
    billing.deductCredits.mockRejectedValue(new Error("boom"));
    const { reserveShootCredits } = await import("./credits");
    await expect(reserveShootCredits("t1", "task1")).rejects.toThrow("boom");
  });

  it("honours a tuned price and falls back past an unusable one", async () => {
    const { shootPriceCredits } = await import("./credits");
    process.env.KUANLAN_SHOOT_PRICE_CREDITS = "250";
    expect(shootPriceCredits()).toBe(250);
    process.env.KUANLAN_SHOOT_PRICE_CREDITS = "0";
    expect(shootPriceCredits()).toBe(100);
    process.env.KUANLAN_SHOOT_PRICE_CREDITS = "many";
    expect(shootPriceCredits()).toBe(100);
  });

  it("refunds a failed shoot exactly once", async () => {
    billing.getCreditTransactions.mockResolvedValueOnce([]);
    billing.refundCredits.mockResolvedValue({ balanceAfter: 1500 });
    const { refundShootCredits } = await import("./credits");

    const first = await refundShootCredits("t1", "task1", "router timed out");
    expect(first).toEqual({ refunded: true, balanceAfter: 1500 });
    expect(billing.refundCredits).toHaveBeenCalledWith(
      expect.objectContaining({ organizationId: "t1", amount: 100, relatedId: "task1" }),
    );

    // Second attempt: the ledger already holds a REFUND for this Task.
    billing.getCreditTransactions.mockResolvedValueOnce([
      { type: "REFUND", relatedId: "task1", balanceAfter: 1500 },
    ]);
    const second = await refundShootCredits("t1", "task1", "retry of the failure path");
    expect(second).toEqual({ refunded: false, balanceAfter: 1500 });
    expect(billing.refundCredits).toHaveBeenCalledTimes(1);
  });

  it("asks the ledger for REFUND rows by type rather than paging through everything", async () => {
    billing.getCreditTransactions.mockResolvedValueOnce([]);
    billing.refundCredits.mockResolvedValue({ balanceAfter: 1 });
    const { refundShootCredits } = await import("./credits");
    await refundShootCredits("t1", "task9", "x");
    expect(billing.getCreditTransactions).toHaveBeenCalledWith(
      "t1",
      expect.objectContaining({ type: "REFUND" }),
    );
  });

  it("grants the FREE allowance once, and never again", async () => {
    billing.getCreditTransactions.mockResolvedValueOnce([]);
    billing.addBonusCredits.mockResolvedValue({});
    const { ensureWelcomeCredits, WELCOME_GRANT_MARKER } = await import("./credits");

    expect(await ensureWelcomeCredits("t1")).toEqual({ granted: true });
    expect(billing.addBonusCredits).toHaveBeenCalledWith(
      expect.objectContaining({ organizationId: "t1", amount: 1500, reason: WELCOME_GRANT_MARKER }),
    );

    // The marker travels as the row's description — the only field the API keeps.
    billing.getCreditTransactions.mockResolvedValueOnce([
      { type: "BONUS", description: WELCOME_GRANT_MARKER },
    ]);
    expect(await ensureWelcomeCredits("t1")).toEqual({ granted: false });
    expect(billing.addBonusCredits).toHaveBeenCalledTimes(1);
  });
});
