/**
 * Active-plan helper.
 *
 * Reads the resolved plan tier for an organization from the billing service
 * and reports whether the org currently holds a paid plan.
 *
 * The billing package (`@nebutra/billing`) exposes
 * `PlanConfigService.getConfig(organizationId)` which returns a `ResolvedConfig`
 * whose `plan.plan` field is `"FREE" | "PRO" | "ENTERPRISE"`. There is no
 * `getEffectivePlan()` export — the closest equivalent is `getConfig()`.
 *
 * To keep this helper testable and decoupled from the billing package's
 * Prisma-bound singleton, it accepts a fetcher via dependency injection.
 * Production code should pass a fetcher backed by
 * `getPlanConfig().getConfig(orgId)` once the billing package is wired into
 * the web app's runtime. Until then the default fetcher throws a documented
 * TODO and `hasActivePlan` defensively reports `inactive`.
 */
import { logger } from "@nebutra/logger";

export type PlanTier = "FREE" | "PRO" | "ENTERPRISE";

/**
 * Minimal shape returned by the billing service. Mirrors the relevant slice of
 * `ResolvedConfig` from `@nebutra/billing` so we never leak Prisma types into
 * the web app.
 */
export interface ActivePlanSnapshot {
  plan: {
    id: string;
    slug: string;
    plan: PlanTier;
  };
}

export type ActivePlanFetcher = (organizationId: string) => Promise<ActivePlanSnapshot>;

export interface HasActivePlanOptions {
  fetcher?: ActivePlanFetcher;
}

export interface HasActivePlanResult {
  active: boolean;
  planId: string | null;
}

const PAID_TIERS: ReadonlySet<string> = new Set<PlanTier>(["PRO", "ENTERPRISE"]);

export function isPaidPlanTier(tier: string | null | undefined): boolean {
  if (!tier) return false;
  return PAID_TIERS.has(tier);
}

const defaultFetcher: ActivePlanFetcher = async () => {
  // TODO: wire to PlanConfigService.getConfig() from @nebutra/billing
  // (see packages/billing/src/config/plan-config.ts). Once @nebutra/billing
  // is added to apps/web's package.json, replace with:
  //
  //   const { getPlanConfig } = await import("@nebutra/billing");
  //   return getPlanConfig().getConfig(organizationId);
  //
  // Until that wiring is done, the helper defensively reports inactive so
  // first-purchase UX never blocks legitimate users.
  throw new Error(
    "TODO: wire hasActivePlan to PlanConfigService.getConfig() from @nebutra/billing",
  );
};

/**
 * Returns whether `organizationId` currently holds a paid (non-free) plan.
 *
 * Defensive: any fetcher error (missing org, transient billing outage, the
 * default not-yet-wired fetcher) collapses to `{ active: false, planId: null }`
 * so that the first-purchase flow can still funnel the user toward checkout.
 */
export async function hasActivePlan(
  organizationId: string,
  options: HasActivePlanOptions = {},
): Promise<HasActivePlanResult> {
  if (!organizationId) {
    return { active: false, planId: null };
  }

  const fetcher = options.fetcher ?? defaultFetcher;

  try {
    const snapshot = await fetcher(organizationId);
    const tier = snapshot.plan?.plan;
    const planId = snapshot.plan?.id ?? null;
    return {
      active: isPaidPlanTier(tier),
      planId,
    };
  } catch (error) {
    logger.warn?.("hasActivePlan: defaulting to inactive after fetcher error", {
      organizationId,
      error: error instanceof Error ? error.message : String(error),
    });
    return { active: false, planId: null };
  }
}
