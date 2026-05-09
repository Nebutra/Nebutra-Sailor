/**
 * Active-plan helper.
 *
 * Reads the resolved plan tier for an organization and reports whether the org
 * currently holds a paid plan.
 *
 * Production read path: queries `Organization.plan` directly from Prisma. This
 * is intentionally simpler than going through `@nebutra/billing`'s
 * `PlanConfigService` — that service requires explicit `init()` with a cache
 * adapter and a Prisma client, neither of which is wired at the web app's
 * startup yet. Reading `Organization.plan` is the same source of truth the
 * webhook handlers write to, so behavior is equivalent without the init dance.
 *
 * Tests inject a fetcher to bypass the DB.
 */
import { logger } from "@nebutra/logger";
import { db } from "../db";

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

const defaultFetcher: ActivePlanFetcher = async (organizationId) => {
  const org = await db.organization.findUnique({
    where: { id: organizationId },
    select: { id: true, plan: true, slug: true },
  });

  if (!org) {
    throw new Error(`Organization ${organizationId} not found`);
  }

  return {
    plan: {
      id: org.id,
      slug: org.slug,
      plan: org.plan as PlanTier,
    },
  };
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
