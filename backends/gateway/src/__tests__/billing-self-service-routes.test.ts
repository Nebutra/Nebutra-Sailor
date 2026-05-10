import { OpenAPIHono } from "@hono/zod-openapi";
import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  createBillingPortalSessionMock,
  createCheckoutSessionMock,
  getStripeSubscriptionMock,
  stripeCustomerFindUniqueMock,
  verifyServiceTokenMock,
} = vi.hoisted(() => ({
  createBillingPortalSessionMock: vi.fn(),
  createCheckoutSessionMock: vi.fn(),
  getStripeSubscriptionMock: vi.fn(),
  stripeCustomerFindUniqueMock: vi.fn(),
  verifyServiceTokenMock: vi.fn(),
}));

vi.mock("@nebutra/billing", () => ({
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

function authHeaders(orgId = "org_alpha") {
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
    stripeCustomerFindUniqueMock.mockReset();
    verifyServiceTokenMock.mockReset();
    verifyServiceTokenMock.mockReturnValue(true);
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
        ...authHeaders(),
      },
      body: JSON.stringify({
        priceId: "price_pro_monthly",
        successUrl: "https://app.example/en/billing?billing=checkout-success",
        cancelUrl: "https://app.example/en/billing?billing=checkout-canceled",
      }),
    });

    expect(response.status).toBe(200);
    expect(stripeCustomerFindUniqueMock).toHaveBeenCalledWith({
      where: { organizationId: "org_alpha" },
      select: { stripeId: true },
    });
    expect(createCheckoutSessionMock).toHaveBeenCalledWith(
      expect.objectContaining({
        customerId: "cus_alpha",
        priceId: "price_pro_monthly",
      }),
    );
    await expect(readJson(response)).resolves.toEqual({
      url: "https://stripe.example/checkout/cs_alpha",
      sessionId: "cs_alpha",
    });
  });

  it("returns a dependency error when checkout has no Stripe customer mapping", async () => {
    stripeCustomerFindUniqueMock.mockResolvedValue(null);

    const response = await app.request("/checkout", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...authHeaders(),
      },
      body: JSON.stringify({
        priceId: "price_pro_monthly",
        successUrl: "https://app.example/en/billing?billing=checkout-success",
        cancelUrl: "https://app.example/en/billing?billing=checkout-canceled",
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
        ...authHeaders(),
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
        ...authHeaders(),
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
  });
});
