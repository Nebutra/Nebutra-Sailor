import { beforeEach, describe, expect, it, vi } from "vitest";

const { createPaymentOrderMock, getPaymentOrderMock, isPaymentMethodAvailableMock } = vi.hoisted(
  () => ({
    createPaymentOrderMock: vi.fn(),
    getPaymentOrderMock: vi.fn(),
    isPaymentMethodAvailableMock: vi.fn(),
  }),
);

vi.mock("@nebutra/logger", () => ({
  logger: {
    child: () => ({ debug: vi.fn(), error: vi.fn(), info: vi.fn(), warn: vi.fn() }),
    debug: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
  },
}));

vi.mock("../middlewares/tenantContext.js", () => ({
  requireAuth: async (c: { set: (k: string, v: unknown) => void }, next: () => Promise<void>) => {
    c.set("tenant", { organizationId: "org_1", userId: "user_1" });
    await next();
  },
  requireOrganization: async (_c: unknown, next: () => Promise<void>) => next(),
}));

vi.mock("../services/circuitBreaker.js", () => ({
  billingServiceBreaker: { call: <T>(fn: () => Promise<T>) => fn() },
  CircuitOpenError: class CircuitOpenError extends Error {},
}));

vi.mock("@nebutra/billing", async () => {
  const { BillingError } = await import("../../../../packages/commerce/billing/src/types.js");
  const offers = await import("../../../../packages/commerce/billing/src/offers/index.js");
  return {
    BillingError,
    listOffers: offers.listOffers,
    // Mirrors the real guard: only the product origin may be a return URL.
    assertProductReturnUrl: (value: string) => {
      if (new URL(value).origin !== "https://app.nebutra.com") {
        throw new BillingError("off origin", "CHECKOUT_RETURN_URL_FORBIDDEN", 400);
      }
      return value;
    },
    createPaymentOrder: (input: unknown) => createPaymentOrderMock(input),
    getPaymentOrder: (id: string) => getPaymentOrderMock(id),
    isPaymentMethodAvailable: (method: string) => isPaymentMethodAvailableMock(method),
  };
});

import { orderRoutes } from "../routes/billing/orders.js";

function postOrder(body: Record<string, unknown>, headers: Record<string, string> = {}) {
  return orderRoutes.request("/orders", {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: JSON.stringify({
      successUrl: "https://app.nebutra.com/billing/return",
      cancelUrl: "https://app.nebutra.com/billing",
      ...body,
    }),
  });
}

describe("GET /offers", () => {
  it("lists the catalog with a price per currency", async () => {
    const res = await orderRoutes.request("/offers");
    const body = (await res.json()) as { offers: Array<{ id: string; prices: object }> };

    expect(res.status).toBe(200);
    expect(body.offers[0]).toMatchObject({ id: "credits_10k", prices: { USD: 10, CNY: 68 } });
    expect(body.offers[0]).not.toHaveProperty("fulfillment");
  });

  it("lists only the payment methods that have credentials", async () => {
    isPaymentMethodAvailableMock.mockImplementation((m: string) => m === "alipay");

    const res = await orderRoutes.request("/offers/methods");

    expect(await res.json()).toEqual({ methods: [{ id: "alipay", currency: "CNY" }] });
  });
});

describe("POST /orders", () => {
  beforeEach(() => {
    createPaymentOrderMock.mockReset();
    createPaymentOrderMock.mockResolvedValue({
      orderId: "order_1",
      session: { kind: "qr", url: "https://qr.alipay.com/abc", provider: "chinapay" },
      amountMinor: 6800,
      currency: "CNY",
    });
  });

  it("creates an order from the offer id alone — a client price is ignored", async () => {
    const res = await postOrder({
      offerId: "credits_10k",
      method: "alipay",
      amount: 0.01,
      amountMinor: 1,
    });

    expect(res.status).toBe(200);
    const call = createPaymentOrderMock.mock.calls[0]?.[0];
    expect(call).toMatchObject({
      organizationId: "org_1",
      offerId: "credits_10k",
      method: "alipay",
    });
    expect(call).not.toHaveProperty("amount");
    expect(call).not.toHaveProperty("amountMinor");
    expect(await res.json()).toEqual({
      orderId: "order_1",
      kind: "qr",
      url: "https://qr.alipay.com/abc",
      amountMinor: 6800,
      currency: "CNY",
    });
  });

  it("passes the buyer IP through for WeChat H5", async () => {
    await postOrder(
      { offerId: "credits_10k", method: "wechat", channel: "h5" },
      { "x-forwarded-for": "203.0.113.7, 10.0.0.1" },
    );

    expect(createPaymentOrderMock.mock.calls[0]?.[0]).toMatchObject({
      channel: "h5",
      clientIp: "203.0.113.7",
    });
  });

  it("refuses a return URL off the product origin", async () => {
    const res = await postOrder({
      offerId: "credits_10k",
      method: "alipay",
      successUrl: "https://evil.example.com/phish",
    });

    expect(res.status).toBe(400);
    expect(createPaymentOrderMock).not.toHaveBeenCalled();
  });

  it("maps a catalog refusal to 400 with its code", async () => {
    const { BillingError } = await import("../../../../packages/commerce/billing/src/types.js");
    createPaymentOrderMock.mockRejectedValue(
      new BillingError("Payment method not available: wechat", "PAYMENT_METHOD_UNAVAILABLE", 400),
    );

    const res = await postOrder({ offerId: "credits_10k", method: "wechat" });

    expect(res.status).toBe(400);
    expect(await res.json()).toMatchObject({ code: "PAYMENT_METHOD_UNAVAILABLE" });
  });

  it("hides a provider failure behind a 500", async () => {
    createPaymentOrderMock.mockRejectedValue(new Error("upstream said no: secret detail"));

    const res = await postOrder({ offerId: "credits_10k", method: "alipay" });

    expect(res.status).toBe(500);
    expect(JSON.stringify(await res.json())).not.toContain("secret detail");
  });
});

describe("GET /orders/{id}", () => {
  const order = {
    id: "order_1",
    tenantId: "org_1",
    offerId: "credits_10k",
    status: "PAID",
    fulfilledAt: new Date("2026-09-25T00:00:00Z"),
    amountMinor: 6800,
    currency: "CNY",
    method: "alipay",
    createdAt: new Date("2026-09-25T00:00:00Z"),
  };

  it("returns the caller's own order", async () => {
    getPaymentOrderMock.mockResolvedValue(order);

    const res = await orderRoutes.request("/orders/order_1");

    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ id: "order_1", status: "PAID", fulfilled: true });
  });

  it("answers 404 for another organization's order", async () => {
    getPaymentOrderMock.mockResolvedValue({ ...order, tenantId: "org_2" });

    const res = await orderRoutes.request("/orders/order_1");

    expect(res.status).toBe(404);
  });
});
