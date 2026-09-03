import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Mock the chinapay module BEFORE importing the provider under test — it is
// loaded via a dynamic `await import(...)` inside createCreditPurchase, and
// Vitest intercepts by resolved path regardless of static vs. dynamic import.
vi.mock("../../chinapay/index.js", () => ({
  createChinaPayOrder: vi.fn(async (input: { tradeOrderId: string }) => ({
    payUrl: "weixin://wxpay/bizpayurl?pr=mock",
    tradeOrderId: input.tradeOrderId,
  })),
}));

import { createChinaPayOrder } from "../../chinapay/index";
import { ChinaPayCheckoutProvider } from "../chinapay";
import type { CreditPurchaseInput } from "../types";

const mockedCreateOrder = vi.mocked(createChinaPayOrder);

const baseInput: CreditPurchaseInput = {
  organizationId: "org_123",
  creditAmount: 1000,
  amount: 9.9,
  currency: "CNY",
  successUrl: "https://app.example.com/success",
  cancelUrl: "https://app.example.com/cancel",
};

describe("ChinaPayCheckoutProvider", () => {
  const originalMethod = process.env.CHINAPAY_METHOD;

  beforeEach(() => {
    mockedCreateOrder.mockClear();
  });

  afterEach(() => {
    if (originalMethod === undefined) delete process.env.CHINAPAY_METHOD;
    else process.env.CHINAPAY_METHOD = originalMethod;
  });

  it("has name 'chinapay'", () => {
    expect(new ChinaPayCheckoutProvider().name).toBe("chinapay");
  });

  it("defaults to alipay when CHINAPAY_METHOD is unset", async () => {
    delete process.env.CHINAPAY_METHOD;
    await new ChinaPayCheckoutProvider().createCreditPurchase(baseInput);

    expect(mockedCreateOrder).toHaveBeenCalledWith(expect.objectContaining({ method: "alipay" }));
  });

  it("uses wechat when CHINAPAY_METHOD=wechat", async () => {
    process.env.CHINAPAY_METHOD = "wechat";
    await new ChinaPayCheckoutProvider().createCreditPurchase(baseInput);

    expect(mockedCreateOrder).toHaveBeenCalledWith(expect.objectContaining({ method: "wechat" }));
  });

  it("returns the mocked payUrl as the session url and tradeOrderId as sessionId", async () => {
    const session = await new ChinaPayCheckoutProvider().createCreditPurchase(baseInput);

    expect(session.provider).toBe("chinapay");
    expect(session.url).toBe("weixin://wxpay/bizpayurl?pr=mock");
    expect(session.sessionId).toEqual(expect.stringContaining("credit_1000_org_123_"));
  });

  it("uses referenceId as the trade order id when provided", async () => {
    await new ChinaPayCheckoutProvider().createCreditPurchase({
      ...baseInput,
      referenceId: "ref_abc",
    });

    expect(mockedCreateOrder).toHaveBeenCalledWith(
      expect.objectContaining({ tradeOrderId: "ref_abc" }),
    );
  });

  it("encodes organizationId and creditAmount into a compact attach payload", async () => {
    await new ChinaPayCheckoutProvider().createCreditPurchase({
      ...baseInput,
      referenceId: "ref_abc",
    });

    const call = mockedCreateOrder.mock.calls[0]?.[0];
    expect(call?.attach).toBeDefined();
    const parsed = JSON.parse(call?.attach ?? "{}");
    expect(parsed).toEqual({ t: "credit_purchase", o: "org_123", c: "1000", r: "ref_abc" });
  });

  it("drops referenceId from attach when it would exceed 128 bytes, keeping org/amount", async () => {
    const longReferenceId = "r".repeat(150);
    await new ChinaPayCheckoutProvider().createCreditPurchase({
      ...baseInput,
      referenceId: longReferenceId,
    });

    const call = mockedCreateOrder.mock.calls[0]?.[0];
    expect(Buffer.byteLength(call?.attach ?? "", "utf8")).toBeLessThanOrEqual(128);
    const parsed = JSON.parse(call?.attach ?? "{}");
    expect(parsed.r).toBeUndefined();
    expect(parsed.o).toBe("org_123");
  });

  it("throws if the attach payload still exceeds 128 bytes without referenceId", async () => {
    const longOrgId = "o".repeat(200);
    await expect(
      new ChinaPayCheckoutProvider().createCreditPurchase({
        ...baseInput,
        organizationId: longOrgId,
      }),
    ).rejects.toThrow(/too large/);
    expect(mockedCreateOrder).not.toHaveBeenCalled();
  });

  it("passes the amount formatted to two decimal places as totalFee", async () => {
    await new ChinaPayCheckoutProvider().createCreditPurchase({ ...baseInput, amount: 9.9 });

    expect(mockedCreateOrder).toHaveBeenCalledWith(expect.objectContaining({ totalFee: "9.90" }));
  });
});
