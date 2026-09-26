import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const {
  createPaymentOrderMock,
  getPaymentOrderMock,
  isPaymentMethodAvailableMock,
  listPaymentOrdersMock,
} = vi.hoisted(() => ({
  createPaymentOrderMock: vi.fn(),
  getPaymentOrderMock: vi.fn(),
  isPaymentMethodAvailableMock: vi.fn(),
  listPaymentOrdersMock: vi.fn(),
}));

vi.mock("@nebutra/logger", () => ({
  logger: {
    child: () => ({ debug: vi.fn(), error: vi.fn(), info: vi.fn(), warn: vi.fn() }),
    debug: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
  },
}));

const tenantRole = vi.hoisted(() => ({ value: "org:admin" }));
const activeOrg = vi.hoisted(() => ({ value: "org_1" as string | undefined }));
const personal = vi.hoisted(() => ({ ensure: vi.fn(), find: vi.fn() }));

vi.mock("@nebutra/db", () => ({ getSystemDb: () => ({}) }));
vi.mock("@nebutra/repositories", () => ({
  PersonalTenantRepository: class {
    ensure = personal.ensure;
    find = personal.find;
  },
}));

vi.mock("../middlewares/tenantContext.js", () => ({
  requireAuth: async (c: { set: (k: string, v: unknown) => void }, next: () => Promise<void>) => {
    c.set("tenant", {
      organizationId: activeOrg.value,
      userId: "user_1",
      role: tenantRole.value,
    });
    await next();
  },
  requireOrganization: async (_c: unknown, next: () => Promise<void>) => next(),
  // Mirrors the real guard: owner / admin / billing_admin may spend.
  requireBillingManage: async (
    c: { get: (k: string) => { role?: string }; json: (b: unknown, s: number) => Response },
    next: () => Promise<void>,
  ) => {
    const role = (c.get("tenant")?.role ?? "").replace(/^org:/, "");
    if (!["owner", "admin", "billing_admin"].includes(role)) {
      return c.json({ error: "Forbidden" }, 403);
    }
    await next();
  },
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
    getOffer: offers.getOffer,
    offerAccount: offers.offerAccount,
    listPaymentOrders: (org: string, limit: number) => listPaymentOrdersMock(org, limit),
    // Mirrors the real guard: only the product origin may be a return URL.
    assertProductReturnUrl: (value: string) => {
      if (new URL(value).origin !== "https://app.example.com") {
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
      successUrl: "https://app.example.com/billing/return",
      cancelUrl: "https://app.example.com/billing",
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
    activeOrg.value = "org_1";
    tenantRole.value = "org:admin";
    personal.ensure.mockReset();
    personal.ensure.mockResolvedValue("tenant_me");
    createPaymentOrderMock.mockReset();
    createPaymentOrderMock.mockResolvedValue({
      orderId: "order_1",
      session: { kind: "qr", url: "https://qr.alipay.com/abc", provider: "chinapay" },
      amountMinor: 6800,
      currency: "CNY",
    });
  });

  it("never forwards a client price; a proposed amount goes to the catalog to judge", async () => {
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
    // `amount` is how a buyer names a top-up; a fixed-price offer ignores it,
    // and priceOffer refuses one outside a custom offer's range.
    expect(call).toMatchObject({ amount: 0.01 });
    expect(call).not.toHaveProperty("amountMinor");
    expect(await res.json()).toEqual({
      orderId: "order_1",
      kind: "qr",
      url: "https://qr.alipay.com/abc",
      amountMinor: 6800,
      currency: "CNY",
    });
  });

  it("refuses a member who cannot manage billing", async () => {
    tenantRole.value = "org:member";
    try {
      const res = await postOrder({ offerId: "credits_10k", method: "alipay" });
      expect(res.status).toBe(403);
      expect(createPaymentOrderMock).not.toHaveBeenCalled();
    } finally {
      tenantRole.value = "org:admin";
    }
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

describe("whose account pays", () => {
  const offersModule = () => import("../../../../packages/commerce/billing/src/offers/index.js");
  const SHOT = {
    id: "shots",
    product: "kuanlan",
    account: "personal" as const,
    name: "Shots",
    prices: { CNY: 68 },
    fulfillment: { type: "credits", params: { credits: 1000 } },
  };
  const PLAN = { ...SHOT, id: "plan", product: "para", account: "organization" as const };
  const TOPUP = { ...SHOT, id: "topup", product: "router", account: "workspace" as const };

  beforeEach(async () => {
    const { configureOffers } = await offersModule();
    configureOffers([SHOT, PLAN, TOPUP]);
    activeOrg.value = "org_1";
    tenantRole.value = "org:viewer";
    personal.ensure.mockReset();
    personal.ensure.mockResolvedValue("tenant_me");
    createPaymentOrderMock.mockReset();
    createPaymentOrderMock.mockResolvedValue({
      orderId: "o",
      session: { kind: "qr", url: "u", provider: "chinapay" },
      amountMinor: 6800,
      currency: "CNY",
    });
  });

  afterEach(async () => {
    const { configureOffers, DEFAULT_OFFERS } = await offersModule();
    configureOffers(DEFAULT_OFFERS);
  });

  it("bills a personal offer to the buyer's own account, whatever their role", async () => {
    const res = await postOrder({ offerId: "shots", method: "alipay" });
    expect(res.status).toBe(200);
    expect(createPaymentOrderMock.mock.calls[0]?.[0]).toMatchObject({
      organizationId: "tenant_me",
    });
  });

  it("keeps an organization's money behind billing rights", async () => {
    const res = await postOrder({ offerId: "plan", method: "alipay" });
    expect(res.status).toBe(403);
    expect(createPaymentOrderMock).not.toHaveBeenCalled();
  });

  it("refuses an organization offer to someone with no organization", async () => {
    activeOrg.value = undefined;
    const res = await postOrder({ offerId: "plan", method: "alipay" });
    expect(res.status).toBe(403);
    expect(createPaymentOrderMock).not.toHaveBeenCalled();
  });

  it("bills a workspace offer to the active organization, or to the buyer without one", async () => {
    tenantRole.value = "org:admin";
    await postOrder({ offerId: "topup", method: "alipay" });
    activeOrg.value = undefined;
    await postOrder({ offerId: "topup", method: "alipay" });
    expect(createPaymentOrderMock.mock.calls.map((c) => c[0].organizationId)).toEqual([
      "org_1",
      "tenant_me",
    ]);
  });
});

describe("GET /orders", () => {
  beforeEach(() => {
    activeOrg.value = "org_1";
    personal.find.mockReset();
    personal.find.mockResolvedValue(null);
    listPaymentOrdersMock.mockReset();
  });

  it("lists the caller's organization's orders with product and offer name", async () => {
    listPaymentOrdersMock.mockResolvedValue([
      {
        id: "order_2",
        offerId: "credits_10k",
        product: "app",
        status: "PAID",
        fulfilledAt: new Date("2026-09-27T00:01:00Z"),
        amountMinor: 6800,
        currency: "CNY",
        method: "alipay",
        createdAt: new Date("2026-09-27T00:00:00Z"),
      },
    ]);

    const res = await orderRoutes.request("/orders?limit=5");

    expect(res.status).toBe(200);
    expect(listPaymentOrdersMock).toHaveBeenCalledWith("org_1", 5);
    expect(await res.json()).toEqual({
      orders: [
        {
          id: "order_2",
          offerId: "credits_10k",
          product: "app",
          name: "10,000 credits",
          status: "PAID",
          fulfilled: true,
          amountMinor: 6800,
          currency: "CNY",
          method: "alipay",
          createdAt: "2026-09-27T00:00:00.000Z",
        },
      ],
    });
  });
});

describe("GET /orders across accounts", () => {
  it("lists the organization's orders and the buyer's own, newest first", async () => {
    activeOrg.value = "org_1";
    personal.find.mockReset();
    personal.find.mockResolvedValue("tenant_me");
    listPaymentOrdersMock.mockReset();
    const row = (id: string, at: string) => ({
      id,
      offerId: "x",
      product: "kuanlan",
      status: "PAID",
      fulfilledAt: null,
      amountMinor: 1,
      currency: "CNY",
      method: "alipay",
      createdAt: new Date(at),
    });
    listPaymentOrdersMock.mockImplementation(async (tenantId: string) =>
      tenantId === "org_1" ? [row("org_old", "2026-09-01")] : [row("mine_new", "2026-09-20")],
    );

    const res = await orderRoutes.request("/orders");
    const body = (await res.json()) as { orders: Array<{ id: string }> };

    expect(listPaymentOrdersMock.mock.calls.map((c) => c[0]).sort()).toEqual([
      "org_1",
      "tenant_me",
    ]);
    expect(body.orders.map((o) => o.id)).toEqual(["mine_new", "org_old"]);
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
