import { describe, expect, it, vi } from "vitest";
import { type ActivePlanFetcher, hasActivePlan, isPaidPlanTier } from "../active-plan";

function makeFetcher(planTier: "FREE" | "PRO" | "ENTERPRISE", id = "plan_x"): ActivePlanFetcher {
  return vi.fn(async () => ({
    plan: { id, slug: planTier.toLowerCase(), plan: planTier },
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
  it("returns false when orgId is empty", async () => {
    const fetcher = makeFetcher("FREE");
    expect(await hasActivePlan("", { fetcher })).toEqual({ active: false, planId: null });
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("returns false when org is on the FREE plan", async () => {
    const fetcher = makeFetcher("FREE", "plan_free");
    const result = await hasActivePlan("org_free", { fetcher });
    expect(result).toEqual({ active: false, planId: "plan_free" });
    expect(fetcher).toHaveBeenCalledWith("org_free");
  });

  it("returns true when org is on the PRO plan", async () => {
    const fetcher = makeFetcher("PRO", "plan_pro");
    const result = await hasActivePlan("org_pro", { fetcher });
    expect(result).toEqual({ active: true, planId: "plan_pro" });
  });

  it("returns true when org is on ENTERPRISE", async () => {
    const fetcher = makeFetcher("ENTERPRISE", "plan_ent");
    const result = await hasActivePlan("org_ent", { fetcher });
    expect(result).toEqual({ active: true, planId: "plan_ent" });
  });

  it("returns inactive when fetcher throws (treats missing org as no plan)", async () => {
    const fetcher: ActivePlanFetcher = vi.fn(async () => {
      throw new Error("Subscription not found");
    });
    const result = await hasActivePlan("org_missing", { fetcher });
    expect(result).toEqual({ active: false, planId: null });
  });

  it("default fetcher throws an actionable TODO when @nebutra/billing isn't wired", async () => {
    // No fetcher injected → default path. We expect a helpful error so the operator
    // knows where to wire it. We then catch via the hasActivePlan path which converts
    // to inactive (defensive).
    const result = await hasActivePlan("org_any");
    // default fetcher throws → caught → inactive
    expect(result).toEqual({ active: false, planId: null });
  });
});
