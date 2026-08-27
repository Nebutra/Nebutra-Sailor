import { describe, expect, it, vi } from "vitest";
import { type ActivePlanFetcher, hasActivePlan, isPaidPlanTier } from "../active-plan";

function makeFetcher(
  planTier: "FREE" | "PRO" | "ENTERPRISE",
  id = "plan_x",
  extras: { status?: string; currentPeriodEnd?: string | Date | null; name?: string } = {},
): ActivePlanFetcher {
  return vi.fn(async () => ({
    plan: { id, slug: planTier.toLowerCase(), plan: planTier, name: extras.name },
    status: extras.status as never,
    currentPeriodEnd: extras.currentPeriodEnd ?? undefined,
  }));
}

describe("isPaidPlanTier", () => {
  it("returns false for free tier", () => {
    expect(isPaidPlanTier("FREE")).toBe(false);
  });

  it("returns true for pro tier", () => {
    expect(isPaidPlanTier("PRO")).toBe(true);
  });

  it("returns true for enterprise tier", () => {
    expect(isPaidPlanTier("ENTERPRISE")).toBe(true);
  });

  it("returns false for unknown / undefined values", () => {
    expect(isPaidPlanTier(undefined)).toBe(false);
    expect(isPaidPlanTier("MYSTERY")).toBe(false);
  });
});

describe("hasActivePlan", () => {
  it("returns inactive when orgId is empty", async () => {
    const fetcher = makeFetcher("FREE");
    const result = await hasActivePlan("", { fetcher });
    expect(result.active).toBe(false);
    expect(result.planId).toBeNull();
    expect(result.status).toBe("free");
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("returns false when org is on the FREE plan", async () => {
    const fetcher = makeFetcher("FREE", "plan_free");
    const result = await hasActivePlan("org_free", { fetcher });
    expect(result.active).toBe(false);
    expect(result.planId).toBe("plan_free");
    expect(result.status).toBe("free");
    expect(result.planName).toBe("Free");
    expect(fetcher).toHaveBeenCalledWith("org_free");
  });

  it("returns true when org is on the PRO plan", async () => {
    const fetcher = makeFetcher("PRO", "plan_pro");
    const result = await hasActivePlan("org_pro", { fetcher });
    expect(result.active).toBe(true);
    expect(result.planId).toBe("plan_pro");
    expect(result.status).toBe("active");
    expect(result.planName).toBe("Pro");
  });

  it("returns true when org is on ENTERPRISE", async () => {
    const fetcher = makeFetcher("ENTERPRISE", "plan_ent");
    const result = await hasActivePlan("org_ent", { fetcher });
    expect(result.active).toBe(true);
    expect(result.planId).toBe("plan_ent");
    expect(result.planName).toBe("Enterprise");
  });

  it("preserves a fetcher-supplied plan name over the tier default", async () => {
    const fetcher = makeFetcher("PRO", "plan_pro_custom", { name: "Pro Annual" });
    const result = await hasActivePlan("org_pro", { fetcher });
    expect(result.planName).toBe("Pro Annual");
  });

  it("propagates the trialing status when the fetcher reports it", async () => {
    const fetcher = makeFetcher("PRO", "plan_pro", { status: "trialing" });
    const result = await hasActivePlan("org_trial", { fetcher });
    expect(result.status).toBe("trialing");
    expect(result.active).toBe(true);
  });

  it("propagates past_due and canceled statuses", async () => {
    const pastDue = await hasActivePlan("org_pd", {
      fetcher: makeFetcher("PRO", "plan_pro", { status: "past_due" }),
    });
    expect(pastDue.status).toBe("past_due");

    const canceled = await hasActivePlan("org_cx", {
      fetcher: makeFetcher("PRO", "plan_pro", { status: "canceled" }),
    });
    expect(canceled.status).toBe("canceled");
  });

  it("normalizes currentPeriodEnd to an ISO string", async () => {
    const date = new Date("2026-12-31T00:00:00.000Z");
    const fetcher = makeFetcher("PRO", "plan_pro", { currentPeriodEnd: date });
    const result = await hasActivePlan("org_pro", { fetcher });
    expect(result.currentPeriodEnd).toBe("2026-12-31T00:00:00.000Z");
  });

  it("returns inactive when fetcher throws (treats missing org as no plan)", async () => {
    const fetcher: ActivePlanFetcher = vi.fn(async () => {
      throw new Error("Subscription not found");
    });
    const result = await hasActivePlan("org_missing", { fetcher });
    expect(result.active).toBe(false);
    expect(result.planId).toBeNull();
    expect(result.status).toBe("free");
  });

  it("default fetcher path collapses to inactive when DB unreachable", async () => {
    // Default fetcher hits Prisma; without DB it should throw → caught → inactive.
    const result = await hasActivePlan("org_any");
    expect(result.active).toBe(false);
    expect(result.planId).toBeNull();
  });
});
