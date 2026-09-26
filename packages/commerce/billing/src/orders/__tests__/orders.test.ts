import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const {
  createPaymentSessionMock,
  queryChinaPayOrderMock,
  refundChinaPayOrderMock,
  getCreemCheckoutMock,
  refundCreemOrderMock,
} = vi.hoisted(() => ({
  createPaymentSessionMock: vi.fn(),
  queryChinaPayOrderMock: vi.fn(),
  refundChinaPayOrderMock: vi.fn(),
  getCreemCheckoutMock: vi.fn(),
  refundCreemOrderMock: vi.fn(),
}));

vi.mock("../../checkout/factory.js", () => ({
  getCheckout: vi.fn(async ({ provider }: { provider: string }) => ({
    name: provider,
    createPaymentSession: createPaymentSessionMock,
  })),
  isChinaPayConfigured: (method: string) =>
    method === "alipay" ? Boolean(process.env.ALIPAY_APP_ID) : Boolean(process.env.WECHATPAY_MCHID),
}));

vi.mock("../../creem/index.js", () => ({
  getCreemCheckout: getCreemCheckoutMock,
  refundCreemOrder: refundCreemOrderMock,
}));

vi.mock("../../chinapay/index.js", () => ({
  queryChinaPayOrder: queryChinaPayOrderMock,
  refundChinaPayOrder: refundChinaPayOrderMock,
}));

import { registerFulfillment } from "../../fulfillment/index";
import { configureOffers, DEFAULT_OFFERS } from "../../offers/index";
import {
  configurePaymentOrderStore,
  createPaymentOrder,
  type PaymentOrderRecord,
  type PaymentOrderStore,
  reconcilePaymentOrders,
  refundPaymentOrder,
  settlePaymentOrder,
} from "../index";

// ── In-memory store with the repository's conditional-update semantics ──────

function memoryStore() {
  const rows = new Map<string, PaymentOrderRecord>();
  let seq = 0;
  const store: PaymentOrderStore = {
    async create(data) {
      seq += 1;
      const row: PaymentOrderRecord = {
        id: `order_${seq}`,
        ...data,
        providerRef: null,
        status: "PENDING",
        paidMinor: null,
        refundedMinor: 0,
        fulfilledAt: null,
        metadata: {},
        createdAt: new Date(),
      };
      rows.set(row.id, row);
      return { ...row };
    },
    async findById(id) {
      const row = rows.get(id);
      return row ? { ...row } : null;
    },
    async setProviderRef(id, providerRef) {
      const row = rows.get(id);
      if (row) row.providerRef = providerRef;
    },
    async markPaid(id, data) {
      const row = rows.get(id);
      if (!row || (row.status !== "PENDING" && row.status !== "EXPIRED")) return false;
      row.status = "PAID";
      row.paidMinor = data.paidMinor;
      if (data.providerRef) row.providerRef = data.providerRef;
      return true;
    },
    async markFulfilled(id) {
      const row = rows.get(id);
      if (!row || row.fulfilledAt) return false;
      row.fulfilledAt = new Date();
      return true;
    },
    async markExpired(id) {
      const row = rows.get(id);
      if (!row || row.status !== "PENDING") return false;
      row.status = "EXPIRED";
      return true;
    },
    async recordRefund(id, data) {
      const row = rows.get(id);
      if (!row || row.refundedMinor !== data.previousRefundedMinor) return false;
      row.refundedMinor = data.refundedMinor;
      row.status = data.fullyRefunded ? "REFUNDED" : "PARTIALLY_REFUNDED";
      return true;
    },
    async listPendingCreatedBefore(before, limit) {
      return [...rows.values()]
        .filter((r) => r.status === "PENDING" && r.createdAt < before)
        .slice(0, limit)
        .map((r) => ({ ...r }));
    },
    async listPaidUnfulfilled(limit) {
      return [...rows.values()]
        .filter((r) => r.status === "PAID" && !r.fulfilledAt)
        .slice(0, limit)
        .map((r) => ({ ...r }));
    },
  };
  return { store, rows };
}

// ── A fulfillment that records what it was asked to do ───────────────────────

const fulfilled: string[] = [];
const revoked: Array<{ orderId: string; ratio: number; refundId: string }> = [];
let failNextFulfill = false;

registerFulfillment("test_grant", {
  async fulfill(ctx) {
    if (failNextFulfill) {
      failNextFulfill = false;
      throw new Error("downstream unavailable");
    }
    fulfilled.push(ctx.orderId);
  },
  async revoke(ctx) {
    revoked.push({ orderId: ctx.orderId, ratio: ctx.ratio, refundId: ctx.refundId });
    return { revoked: true };
  },
});

const OFFER = {
  id: "grant_pro",
  name: "Pro grant",
  prices: { USD: 10, CNY: 68 },
  fulfillment: { type: "test_grant", params: { tier: "pro" } },
};

let rows: Map<string, PaymentOrderRecord>;

beforeEach(() => {
  const memory = memoryStore();
  rows = memory.rows;
  configurePaymentOrderStore(memory.store);
  configureOffers([OFFER]);
  fulfilled.length = 0;
  revoked.length = 0;
  failNextFulfill = false;
  createPaymentSessionMock.mockReset();
  queryChinaPayOrderMock.mockReset();
  refundChinaPayOrderMock.mockReset();
  createPaymentSessionMock.mockResolvedValue({
    kind: "qr",
    url: "https://qr.alipay.com/x",
    provider: "chinapay",
  });
  vi.stubEnv("ALIPAY_APP_ID", "2021000000000000");
  vi.stubEnv("WECHATPAY_MCHID", "");
  vi.stubEnv("CREEM_API_KEY", "");
  vi.stubEnv("CREEM_PRODUCT_ID", "");
  getCreemCheckoutMock.mockReset();
  refundCreemOrderMock.mockReset();
});

afterEach(() => {
  vi.unstubAllEnvs();
  configureOffers(DEFAULT_OFFERS);
});

function buy(method: "card" | "alipay" | "wechat" = "alipay") {
  return createPaymentOrder({
    organizationId: "org_1",
    offerId: "grant_pro",
    method,
    successUrl: "https://app.example.com/ok",
    cancelUrl: "https://app.example.com/cancel",
  });
}

describe("createPaymentOrder", () => {
  it("locks the catalog price for the method's currency on the order", async () => {
    const created = await buy("alipay");

    expect(created).toMatchObject({ amountMinor: 6800, currency: "CNY" });
    const row = rows.get(created.orderId);
    expect(row).toMatchObject({
      tenantId: "org_1",
      offerId: "grant_pro",
      amountMinor: 6800,
      currency: "CNY",
      provider: "chinapay",
      method: "alipay",
      status: "PENDING",
      fulfillment: OFFER.fulfillment,
    });
    expect(createPaymentSessionMock).toHaveBeenCalledWith(
      expect.objectContaining({ orderId: created.orderId, amountMinor: 6800, method: "alipay" }),
    );
  });

  it("sends a card through Creem in USD and stores its checkout id", async () => {
    vi.stubEnv("CREEM_API_KEY", "creem_key");
    vi.stubEnv("CREEM_PRODUCT_ID", "prod_onetime");
    createPaymentSessionMock.mockResolvedValue({
      kind: "redirect",
      url: "https://checkout.creem.io/ch_1",
      providerRef: "ch_1",
      provider: "creem",
    });

    const created = await buy("card");

    expect(rows.get(created.orderId)).toMatchObject({
      provider: "creem",
      providerRef: "ch_1",
      amountMinor: 1000,
      currency: "USD",
    });
  });

  it("refuses a method with no credentials behind it", async () => {
    await expect(buy("wechat")).rejects.toMatchObject({ code: "PAYMENT_METHOD_UNAVAILABLE" });
    expect(rows.size).toBe(0);
  });

  it("refuses an unknown offer", async () => {
    await expect(
      createPaymentOrder({
        organizationId: "org_1",
        offerId: "free_lunch",
        method: "alipay",
        successUrl: "https://app.example.com/ok",
        cancelUrl: "https://app.example.com/cancel",
      }),
    ).rejects.toMatchObject({ code: "OFFER_NOT_FOUND" });
  });

  it("refuses an offer that has no price in the method's currency", async () => {
    configureOffers([{ ...OFFER, prices: { USD: 10 } }]);
    await expect(buy("alipay")).rejects.toMatchObject({ code: "OFFER_CURRENCY_UNAVAILABLE" });
  });
});

describe("settlePaymentOrder", () => {
  it("marks the order paid and fulfills it once, however often it is reported", async () => {
    const { orderId } = await buy();

    const first = await settlePaymentOrder({ orderId, paidMinor: 6800, currency: "CNY" });
    const second = await settlePaymentOrder({ orderId, paidMinor: 6800, currency: "CNY" });

    expect([first, second]).toEqual(["settled", "already_settled"]);
    expect(fulfilled).toEqual([orderId]);
    expect(rows.get(orderId)).toMatchObject({ status: "PAID", paidMinor: 6800 });
    expect(rows.get(orderId)?.fulfilledAt).toBeInstanceOf(Date);
  });

  it("refuses a payment that does not match the locked price", async () => {
    const { orderId } = await buy();

    await expect(
      settlePaymentOrder({ orderId, paidMinor: 1, currency: "CNY" }),
    ).rejects.toMatchObject({ code: "PAYMENT_AMOUNT_MISMATCH" });
    expect(rows.get(orderId)?.status).toBe("PENDING");
    expect(fulfilled).toEqual([]);
  });

  it("refuses a payment in another currency", async () => {
    const { orderId } = await buy();

    await expect(
      settlePaymentOrder({ orderId, paidMinor: 6800, currency: "USD" }),
    ).rejects.toMatchObject({ code: "PAYMENT_AMOUNT_MISMATCH" });
  });

  it("reports an unknown order instead of throwing", async () => {
    expect(await settlePaymentOrder({ orderId: "nope", paidMinor: 1, currency: "CNY" })).toBe(
      "not_found",
    );
  });

  it("honours a payment that arrives after the order expired", async () => {
    const { orderId } = await buy();
    const row = rows.get(orderId);
    if (row) row.status = "EXPIRED";

    expect(await settlePaymentOrder({ orderId, paidMinor: 6800, currency: "CNY" })).toBe("settled");
    expect(fulfilled).toEqual([orderId]);
  });
});

describe("reconcilePaymentOrders", () => {
  const later = () => new Date(Date.now() + 5 * 60 * 1000);

  it("settles a wallet order whose notification never arrived", async () => {
    const { orderId } = await buy();
    queryChinaPayOrderMock.mockResolvedValue({ status: "paid", paidFen: 6800, providerRef: "T1" });

    const result = await reconcilePaymentOrders({ now: later() });

    expect(queryChinaPayOrderMock).toHaveBeenCalledWith(orderId, "alipay");
    expect(result).toMatchObject({ checked: 1, settled: 1 });
    expect(rows.get(orderId)).toMatchObject({ status: "PAID", providerRef: "T1" });
    expect(fulfilled).toEqual([orderId]);
  });

  it("leaves a fresh order alone — its notification may still be on the way", async () => {
    await buy();
    const result = await reconcilePaymentOrders({ now: new Date() });
    expect(result.checked).toBe(0);
    expect(queryChinaPayOrderMock).not.toHaveBeenCalled();
  });

  it("expires an unpaid order past its deadline", async () => {
    const { orderId } = await buy();
    queryChinaPayOrderMock.mockResolvedValue({ status: "pending", paidFen: 0 });

    const result = await reconcilePaymentOrders({
      now: new Date(Date.now() + 60 * 60 * 1000),
    });

    expect(result.expired).toBe(1);
    expect(rows.get(orderId)?.status).toBe("EXPIRED");
  });

  it("retries fulfillment for an order paid but never handed over", async () => {
    const { orderId } = await buy();
    failNextFulfill = true;
    await expect(settlePaymentOrder({ orderId, paidMinor: 6800, currency: "CNY" })).rejects.toThrow(
      "downstream unavailable",
    );
    expect(rows.get(orderId)).toMatchObject({ status: "PAID", fulfilledAt: null });

    const result = await reconcilePaymentOrders({ now: later() });

    expect(result.fulfilled).toBe(1);
    expect(fulfilled).toEqual([orderId]);
  });

  it("counts a failing query as an error and carries on", async () => {
    await buy();
    await buy();
    queryChinaPayOrderMock
      .mockRejectedValueOnce(new Error("timeout"))
      .mockResolvedValueOnce({ status: "paid", paidFen: 6800 });

    const result = await reconcilePaymentOrders({ now: later() });

    expect(result).toMatchObject({ checked: 2, errors: 1, settled: 1 });
  });
});

describe("refundPaymentOrder", () => {
  async function paidOrder() {
    const { orderId } = await buy();
    await settlePaymentOrder({ orderId, paidMinor: 6800, currency: "CNY" });
    return orderId;
  }

  it("refunds through the wallet, records it, and revokes a proportional share", async () => {
    const orderId = await paidOrder();
    refundChinaPayOrderMock.mockResolvedValue({ status: "succeeded" });

    const result = await refundPaymentOrder({ orderId, refundId: "r1", amountMinor: 3400 });

    expect(refundChinaPayOrderMock).toHaveBeenCalledWith(
      expect.objectContaining({
        tradeOrderId: orderId,
        refundId: "r1",
        method: "alipay",
        refundFee: "34.00",
        totalFee: "68.00",
      }),
    );
    expect(result).toMatchObject({ status: "succeeded", refundedMinor: 3400 });
    expect(rows.get(orderId)?.status).toBe("PARTIALLY_REFUNDED");
    expect(revoked).toEqual([{ orderId, ratio: 0.5, refundId: "r1" }]);
  });

  it("refunds the remainder by default and marks the order refunded", async () => {
    const orderId = await paidOrder();
    refundChinaPayOrderMock.mockResolvedValue({ status: "succeeded" });

    await refundPaymentOrder({ orderId, refundId: "r1", amountMinor: 1800 });
    const result = await refundPaymentOrder({ orderId, refundId: "r2" });

    expect(result.refundedMinor).toBe(6800);
    expect(rows.get(orderId)?.status).toBe("REFUNDED");
  });

  it("refuses to refund more than was paid", async () => {
    const orderId = await paidOrder();

    await expect(
      refundPaymentOrder({ orderId, refundId: "r1", amountMinor: 6801 }),
    ).rejects.toMatchObject({ code: "REFUND_AMOUNT_INVALID" });
    expect(refundChinaPayOrderMock).not.toHaveBeenCalled();
  });

  it("refuses an order that was never paid", async () => {
    const { orderId } = await buy();

    await expect(refundPaymentOrder({ orderId, refundId: "r1" })).rejects.toMatchObject({
      code: "ORDER_NOT_REFUNDABLE",
    });
  });

  it("records nothing and revokes nothing when the wallet refuses", async () => {
    const orderId = await paidOrder();
    refundChinaPayOrderMock.mockResolvedValue({ status: "failed" });

    const result = await refundPaymentOrder({ orderId, refundId: "r1" });

    expect(result).toMatchObject({ status: "failed", refundedMinor: 0 });
    expect(rows.get(orderId)?.status).toBe("PAID");
    expect(revoked).toEqual([]);
  });
});

describe("Creem orders", () => {
  beforeEach(() => {
    vi.stubEnv("CREEM_API_KEY", "creem_key");
    vi.stubEnv("CREEM_PRODUCT_ID", "prod_onetime");
    createPaymentSessionMock.mockResolvedValue({
      kind: "redirect",
      url: "https://checkout.creem.io/ch_1",
      providerRef: "ch_1",
      provider: "creem",
    });
  });

  it("reconciles a lost checkout.completed by asking Creem for the checkout", async () => {
    const { orderId } = await buy("card");
    getCreemCheckoutMock.mockResolvedValue({
      status: "completed",
      order: { id: "ord_1", amount: 1000, currency: "USD", status: "paid" },
    });

    const result = await reconcilePaymentOrders({ now: new Date(Date.now() + 5 * 60 * 1000) });

    expect(getCreemCheckoutMock).toHaveBeenCalledWith("ch_1");
    expect(result.settled).toBe(1);
    expect(rows.get(orderId)).toMatchObject({ status: "PAID", providerRef: "ord_1" });
  });

  it("refunds in full through Creem, by the Creem order", async () => {
    const { orderId } = await buy("card");
    await settlePaymentOrder({ orderId, paidMinor: 1000, currency: "USD", providerRef: "ord_1" });
    refundCreemOrderMock.mockResolvedValue({ status: "succeeded" });

    const result = await refundPaymentOrder({ orderId, refundId: "r1" });

    expect(refundCreemOrderMock).toHaveBeenCalledWith("ord_1");
    expect(result).toMatchObject({ status: "succeeded", refundedMinor: 1000 });
    expect(rows.get(orderId)?.status).toBe("REFUNDED");
  });

  it("refuses a partial refund before calling Creem, which only refunds in full", async () => {
    const { orderId } = await buy("card");
    await settlePaymentOrder({ orderId, paidMinor: 1000, currency: "USD", providerRef: "ord_1" });

    await expect(
      refundPaymentOrder({ orderId, refundId: "r1", amountMinor: 500 }),
    ).rejects.toMatchObject({ code: "REFUND_PARTIAL_UNSUPPORTED" });
    expect(refundCreemOrderMock).not.toHaveBeenCalled();
  });
});
