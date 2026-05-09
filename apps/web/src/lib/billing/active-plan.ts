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

export type SubscriptionStatus = "active" | "trialing" | "past_due" | "canceled" | "free";

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
    name?: string;
  };
  status?: SubscriptionStatus;
  currentPeriodEnd?: string | Date | null;
}

export type ActivePlanFetcher = (organizationId: string) => Promise<ActivePlanSnapshot>;

export interface HasActivePlanOptions {
  fetcher?: ActivePlanFetcher;
}

export interface HasActivePlanResult {
  active: boolean;
  planId: string | null;
  planName: string | null;
  status: SubscriptionStatus;
  currentPeriodEnd: string | null;
}

const PAID_TIERS: ReadonlySet<string> = new Set<PlanTier>(["PRO", "ENTERPRISE"]);
const VALID_STATUSES: ReadonlySet<string> = new Set<SubscriptionStatus>([
  "active",
  "trialing",
  "past_due",
  "canceled",
  "free",
]);

export function isPaidPlanTier(tier: string | null | undefined): boolean {
  if (!tier) return false;
  return PAID_TIERS.has(tier);
}

function normalizeStatus(
  status: SubscriptionStatus | string | undefined,
  isPaid: boolean,
): SubscriptionStatus {
  if (status && VALID_STATUSES.has(status)) {
    return status as SubscriptionStatus;
  }
  return isPaid ? "active" : "free";
}

function normalizePeriodEnd(value: string | Date | null | undefined): string | null {
  if (!value) return null;
  if (value instanceof Date) return value.toISOString();
  // accept already-serialized ISO strings or anything Date can parse
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

function titleizeTier(tier: PlanTier | undefined): string {
  switch (tier) {
    case "PRO":
      return "Pro";
    case "ENTERPRISE":
      return "Enterprise";
    default:
      return "Free";
  }
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
 * Returns whether `organizationId` currently holds a paid (non-free) plan,
 * along with the plan id, plan name, status, and current period end date.
 *
 * Defensive: any fetcher error (missing org, transient billing outage, the
 * default not-yet-wired fetcher) collapses to an inactive result so that the
 * first-purchase flow can still funnel the user toward checkout.
 */
export async function hasActivePlan(
  organizationId: string,
  options: HasActivePlanOptions = {},
): Promise<HasActivePlanResult> {
  if (!organizationId) {
    return {
      active: false,
      planId: null,
      planName: null,
      status: "free",
      currentPeriodEnd: null,
    };
  }

  const fetcher = options.fetcher ?? defaultFetcher;

  try {
    const snapshot = await fetcher(organizationId);
    const tier = snapshot.plan?.plan;
    const planId = snapshot.plan?.id ?? null;
    const planName = snapshot.plan?.name ?? titleizeTier(tier);
    const isPaid = isPaidPlanTier(tier);
    return {
      active: isPaid,
      planId,
      planName,
      status: normalizeStatus(snapshot.status, isPaid),
      currentPeriodEnd: normalizePeriodEnd(snapshot.currentPeriodEnd),
    };
  } catch (error) {
    logger.warn?.("hasActivePlan: defaulting to inactive after fetcher error", {
      organizationId,
      error: error instanceof Error ? error.message : String(error),
    });
    return {
      active: false,
      planId: null,
      planName: null,
      status: "free",
      currentPeriodEnd: null,
    };
  }
}
