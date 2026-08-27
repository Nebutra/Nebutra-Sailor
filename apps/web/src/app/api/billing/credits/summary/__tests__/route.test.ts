import { beforeEach, describe, expect, it, vi } from "vitest";

const getAuth = vi.fn();
const getCreditAllowanceForPlan = vi.fn();
const getCreditBalance = vi.fn();
const getCreditTransactions = vi.fn();

vi.mock("@/lib/auth", () => ({
  getAuth: (request: Request) => getAuth(request),
}));

vi.mock("@nebutra/billing/credits", () => ({
  formatCredits: (credits: number, _currency = "USD") => `$${(credits / 100).toFixed(2)}`,
  getCreditAllowanceForPlan: (plan: string) => getCreditAllowanceForPlan(plan),
  getCreditBalance: (organizationId: string) => getCreditBalance(organizationId),
  getCreditTransactions: (organizationId: string, options: unknown) =>
    getCreditTransactions(organizationId, options),
}));

vi.mock("@nebutra/logger", () => ({
  logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn() },
}));

describe("GET /api/billing/credits/summary", () => {
  beforeEach(() => {
    vi.resetModules();
    getAuth.mockReset();
    getCreditAllowanceForPlan.mockReset();
    getCreditBalance.mockReset();
    getCreditTransactions.mockReset();
  });

  it("rejects unauthenticated requests", async () => {
    getAuth.mockResolvedValue({ userId: null, orgId: null, sessionClaims: {} });

    const { GET } = await import("../route");
    const response = await GET(new Request("https://app.nebutra.com/api/billing/credits/summary"));

    expect(response.status).toBe(401);
    expect(getCreditBalance).not.toHaveBeenCalled();
  });

  it("rejects requests without an active organization", async () => {
    getAuth.mockResolvedValue({ userId: "user_1", orgId: null, sessionClaims: {} });

    const { GET } = await import("../route");
    const response = await GET(new Request("https://app.nebutra.com/api/billing/credits/summary"));

    expect(response.status).toBe(400);
    expect(getCreditBalance).not.toHaveBeenCalled();
  });

  it("returns balance, plan allowance, and recent credit ledger entries for the active org", async () => {
    getAuth.mockResolvedValue({
      userId: "user_1",
      orgId: "org_1",
      sessionClaims: { org_plan: "PRO" },
    });
    getCreditAllowanceForPlan.mockReturnValue({
      plan: "PRO",
      includedMonthly: 10_000,
      dailyRefresh: 1000,
      refreshTime: "08:00 UTC",
    });
    getCreditBalance.mockResolvedValue({ organizationId: "org_1", balance: 1509, currency: "USD" });
    getCreditTransactions.mockResolvedValue([
      {
        id: "tx_usage",
        organizationId: "org_1",
        type: "USAGE",
        amount: -153,
        balanceAfter: 1509,
        description: "Agent task",
        relatedId: "run_1",
        metadata: { source: "agent" },
        createdAt: new Date("2026-06-05T09:00:00.000Z"),
      },
    ]);

    const { GET } = await import("../route");
    const response = await GET(new Request("https://app.nebutra.com/api/billing/credits/summary"));

    expect(response.status).toBe(200);
    expect(getCreditBalance).toHaveBeenCalledWith("org_1");
    expect(getCreditTransactions).toHaveBeenCalledWith("org_1", { limit: 10 });
    await expect(response.json()).resolves.toEqual({
      balance: {
        amount: 1509,
        currency: "USD",
        formatted: "$15.09",
      },
      allowance: {
        plan: "PRO",
        includedMonthly: 10_000,
        dailyRefresh: 1000,
        refreshTime: "08:00 UTC",
      },
      transactions: [
        {
          id: "tx_usage",
          type: "USAGE",
          amount: -153,
          balanceAfter: 1509,
          description: "Agent task",
          relatedId: "run_1",
          metadata: { source: "agent" },
          createdAt: "2026-06-05T09:00:00.000Z",
        },
      ],
    });
  });
});
