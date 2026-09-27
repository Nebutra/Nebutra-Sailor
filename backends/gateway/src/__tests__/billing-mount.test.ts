import { OpenAPIHono } from "@hono/zod-openapi";
import { describe, expect, it, vi } from "vitest";

/**
 * The billing routers share one mount, /api/v1/billing, in this order
 * (app.ts). A middleware one of them registers on "*" runs in front of every
 * router mounted after it — which is how the public offer catalog came to
 * need a session, and a personal purchase an organization. This mounts the
 * real routers the way app.ts does and asks what a caller actually gets.
 */

const session = vi.hoisted(() => ({
  signedIn: false,
  organizationId: undefined as string | undefined,
}));

vi.mock("@nebutra/logger", () => ({
  logger: {
    child: () => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn() }),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));
vi.mock("@nebutra/db", () => ({ getSystemDb: () => ({}) }));
vi.mock("@nebutra/repositories", () => ({
  PersonalTenantRepository: class {
    ensure = async () => "tenant_me";
    find = async () => "tenant_me";
  },
}));
vi.mock("../middlewares/tenantContext.js", () => {
  type C = {
    set: (k: string, v: unknown) => void;
    get: (k: string) => unknown;
    json: (b: unknown, s: number) => Response;
  };
  return {
    requireAuth: async (c: C, next: () => Promise<void>) => {
      if (!session.signedIn) return c.json({ error: "Unauthorized" }, 401);
      c.set("tenant", {
        userId: "user_1",
        organizationId: session.organizationId,
        role: "org:member",
      });
      await next();
    },
    requireOrganization: async (c: C, next: () => Promise<void>) => {
      const tenant = c.get("tenant") as { organizationId?: string } | undefined;
      if (!tenant?.organizationId)
        return c.json({ error: "Organization membership required" }, 403);
      await next();
    },
    requireBillingManage: async (c: C) => c.json({ error: "Forbidden" }, 403),
  };
});
vi.mock("../services/circuitBreaker.js", () => ({
  billingServiceBreaker: { call: <T>(fn: () => Promise<T>) => fn() },
  CircuitOpenError: class CircuitOpenError extends Error {},
}));
vi.mock("@nebutra/billing", async () => {
  const { BillingError } = await import("../../../../packages/commerce/billing/src/types.js");
  const offers = await import("../../../../packages/commerce/billing/src/offers/index.js");
  offers.configureOffers([
    {
      id: "shots",
      product: "kuanlan",
      account: "personal",
      name: "Shots",
      prices: { CNY: 68 },
      fulfillment: { type: "credits", params: { credits: 1000 } },
    },
  ]);
  return {
    BillingError,
    ...offers,
    assertProductReturnUrl: (v: string) => v,
    isPaymentMethodAvailable: () => true,
    createPaymentOrder: async () => ({
      orderId: "o1",
      session: { kind: "qr", url: "u", provider: "chinapay" },
      amountMinor: 6800,
      currency: "CNY",
    }),
    getPaymentOrder: async () => null,
    listPaymentOrders: async () => [],
  };
});

const { billingRoutes } = await import("../routes/billing/index.js");
const { orderRoutes } = await import("../routes/billing/orders.js");

function mounted() {
  const app = new OpenAPIHono();
  app.route("/api/v1/billing", billingRoutes);
  app.route("/api/v1/billing", orderRoutes);
  return app;
}

describe("the /api/v1/billing mount", () => {
  it("serves the offer catalog to a visitor who is not signed in", async () => {
    session.signedIn = false;
    const res = await mounted().request("/api/v1/billing/offers?product=kuanlan");
    expect(res.status).toBe(200);
  });

  it("lets a signed-in person with no organization buy a personal offer", async () => {
    session.signedIn = true;
    session.organizationId = undefined;
    const res = await mounted().request("/api/v1/billing/orders", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        offerId: "shots",
        method: "alipay",
        successUrl: "https://app.example.com/ok",
        cancelUrl: "https://app.example.com/no",
      }),
    });
    expect(res.status).toBe(200);
  });

  it("still keeps the subscription endpoints behind an organization", async () => {
    session.signedIn = true;
    session.organizationId = undefined;
    const res = await mounted().request("/api/v1/billing/subscription");
    expect(res.status).toBe(403);
  });
});
