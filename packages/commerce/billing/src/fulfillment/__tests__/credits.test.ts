import { beforeEach, describe, expect, it, vi } from "vitest";

const { addCreditsMock, deductCreditsMock, applyMock, revokeMock } = vi.hoisted(() => ({
  addCreditsMock: vi.fn(),
  deductCreditsMock: vi.fn(),
  applyMock: vi.fn(),
  revokeMock: vi.fn(),
}));

vi.mock("../../memberships/index.js", () => ({
  applyMembershipPurchase: applyMock,
  revokeMembershipPurchase: revokeMock,
}));

vi.mock("../../credits/service.js", () => ({
  addCredits: addCreditsMock,
  deductCredits: deductCreditsMock,
}));

import { BillingError } from "../../types";
import { getFulfillment } from "../index";

const ctx = {
  orderId: "order_1",
  organizationId: "org_1",
  product: "kuanlan",
  params: { credits: 10_000 },
  amountMinor: 6800,
  currency: "CNY",
};

describe("credits fulfillment", () => {
  beforeEach(() => {
    addCreditsMock.mockReset();
    deductCreditsMock.mockReset();
  });

  it("grants the offer's credits with the order id as the ledger key", async () => {
    await getFulfillment("credits").fulfill(ctx);

    expect(addCreditsMock).toHaveBeenCalledWith(
      expect.objectContaining({
        organizationId: "org_1",
        product: "kuanlan",
        amount: 10_000,
        type: "PURCHASE",
        relatedId: "order_1",
      }),
    );
  });

  it("refuses a spec without a positive integer credit count", async () => {
    await expect(
      getFulfillment("credits").fulfill({ ...ctx, params: { credits: "lots" } }),
    ).rejects.toMatchObject({ code: "FULFILLMENT_INVALID_PARAMS" });
    expect(addCreditsMock).not.toHaveBeenCalled();
  });

  it("takes back the refunded share, keyed on the refund id", async () => {
    const result = await getFulfillment("credits").revoke?.({
      ...ctx,
      refundId: "r1",
      ratio: 0.5,
    });

    expect(deductCreditsMock).toHaveBeenCalledWith(
      expect.objectContaining({
        organizationId: "org_1",
        product: "kuanlan",
        amount: 5_000,
        relatedId: "refund:r1",
      }),
    );
    expect(result).toEqual({ revoked: true });
  });

  it("reports credits already spent instead of failing the refund", async () => {
    deductCreditsMock.mockRejectedValue(
      new BillingError("Insufficient credits", "INSUFFICIENT_CREDITS", 402),
    );

    const result = await getFulfillment("credits").revoke?.({ ...ctx, refundId: "r1", ratio: 1 });

    expect(result).toEqual({ revoked: false, reason: "credits_already_spent" });
  });

  it("names the missing handler when an offer points at an unregistered type", () => {
    expect(() => getFulfillment("seat_licence")).toThrow(/seat_licence/);
  });
});

describe("balance fulfillment", () => {
  const topUp = {
    orderId: "order_2",
    organizationId: "org_1",
    product: "router",
    params: { unitsPerMajor: { USD: 1, CNY: 0.1389 } },
    amountMinor: 5000,
    currency: "USD",
  };

  beforeEach(() => {
    addCreditsMock.mockReset();
    deductCreditsMock.mockReset();
  });

  it("tops up the product's balance with what was paid, in its unit", async () => {
    await getFulfillment("balance").fulfill(topUp);
    await getFulfillment("balance").fulfill({ ...topUp, orderId: "order_3", currency: "CNY" });

    expect(addCreditsMock).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ product: "router", amount: 50, relatedId: "order_2" }),
    );
    // ¥50 at 0.1389 dollars per yuan, floored to the ledger's four places.
    expect(addCreditsMock).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ product: "router", amount: 6.945, relatedId: "order_3" }),
    );
  });

  it("refuses a currency the offer has no rate for", async () => {
    await expect(
      getFulfillment("balance").fulfill({
        ...topUp,
        params: { unitsPerMajor: { USD: 1 } },
        currency: "CNY",
      }),
    ).rejects.toMatchObject({ code: "FULFILLMENT_INVALID_PARAMS" });
  });

  it("takes back the refunded share of the balance", async () => {
    const result = await getFulfillment("balance").revoke?.({
      ...topUp,
      refundId: "r9",
      ratio: 0.5,
    });
    expect(deductCreditsMock).toHaveBeenCalledWith(
      expect.objectContaining({ product: "router", amount: 25, relatedId: "refund:r9" }),
    );
    expect(result).toEqual({ revoked: true });
  });
});

describe("credit packs that expire", () => {
  it("grants a purchase lot that expires after params.expiresInDays", async () => {
    addCreditsMock.mockReset();
    const before = Date.now();
    await getFulfillment("credits").fulfill({
      ...ctx,
      params: { credits: 1000, expiresInDays: 730 },
    });
    const input = addCreditsMock.mock.calls[0]?.[0];
    expect(input.lot.source).toBe("PURCHASE");
    const days = (input.lot.expiresAt.getTime() - before) / 86_400_000;
    expect(Math.round(days)).toBe(730);
  });
});

describe("membership fulfillment", () => {
  const order = {
    orderId: "order_m",
    organizationId: "org_1",
    product: "kuanlan",
    params: { tier: "pro", days: 30, monthlyCredits: 3200 },
    amountMinor: 7900,
    currency: "CNY",
  };

  beforeEach(() => {
    applyMock.mockReset();
    revokeMock.mockReset();
    deductCreditsMock.mockReset();
  });

  it("applies the tier, the period and the monthly credits the offer locked", async () => {
    await getFulfillment("membership").fulfill(order);
    expect(applyMock).toHaveBeenCalledWith({
      orderId: "order_m",
      organizationId: "org_1",
      product: "kuanlan",
      tier: "pro",
      days: 30,
      monthlyCredits: 3200,
    });
  });

  it("refuses a spec without a tier or a period", async () => {
    await expect(
      getFulfillment("membership").fulfill({ ...order, params: { tier: "pro" } }),
    ).rejects.toMatchObject({ code: "FULFILLMENT_INVALID_PARAMS" });
    expect(applyMock).not.toHaveBeenCalled();
  });

  it("on refund shortens the period and takes back the refunded share of its credits", async () => {
    revokeMock.mockResolvedValue(true);
    const result = await getFulfillment("membership").revoke?.({
      ...order,
      refundId: "r1",
      ratio: 1,
    });
    expect(revokeMock).toHaveBeenCalledWith(
      expect.objectContaining({ orderId: "order_m", days: 30, ratio: 1 }),
    );
    expect(deductCreditsMock).toHaveBeenCalledWith(
      expect.objectContaining({ product: "kuanlan", amount: 3200, relatedId: "refund:r1" }),
    );
    expect(result).toEqual({ revoked: true });
  });
});
