import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth", () => ({
  getAuth: vi.fn(),
}));

vi.mock("@/lib/api/client", () => ({
  API_BASE_URL: "https://api.example",
}));

import { getAuth } from "@/lib/auth";

const mockedGetAuth = vi.mocked(getAuth);

async function loadRoute() {
  return import("@/app/api/billing/checkout/route");
}

function buildAuth(orgId: string | null = "org_1") {
  return {
    userId: "user_1",
    orgId,
    sessionClaims: { org_role: "org:admin" },
    isSignedIn: true,
  } as Awaited<ReturnType<typeof getAuth>>;
}

function jsonRequest(body: unknown): Request {
  return new Request("https://app.example/api/billing/checkout", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/billing/checkout", () => {
  let fetchSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.resetModules();
    mockedGetAuth.mockReset();
    process.env.STRIPE_SECRET_KEY = "sk_test_123";

    fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ url: "https://stripe.example/checkout/session_1" }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
    delete process.env.STRIPE_SECRET_KEY;
  });

  it("returns 503 when Stripe is not configured", async () => {
    delete process.env.STRIPE_SECRET_KEY;
    const { POST } = await loadRoute();

    const response = await POST(jsonRequest({ plan: "pro", interval: "monthly" }));
    expect(response.status).toBe(503);
  });

  it("returns 400 when the client sends a raw Stripe price id", async () => {
    const { POST } = await loadRoute();

    const response = await POST(jsonRequest({ priceId: "price_attacker" }));
    expect(response.status).toBe(400);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("forwards only the catalog selection to the gateway", async () => {
    mockedGetAuth.mockResolvedValue(buildAuth(null));

    const { POST } = await loadRoute();
    const response = await POST(
      jsonRequest({
        plan: "pro",
        interval: "monthly",
        priceId: "price_attacker",
        quantity: 7000,
        trialPeriodDays: 30,
      }),
    );

    expect(response.status).toBe(303);
    const [, init] = fetchSpy.mock.calls[0];
    expect(JSON.parse((init as RequestInit).body as string)).toEqual({
      plan: "pro",
      interval: "monthly",
    });
  });

  it("accepts pricing grid planId plus interval", async () => {
    mockedGetAuth.mockResolvedValue(buildAuth(null));

    const { POST } = await loadRoute();
    const response = await POST(
      jsonRequest({
        planId: "plan_pro",
        interval: "year",
        redirectUrl: "https://app.example/checkout-return?organizationId=org_1",
      }),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      url: "https://stripe.example/checkout/session_1",
    });

    const [, init] = fetchSpy.mock.calls[0];
    expect(JSON.parse((init as RequestInit).body as string)).toEqual({
      plan: "pro",
      interval: "yearly",
    });
  });

  it("rejects cross-origin explicit redirect URLs before creating checkout", async () => {
    mockedGetAuth.mockResolvedValue(buildAuth(null));

    const { POST } = await loadRoute();
    const response = await POST(
      jsonRequest({
        planId: "plan_pro",
        interval: "month",
        redirectUrl: "https://evil.example/checkout-return",
      }),
    );

    expect(response.status).toBe(400);
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
