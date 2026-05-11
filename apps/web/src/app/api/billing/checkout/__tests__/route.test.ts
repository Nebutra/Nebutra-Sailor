import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth", () => ({
  getAuth: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  db: {
    organizationMember: {
      count: vi.fn(),
    },
  },
}));

vi.mock("@/lib/api/client", () => ({
  API_BASE_URL: "https://api.example",
}));

import { getAuth } from "@/lib/auth";
import { db } from "@/lib/db";

const mockedGetAuth = vi.mocked(getAuth);
const mockedCount = vi.mocked(db.organizationMember.count);

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
    mockedCount.mockReset();
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

    const response = await POST(jsonRequest({ priceId: "price_pro" }));
    expect(response.status).toBe(503);
  });

  it("returns 400 when priceId is missing or malformed", async () => {
    const { POST } = await loadRoute();

    const response = await POST(jsonRequest({ priceId: "not-a-stripe-id" }));
    expect(response.status).toBe(400);
  });

  it("forwards a non-seat-based checkout without a quantity field", async () => {
    // Route now calls getAuth() for audit logging — return anonymous shape
    // so destructuring works and audit is skipped (no tenant).
    mockedGetAuth.mockResolvedValue(buildAuth(null));

    const { POST } = await loadRoute();

    const response = await POST(jsonRequest({ priceId: "price_pro_month" }));
    expect(response.status).toBe(303);
    expect(fetchSpy).toHaveBeenCalledTimes(1);

    const [, init] = fetchSpy.mock.calls[0];
    const upstreamBody = JSON.parse((init as RequestInit).body as string);
    expect(upstreamBody.priceId).toBe("price_pro_month");
    expect(upstreamBody.quantity).toBeUndefined();
    expect(mockedCount).not.toHaveBeenCalled();
  });

  it("counts org members and forwards them as quantity when seatBased is true", async () => {
    mockedGetAuth.mockResolvedValue(buildAuth("org_seats"));
    mockedCount.mockResolvedValue(7);

    const { POST } = await loadRoute();
    const response = await POST(jsonRequest({ priceId: "price_pro_seat", seatBased: true }));

    expect(response.status).toBe(303);
    expect(mockedCount).toHaveBeenCalledWith({ where: { organizationId: "org_seats" } });

    const [, init] = fetchSpy.mock.calls[0];
    const upstreamBody = JSON.parse((init as RequestInit).body as string);
    expect(upstreamBody.priceId).toBe("price_pro_seat");
    expect(upstreamBody.quantity).toBe(7);
  });

  it("respects an explicit seats override when provided", async () => {
    mockedGetAuth.mockResolvedValue(buildAuth("org_override"));

    const { POST } = await loadRoute();
    const response = await POST(
      jsonRequest({ priceId: "price_pro_seat", seatBased: true, seats: 12 }),
    );

    expect(response.status).toBe(303);
    expect(mockedCount).not.toHaveBeenCalled();

    const [, init] = fetchSpy.mock.calls[0];
    const upstreamBody = JSON.parse((init as RequestInit).body as string);
    expect(upstreamBody.quantity).toBe(12);
  });

  it("falls back to no quantity if seat lookup fails for a seatBased plan", async () => {
    mockedGetAuth.mockResolvedValue(buildAuth("org_db_down"));
    mockedCount.mockRejectedValue(new Error("db down"));

    const { POST } = await loadRoute();
    const response = await POST(jsonRequest({ priceId: "price_pro_seat", seatBased: true }));

    expect(response.status).toBe(303);
    const [, init] = fetchSpy.mock.calls[0];
    const upstreamBody = JSON.parse((init as RequestInit).body as string);
    expect(upstreamBody.quantity).toBeUndefined();
  });

  it("uses minimum of 1 seat when org has zero members", async () => {
    mockedGetAuth.mockResolvedValue(buildAuth("org_empty"));
    mockedCount.mockResolvedValue(0);

    const { POST } = await loadRoute();
    await POST(jsonRequest({ priceId: "price_pro_seat", seatBased: true }));

    const [, init] = fetchSpy.mock.calls[0];
    const upstreamBody = JSON.parse((init as RequestInit).body as string);
    expect(upstreamBody.quantity).toBe(1);
  });
});
