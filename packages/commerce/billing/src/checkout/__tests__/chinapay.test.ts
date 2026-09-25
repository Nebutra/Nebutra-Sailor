import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Mock the chinapay module BEFORE importing the provider under test — it is
// loaded via a dynamic `await import(...)` inside createPaymentSession, and
// Vitest intercepts by resolved path regardless of static vs. dynamic import.
vi.mock("../../chinapay/index.js", () => ({
  createChinaPayOrder: vi.fn(async () => ({
    kind: "qr",
    payUrl: "weixin://wxpay/bizpayurl?pr=mock",
    tradeOrderId: "order_1",
  })),
}));

import { createChinaPayOrder } from "../../chinapay/index";
import { ChinaPayCheckoutProvider } from "../chinapay";
import type { PaymentSessionInput } from "../types";

const mockedCreateOrder = vi.mocked(createChinaPayOrder);

const baseInput: PaymentSessionInput = {
  orderId: "order_1",
  organizationId: "org_123",
  title: "10,000 credits",
  amountMinor: 6800,
  currency: "CNY",
  successUrl: "https://app.example.com/success",
  cancelUrl: "https://app.example.com/cancel",
};

describe("ChinaPayCheckoutProvider", () => {
  beforeEach(() => {
    mockedCreateOrder.mockClear();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("has name 'chinapay'", () => {
    expect(new ChinaPayCheckoutProvider().name).toBe("chinapay");
  });

  it("uses the order id as the merchant order number and yuan as the amount", async () => {
    await new ChinaPayCheckoutProvider().createPaymentSession({ ...baseInput, method: "alipay" });

    expect(mockedCreateOrder).toHaveBeenCalledWith(
      expect.objectContaining({
        tradeOrderId: "order_1",
        totalFee: "68.00",
        title: "10,000 credits",
      }),
    );
  });

  it("carries no attach metadata — the order row holds it", async () => {
    await new ChinaPayCheckoutProvider().createPaymentSession({ ...baseInput, method: "alipay" });

    expect(mockedCreateOrder.mock.calls[0]?.[0]).not.toHaveProperty("attach");
  });

  it("uses the wallet the buyer chose", async () => {
    vi.stubEnv("ALIPAY_APP_ID", "2021000000000000");
    await new ChinaPayCheckoutProvider().createPaymentSession({ ...baseInput, method: "wechat" });

    expect(mockedCreateOrder).toHaveBeenCalledWith(expect.objectContaining({ method: "wechat" }));
  });

  it("falls back to whichever wallet is configured when the buyer did not choose", async () => {
    vi.stubEnv("ALIPAY_APP_ID", "");
    vi.stubEnv("WECHATPAY_MCHID", "1900000109");
    await new ChinaPayCheckoutProvider().createPaymentSession(baseInput);

    expect(mockedCreateOrder).toHaveBeenCalledWith(expect.objectContaining({ method: "wechat" }));
  });

  it("passes the H5 channel, buyer IP and return urls through", async () => {
    await new ChinaPayCheckoutProvider().createPaymentSession({
      ...baseInput,
      method: "alipay",
      channel: "h5",
      clientIp: "203.0.113.7",
    });

    expect(mockedCreateOrder).toHaveBeenCalledWith(
      expect.objectContaining({
        channel: "h5",
        clientIp: "203.0.113.7",
        returnUrl: baseInput.successUrl,
        quitUrl: baseInput.cancelUrl,
      }),
    );
  });

  it("returns what to do with the url", async () => {
    const session = await new ChinaPayCheckoutProvider().createPaymentSession(baseInput);

    expect(session).toEqual({
      kind: "qr",
      url: "weixin://wxpay/bizpayurl?pr=mock",
      provider: "chinapay",
    });
  });
});
