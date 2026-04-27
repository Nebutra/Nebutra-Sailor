import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/api/client", () => ({
  API_BASE_URL: "http://api.local",
}));

const originalStripeSecret = process.env.STRIPE_SECRET_KEY;
const originalFetch = globalThis.fetch;
const fetchMock = vi.fn();

async function loadCheckoutRoute() {
  return import("@/app/api/billing/checkout/route");
}

async function loadPortalRoute() {
  return import("@/app/api/billing/portal/route");
}

function createJsonResponse(payload: unknown, init?: ResponseInit) {
  return new Response(JSON.stringify(payload), {
    status: init?.status ?? 200,
    headers: { "content-type": "application/json", ...init?.headers },
  });
}

describe("billing API routes", () => {
  beforeEach(() => {
    vi.resetModules();
    fetchMock.mockReset();
    globalThis.fetch = fetchMock;
    process.env.STRIPE_SECRET_KEY = "sk_test_123";
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    if (originalStripeSecret === undefined) {
      delete process.env.STRIPE_SECRET_KEY;
    } else {
      process.env.STRIPE_SECRET_KEY = originalStripeSecret;
    }
  });

  it("preserves localized billing return URLs for checkout callbacks", async () => {
    fetchMock.mockResolvedValue(createJsonResponse({ url: "https://stripe.example/checkout" }));
    const formData = new FormData();
    formData.set("priceId", "price_pro_monthly");

    const { POST } = await loadCheckoutRoute();
    const response = await POST(
      new Request("https://app.example/api/billing/checkout", {
        method: "POST",
        body: formData,
        headers: {
          referer: "https://app.example/zh/billing?from=settings",
        },
      }),
    );

    expect(fetchMock).toHaveBeenCalledWith(
      "http://api.local/api/v1/billing/checkout",
      expect.objectContaining({
        body: JSON.stringify({
          priceId: "price_pro_monthly",
          successUrl: "https://app.example/zh/billing?from=settings&billing=checkout-success",
          cancelUrl: "https://app.example/zh/billing?from=settings&billing=checkout-canceled",
        }),
      }),
    );
    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe("https://stripe.example/checkout");
  });

  it("preserves localized billing return URLs for portal callbacks", async () => {
    fetchMock.mockResolvedValue(createJsonResponse({ url: "https://stripe.example/portal" }));

    const { POST } = await loadPortalRoute();
    const response = await POST(
      new Request("https://app.example/api/billing/portal", {
        method: "POST",
        headers: {
          referer: "https://app.example/zh/billing?from=settings",
        },
      }),
    );

    expect(fetchMock).toHaveBeenCalledWith(
      "http://api.local/api/v1/billing/portal",
      expect.objectContaining({
        body: JSON.stringify({
          returnUrl: "https://app.example/zh/billing?from=settings",
        }),
      }),
    );
    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe("https://stripe.example/portal");
  });

  it("falls back to the default billing path for cross-origin referers", async () => {
    fetchMock.mockResolvedValue(createJsonResponse({ url: "https://stripe.example/portal" }));

    const { POST } = await loadPortalRoute();
    await POST(
      new Request("https://app.example/api/billing/portal", {
        method: "POST",
        headers: {
          referer: "https://evil.example/zh/billing",
        },
      }),
    );

    expect(fetchMock).toHaveBeenCalledWith(
      "http://api.local/api/v1/billing/portal",
      expect.objectContaining({
        body: JSON.stringify({
          returnUrl: "https://app.example/billing",
        }),
      }),
    );
  });
});
