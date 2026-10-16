import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * The product app's /billing page reads one gateway route (GET
 * /self-service) and, back from Creem's checkout, asks the gateway to verify
 * the order (POST /orders/{id}/verify). Provider detection is the real
 * checkout factory; Creem's HTTP is mocked.
 */

const { getPaymentOrderMock, getMembershipMock, getCreemCheckoutMock, settleMock } = vi.hoisted(
  () => ({
    getPaymentOrderMock: vi.fn(),
    getMembershipMock: vi.fn(),
    getCreemCheckoutMock: vi.fn(),
    settleMock: vi.fn(),
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

const activeOrg = vi.hoisted(() => ({ value: "org_1" as string | undefined }));
const personal = vi.hoisted(() => ({ ensure: vi.fn(), find: vi.fn() }));

vi.mock("@nebutra/db", () => ({ getSystemDb: () => ({}) }));
vi.mock("@nebutra/repositories", () => ({
  PersonalTenantRepository: class {
    ensure = personal.ensure;
    find = personal.find;
  },
}));
vi.mock("@nebutra/contracts/market", () => ({
  isMainlandMarket: (env: Record<string, string | undefined>) =>
    (env.NEBUTRA_LOCALE ?? env.NEBUTRA_REGION ?? "").toLowerCase().startsWith("cn"),
}));

vi.mock("../middlewares/tenantContext.js", () => ({
  requireAuth: async (c: { set: (k: string, v: unknown) => void }, next: () => Promise<void>) => {
    c.set("tenant", { organizationId: activeOrg.value, userId: "user_1", role: "org:admin" });
    await next();
  },
  requireOrganization: async (_c: unknown, next: () => Promise<void>) => next(),
  requireBillingManage: async (_c: unknown, next: () => Promise<void>) => next(),
}));

vi.mock("../services/circuitBreaker.js", () => ({
  billingServiceBreaker: { call: <T>(fn: () => Promise<T>) => fn() },
  CircuitOpenError: class CircuitOpenError extends Error {},
}));

vi.mock("@nebutra/billing", async () => {
  const { BillingError } = await import("../../../../packages/commerce/billing/src/types.js");
  const offers = await import("../../../../packages/commerce/billing/src/offers/index.js");
  const factory = await import("../../../../packages/commerce/billing/src/checkout/factory.js");
  const creem = await import("../../../../packages/commerce/billing/src/creem/index.js");
  return {
    BillingError,
    listOffers: offers.listOffers,
    getOffer: offers.getOffer,
    offerAccount: offers.offerAccount,
    configureOffers: offers.configureOffers,
    detectProvider: factory.detectProvider,
    isChinaPayConfigured: factory.isChinaPayConfigured,
    isCreemConfigured: creem.isCreemConfigured,
    getPaymentOrder: (id: string) => getPaymentOrderMock(id),
    getMembership: (tenant: string, product: string) => getMembershipMock(tenant, product),
    getCreemCheckout: (id: string) => getCreemCheckoutMock(id),
    settlePaymentOrder: (input: unknown) => settleMock(input),
    isPaymentMethodAvailable: () => false,
    listPaymentOrders: async () => [],
    createPaymentOrder: vi.fn(),
    assertProductReturnUrl: (value: string) => value,
  };
});

import { orderRoutes } from "../routes/billing/orders.js";
import { resolveSelfServiceReadiness } from "../routes/billing/self-service.js";

const CREEM = { CREEM_API_KEY: "creem_test_x", CREEM_PRODUCT_ID: "prod_x" };
const WECHAT = { WECHATPAY_MCHID: "mch_1" };

describe("resolveSelfServiceReadiness", () => {
  it("asks for the Creem keys when nothing can take money", () => {
    const r = resolveSelfServiceReadiness({});
    expect(r).toMatchObject({ provider: "manual", status: "degraded", methods: [] });
    expect(r.missing).toEqual(["CREEM_API_KEY", "CREEM_PRODUCT_ID"]);
    expect(r.description).toContain("CREEM_API_KEY");
  });

  it("takes cards through Creem once its keys are set", () => {
    const r = resolveSelfServiceReadiness({ ...CREEM, CREEM_TEST_MODE: "true" });
    expect(r).toMatchObject({ provider: "creem", status: "ready", missing: [] });
    expect(r.methods).toEqual([{ id: "card", currency: "USD" }]);
    expect(r.description).toContain("test mode");
  });

  it("never auto-selects Stripe from a stray secret key", () => {
    const r = resolveSelfServiceReadiness({ STRIPE_SECRET_KEY: "sk_test_1" });
    expect(r.provider).toBe("manual");
    expect(r.status).toBe("degraded");
  });

  it("puts the wallets first under NEBUTRA_LOCALE=cn", () => {
    const r = resolveSelfServiceReadiness({ ...CREEM, ...WECHAT, NEBUTRA_LOCALE: "cn" });
    expect(r.provider).toBe("chinapay");
    expect(r.methods.map((m) => m.id)).toEqual(["wechat", "card"]);
  });

  it("keeps the card first outside the mainland market", () => {
    const r = resolveSelfServiceReadiness({ ...CREEM, ...WECHAT });
    expect(r.provider).toBe("creem");
    expect(r.methods.map((m) => m.id)).toEqual(["card", "wechat"]);
  });

  it("reads as switched off when the deployment turns checkout off", () => {
    const r = resolveSelfServiceReadiness({ ...CREEM, NEBUTRA_BILLING_CHECKOUT_MODE: "none" });
    expect(r).toMatchObject({ status: "disabled", methods: [] });
  });
});

describe("GET /self-service", () => {
  const saved = { ...process.env };
  beforeEach(() => {
    activeOrg.value = "org_1";
    getMembershipMock.mockReset();
    personal.find.mockReset();
    for (const key of ["CREEM_API_KEY", "CREEM_PRODUCT_ID", "WECHATPAY_MCHID", "ALIPAY_APP_ID"]) {
      delete process.env[key];
    }
    delete process.env.BILLING_PROVIDER;
    delete process.env.NEBUTRA_LOCALE;
  });
  afterEach(() => {
    process.env = { ...saved };
  });

  it("renders a free plan and the readiness copy with no keys", async () => {
    getMembershipMock.mockResolvedValue(null);

    const res = await orderRoutes.request("/self-service");
    const body = (await res.json()) as Record<string, unknown>;

    expect(res.status).toBe(200);
    expect(body).toMatchObject({
      status: "degraded",
      plan: null,
      product: "app",
      missing: ["CREEM_API_KEY", "CREEM_PRODUCT_ID"],
    });
    expect((body.offers as Array<{ id: string }>).map((o) => o.id)).toContain("credits_10k");
    expect(getMembershipMock).toHaveBeenCalledWith("org_1", "app");
  });

  it("returns the organization's membership as the current plan", async () => {
    process.env.CREEM_API_KEY = "creem_test_x";
    process.env.CREEM_PRODUCT_ID = "prod_x";
    getMembershipMock.mockResolvedValue({
      organizationId: "org_1",
      product: "app",
      tier: "PRO",
      startsAt: new Date("2026-10-01T00:00:00Z"),
      endsAt: new Date("2026-10-31T00:00:00Z"),
      monthlyCredits: 0,
    });

    const res = await orderRoutes.request("/self-service");
    const body = (await res.json()) as Record<string, unknown>;

    expect(body).toMatchObject({
      provider: "creem",
      status: "ready",
      methods: [{ id: "card", currency: "USD" }],
      plan: { tier: "PRO", product: "app", endsAt: "2026-10-31T00:00:00.000Z" },
    });
  });

  it("falls back to the buyer's own account without an active organization", async () => {
    activeOrg.value = undefined;
    personal.find.mockResolvedValue("tenant_me");
    getMembershipMock.mockResolvedValue(null);

    await orderRoutes.request("/self-service");

    expect(getMembershipMock).toHaveBeenCalledWith("tenant_me", "app");
  });

  it("treats an unreadable membership as no plan instead of failing the page", async () => {
    getMembershipMock.mockRejectedValue(new Error("no tenant db"));

    const res = await orderRoutes.request("/self-service");

    expect(res.status).toBe(200);
    expect(((await res.json()) as { plan: unknown }).plan).toBeNull();
  });
});

describe("POST /orders/{id}/verify", () => {
  const pending = {
    id: "order_1",
    tenantId: "org_1",
    offerId: "credits_10k",
    status: "PENDING",
    provider: "creem",
    providerRef: "ch_1",
    fulfilledAt: null,
    amountMinor: 1000,
    currency: "USD",
    method: "card",
    createdAt: new Date("2026-10-16T00:00:00Z"),
  };

  beforeEach(() => {
    activeOrg.value = "org_1";
    personal.find.mockResolvedValue(null);
    getPaymentOrderMock.mockReset();
    getCreemCheckoutMock.mockReset();
    settleMock.mockReset();
  });

  it("settles a pending Creem order whose checkout completed", async () => {
    getPaymentOrderMock
      .mockResolvedValueOnce(pending)
      .mockResolvedValueOnce({ ...pending, status: "PAID", fulfilledAt: new Date() });
    getCreemCheckoutMock.mockResolvedValue({
      status: "completed",
      order: { id: "ord_creem_1", amount: 1000, currency: "USD", status: "paid" },
    });

    const res = await orderRoutes.request("/orders/order_1/verify", { method: "POST" });

    expect(res.status).toBe(200);
    expect(settleMock).toHaveBeenCalledWith({
      orderId: "order_1",
      paidMinor: 1000,
      currency: "USD",
      providerRef: "ord_creem_1",
    });
    expect(await res.json()).toMatchObject({ status: "PAID", fulfilled: true });
  });

  it("leaves an unpaid checkout pending", async () => {
    getPaymentOrderMock.mockResolvedValue(pending);
    getCreemCheckoutMock.mockResolvedValue({ status: "pending" });

    const res = await orderRoutes.request("/orders/order_1/verify", { method: "POST" });

    expect(settleMock).not.toHaveBeenCalled();
    expect(await res.json()).toMatchObject({ status: "PENDING", fulfilled: false });
  });

  it("answers with the stored state when Creem cannot be reached", async () => {
    getPaymentOrderMock.mockResolvedValue(pending);
    getCreemCheckoutMock.mockRejectedValue(new Error("network"));

    const res = await orderRoutes.request("/orders/order_1/verify", { method: "POST" });

    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ status: "PENDING" });
  });

  it("never asks the provider about another organization's order", async () => {
    getPaymentOrderMock.mockResolvedValue({ ...pending, tenantId: "org_2" });

    const res = await orderRoutes.request("/orders/order_1/verify", { method: "POST" });

    expect(res.status).toBe(404);
    expect(getCreemCheckoutMock).not.toHaveBeenCalled();
  });
});
