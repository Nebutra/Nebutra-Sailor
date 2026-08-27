import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth", () => ({
  getAuth: vi.fn(),
}));

vi.mock("@/lib/billing/active-plan", () => ({
  hasActivePlan: vi.fn(),
}));

import { getAuth } from "@/lib/auth";
import { hasActivePlan } from "@/lib/billing/active-plan";

const mockedGetAuth = vi.mocked(getAuth);
const mockedHasActivePlan = vi.mocked(hasActivePlan);

async function loadRoute() {
  return import("@/app/api/billing/active-plan/route");
}

function buildAuth(overrides: Partial<Awaited<ReturnType<typeof getAuth>>> = {}) {
  return {
    userId: "user_1",
    orgId: "org_1",
    sessionClaims: { org_role: "org:admin" } as Record<string, unknown>,
    isSignedIn: true,
    ...overrides,
  } as Awaited<ReturnType<typeof getAuth>>;
}

describe("GET /api/billing/active-plan", () => {
  beforeEach(() => {
    vi.resetModules();
    mockedGetAuth.mockReset();
    mockedHasActivePlan.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns 401 when there is no session", async () => {
    mockedGetAuth.mockResolvedValue(buildAuth({ userId: null, isSignedIn: false, orgId: null }));

    const { GET } = await loadRoute();
    const response = await GET(
      new Request("https://app.example/api/billing/active-plan?orgId=org_1"),
    );

    expect(response.status).toBe(401);
    const body = (await response.json()) as { error: string };
    expect(body.error).toMatch(/auth/i);
    expect(mockedHasActivePlan).not.toHaveBeenCalled();
  });

  it("returns 400 when no orgId can be resolved", async () => {
    mockedGetAuth.mockResolvedValue(buildAuth({ orgId: null }));

    const { GET } = await loadRoute();
    const response = await GET(new Request("https://app.example/api/billing/active-plan"));

    expect(response.status).toBe(400);
    const body = (await response.json()) as { error: string };
    expect(body.error).toMatch(/org/i);
  });

  it("returns active=false + planId when session org is on a free plan", async () => {
    mockedGetAuth.mockResolvedValue(buildAuth({ orgId: "org_1" }));
    mockedHasActivePlan.mockResolvedValue({
      active: false,
      planId: "plan_free",
      planName: "Free",
      status: "free",
      currentPeriodEnd: null,
    });

    const { GET } = await loadRoute();
    const response = await GET(new Request("https://app.example/api/billing/active-plan"));

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ active: false, planId: "plan_free" });
    expect(mockedHasActivePlan).toHaveBeenCalledWith("org_1");
  });

  it("returns active=true when org has a paid plan", async () => {
    mockedGetAuth.mockResolvedValue(buildAuth({ orgId: "org_1" }));
    mockedHasActivePlan.mockResolvedValue({
      active: true,
      planId: "plan_pro",
      planName: "Pro",
      status: "active",
      currentPeriodEnd: null,
    });

    const { GET } = await loadRoute();
    const response = await GET(new Request("https://app.example/api/billing/active-plan"));

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ active: true, planId: "plan_pro" });
  });

  it("uses the orgId query param when explicitly provided and matches the session", async () => {
    mockedGetAuth.mockResolvedValue(buildAuth({ orgId: "org_session" }));
    mockedHasActivePlan.mockResolvedValue({
      active: true,
      planId: "plan_pro",
      planName: "Pro",
      status: "active",
      currentPeriodEnd: null,
    });

    const { GET } = await loadRoute();
    const response = await GET(
      new Request("https://app.example/api/billing/active-plan?orgId=org_session"),
    );

    expect(response.status).toBe(200);
    expect(mockedHasActivePlan).toHaveBeenCalledWith("org_session");
  });

  it("rejects orgId query param when it does not match the session org", async () => {
    mockedGetAuth.mockResolvedValue(buildAuth({ orgId: "org_session" }));

    const { GET } = await loadRoute();
    const response = await GET(
      new Request("https://app.example/api/billing/active-plan?orgId=org_other"),
    );

    expect(response.status).toBe(403);
    expect(mockedHasActivePlan).not.toHaveBeenCalled();
  });
});
