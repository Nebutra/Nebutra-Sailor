import { beforeEach, describe, expect, it, vi } from "vitest";

const { addCreditsMock, deductCreditsMock } = vi.hoisted(() => ({
  addCreditsMock: vi.fn(),
  deductCreditsMock: vi.fn(),
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
