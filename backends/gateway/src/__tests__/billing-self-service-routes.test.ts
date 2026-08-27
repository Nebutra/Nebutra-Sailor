import { OpenAPIHono } from "@hono/zod-openapi";
import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  createBillingPortalSessionMock,
  createCheckoutSessionMock,
  getStripeSubscriptionMock,
  resolveBillingProviderReadinessMock,
  stripeCustomerFindUniqueMock,
  verifyServiceTokenMock,
} = vi.hoisted(() => ({
  createBillingPortalSessionMock: vi.fn(),
  createCheckoutSessionMock: vi.fn(),
  getStripeSubscriptionMock: vi.fn(),
  resolveBillingProviderReadinessMock: vi.fn(),
  stripeCustomerFindUniqueMock: vi.fn(),
  verifyServiceTokenMock: vi.fn(),
}));

vi.mock("@nebutra/billing", () => ({
  BillingError: class BillingError extends Error {
    code: string;
    statusCode: number;
    constructor(message: string, code: string, statusCode = 400) {
      super(message);
      this.code = code;
      this.statusCode = statusCode;
    }
  },
  checkUsageLimit: vi.fn(() => ({
    allowed: true,
    limit: BigInt(10000),
    percentUsed: 0,
    remaining: BigInt(10000),
  })),
  createBillingPortalSession: createBillingPortalSessionMock,
  createCheckoutSession: createCheckoutSessionMock,
  DEFAULT_PLAN_LIMITS: {
    FREE: { apiCalls: 10000 },
    PRO: { apiCalls: 100000 },
    ENTERPRISE: { apiCalls: 1000000 },
  },
  getStripeSubscription: getStripeSubscriptionMock,
  parseCheckoutSelection: ({ plan, interval }: { plan: string; interval: string }) => ({
    plan: plan.startsWith("plan_") ? plan.slice(5) : plan,
    interval: interval === "year" ? "yearly" : interval === "month" ? "monthly" : interval,
  }),
  resolveCheckoutOffer: ({ plan, interval }: { plan: string; interval: string }) => ({
    plan,
    interval,
    priceId: interval === "yearly" ? "price_pro_yearly" : "price_pro_monthly",
    quantity: 1 as const,
  }),
  resolveCheckoutReturnUrls: () => ({
    successUrl: "https://app.example/checkout-return?billing=checkout-success",
    cancelUrl: "https://app.example/checkout-return?billing=checkout-canceled",
  }),
  assertProductReturnUrl: (url: string) => {
    if (!url.startsWith("https://app.example")) {
      throw new Error("Billing return URL must stay on the product origin");
    }
    return url;
  },
  resolveBillingProviderReadiness: resolveBillingProviderReadinessMock,
}));

vi.mock("@nebutra/db", () => ({
  getSystemDb: () => ({
    stripeCustomer: {
      findUnique: stripeCustomerFindUniqueMock,
    },
  }),
}));

vi.mock("@nebutra/auth", () => ({
  verifyServiceToken: (...args: unknown[]) => verifyServiceTokenMock(...args),
}));

vi.mock("@nebutra/auth/server", () => ({
  createAuth: vi.fn().mockResolvedValue({
    provider: "better-auth",
    getSession: vi.fn().mockResolvedValue(null),
  }),
}));

vi.mock("@nebutra/logger", () => ({
  logger: {
    debug: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
  },
}));

import { tenantContextMiddleware } from "@/middlewares/tenantContext.js";
import { billingRoutes } from "../routes/billing/index.js";
import { s2sHeaders, TEST_SERVICE_SECRET } from "./helpers/s2s-token.js";

function buildApp(): OpenAPIHono {
  const app = new OpenAPIHono();
  app.use("*", tenantContextMiddleware);
  app.route("/", billingRoutes);
  return app;
}

async function authHeaders(orgId = "org_alpha") {
  return s2sHeaders({
    userId: "user_alpha",
    orgId,
    role: "admin",
    plan: "PRO",
  });
}

async function readJson(response: Response) {
  return (await response.json()) as Record<string, unknown>;
}

describe("billing self-service routes", () => {
  let app: OpenAPIHono;

  beforeEach(() => {
    process.env.SERVICE_SECRET = TEST_SERVICE_SECRET;
    createBillingPortalSessionMock.mockReset();
    createCheckoutSessionMock.mockReset();
    getStripeSubscriptionMock.mockReset();
    resolveBillingProviderReadinessMock.mockReset();
    stripeCustomerFindUniqueMock.mockReset();
    verifyServiceTokenMock.mockReset();
    verifyServiceTokenMock.mockReturnValue(true);
    resolveBillingProviderReadinessMock.mockReturnValue({
      provider: "stripe",
      status: "ready",
      checkoutReady: true,
      portalReady: true,
      missing: [],
      title: "Stripe self-service is ready",
      description:
        "Checkout and hosted billing portal actions can be exposed for configured plans.",
    });
    process.env.BILLING_PROVIDER = "stripe";
    process.env.APP_URL = "https://app.example";
    process.env.STRIPE_SECRET_KEY = "sk_test_123";
    process.env.STRIPE_PRICE_ID_PRO_MONTHLY = "price_pro_monthly";
    process.env.STRIPE_PRICE_ID_PRO_YEARLY = "price_pro_yearly";
    app = buildApp();
  });

  it("resolves the Stripe customer mapping before creating checkout sessions", async () => {
    stripeCustomerFindUniqueMock.mockResolvedValue({ stripeId: "cus_alpha" });
    createCheckoutSessionMock.mockResolvedValue({
      id: "cs_alpha",
      url: "https://stripe.example/checkout/cs_alpha",
    });

    const response = await app.request("/checkout", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(await authHeaders()),
      },
      body: JSON.stringify({
        plan: "pro",
        interval: "monthly",
      }),
    });

    expect(response.status).toBe(200);
    expect(stripeCustomerFindUniqueMock).toHaveBeenCalledWith({
      where: { tenantId: "org_alpha" },
      select: { stripeId: true },
    });
    expect(createCheckoutSessionMock).toHaveBeenCalledWith(
      expect.objectContaining({
        customerId: "cus_alpha",
        priceId: "price_pro_monthly",
        quantity: 1,
        successUrl: "https://app.example/checkout-return?billing=checkout-success",
        cancelUrl: "https://app.example/checkout-return?billing=checkout-canceled",
      }),
    );
    await expect(readJson(response)).resolves.toEqual({
      url: "https://stripe.example/checkout/cs_alpha",
      sessionId: "cs_alpha",
    });
  });

  it("ignores client-supplied price, quantity, trial, and redirect URLs", async () => {
    stripeCustomerFindUniqueMock.mockResolvedValue({ stripeId: "cus_alpha" });
    createCheckoutSessionMock.mockResolvedValue({
      id: "cs_alpha",
      url: "https://stripe.example/checkout/cs_alpha",
    });

    const response = await app.request("/checkout", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(await authHeaders()),
      },
      body: JSON.stringify({
        plan: "pro",
        interval: "monthly",
        priceId: "price_attacker",
        successUrl: "https://evil.example/phish",
        cancelUrl: "https://evil.example/phish",
        quantity: 7000,
        trialPeriodDays: 30,
      }),
    });

    expect(response.status).toBe(200);
    expect(createCheckoutSessionMock).toHaveBeenCalledWith(
      expect.objectContaining({
        priceId: "price_pro_monthly",
        quantity: 1,
        successUrl: "https://app.example/checkout-return?billing=checkout-success",
      }),
    );
    expect(createCheckoutSessionMock.mock.calls[0]?.[0]).not.toMatchObject({
      trialPeriodDays: 30,
    });
  });

  it("rejects members who cannot manage billing", async () => {
    const response = await app.request("/checkout", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(await s2sHeaders({
          userId: "user_member",
          orgId: "org_alpha",
          role: "member",
          plan: "PRO",
        })),
      },
      body: JSON.stringify({
        plan: "pro",
        interval: "monthly",
      }),
    });

    expect(response.status).toBe(403);
    expect(createCheckoutSessionMock).not.toHaveBeenCalled();
  });

  it("returns a dependency error when checkout has no Stripe customer mapping", async () => {
    stripeCustomerFindUniqueMock.mockResolvedValue(null);

    const response = await app.request("/checkout", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(await authHeaders()),
      },
      body: JSON.stringify({
        plan: "pro",
        interval: "monthly",
      }),
    });

    expect(response.status).toBe(424);
    expect(createCheckoutSessionMock).not.toHaveBeenCalled();
    await expect(readJson(response)).resolves.toEqual({
      error: "Stripe customer mapping is missing for this organization.",
    });
  });

  it("resolves the Stripe customer mapping before creating portal sessions", async () => {
    stripeCustomerFindUniqueMock.mockResolvedValue({ stripeId: "cus_alpha" });
    createBillingPortalSessionMock.mockResolvedValue({
      url: "https://stripe.example/portal/session",
    });

    const response = await app.request("/portal", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(await authHeaders()),
      },
      body: JSON.stringify({
        returnUrl: "https://app.example/en/billing",
      }),
    });

    expect(response.status).toBe(200);
    expect(createBillingPortalSessionMock).toHaveBeenCalledWith(
      "cus_alpha",
      "https://app.example/en/billing",
    );
    await expect(readJson(response)).resolves.toEqual({
      url: "https://stripe.example/portal/session",
    });
  });

  it("returns a dependency error when portal has no Stripe customer mapping", async () => {
    stripeCustomerFindUniqueMock.mockResolvedValue(null);

    const response = await app.request("/portal", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(await authHeaders()),
      },
      body: JSON.stringify({
        returnUrl: "https://app.example/en/billing",
      }),
    });

    expect(response.status).toBe(424);
    expect(createBillingPortalSessionMock).not.toHaveBeenCalled();
    await expect(readJson(response)).resolves.toEqual({
      error: "Stripe customer mapping is missing for this organization.",
    });
  });

  it("exposes provider readiness for billing UI and operational checks", async () => {
    delete process.env.STRIPE_PRICE_ID_PRO_YEARLY;
    resolveBillingProviderReadinessMock.mockReturnValue({
      provider: "stripe",
      status: "degraded",
      checkoutReady: false,
      portalReady: true,
      missing: ["STRIPE_PRICE_ID_PRO_YEARLY"],
      title: "Stripe is partially configured",
      description:
        "Customer portal can be requested, but paid plan checkout stays disabled until every paid plan has a Stripe price id.",
    });

    const response = await app.request("/provider-status", {
      method: "GET",
      headers: await authHeaders(),
    });

    expect(response.status).toBe(200);
    expect(resolveBillingProviderReadinessMock).toHaveBeenCalledWith({
      selfServiceEnabled: true,
      requiredPriceEnvVars: ["STRIPE_PRICE_ID_PRO_MONTHLY", "STRIPE_PRICE_ID_PRO_YEARLY"],
    });
    await expect(readJson(response)).resolves.toMatchObject({
      provider: "stripe",
      status: "degraded",
      checkoutReady: false,
      portalReady: true,
      missing: ["STRIPE_PRICE_ID_PRO_YEARLY"],
    });
  });

  it("documents checkout and portal success response bodies in OpenAPI", async () => {
    const contractApp = new OpenAPIHono();
    contractApp.doc("/openapi.json", {
      openapi: "3.0.3",
      info: { title: "Billing contract test", version: "0.0.0" },
    });
    contractApp.route("/", billingRoutes);

    const response = await contractApp.request("/openapi.json");
    const spec = (await response.json()) as {
      paths: Record<
        string,
        {
          get?: {
            responses?: Record<
              string,
              { content?: { "application/json"?: { schema?: Record<string, unknown> } } }
            >;
          };
          post?: {
            responses?: Record<
              string,
              { content?: { "application/json"?: { schema?: Record<string, unknown> } } }
            >;
          };
        }
      >;
    };

    expect(
      spec.paths["/checkout"]?.post?.responses?.["200"]?.content?.["application/json"]?.schema,
    ).toMatchObject({
      properties: {
        url: { type: "string", format: "uri" },
        sessionId: { type: "string" },
      },
      required: ["url", "sessionId"],
      type: "object",
    });
    expect(
      spec.paths["/portal"]?.post?.responses?.["200"]?.content?.["application/json"]?.schema,
    ).toMatchObject({
      properties: {
        url: { type: "string", format: "uri" },
      },
      required: ["url"],
      type: "object",
    });
    expect(
      spec.paths["/provider-status"]?.get?.responses?.["200"]?.content?.["application/json"]
        ?.schema,
    ).toMatchObject({
      properties: {
        provider: { type: "string" },
        status: { type: "string" },
        checkoutReady: { type: "boolean" },
        portalReady: { type: "boolean" },
      },
      required: expect.arrayContaining(["provider", "status", "checkoutReady", "portalReady"]),
      type: "object",
    });
  });
});
