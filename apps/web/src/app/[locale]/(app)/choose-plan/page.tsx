import { redirect } from "next/navigation";
import { type PricingPlan, PricingPlanGrid } from "@/components/billing/pricing-plan-grid";
import { getAuth } from "@/lib/auth";
import { hasActivePlan } from "@/lib/billing/active-plan";
import { resolveChoosePlanRedirect } from "./redirect-target";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata = {
  title: "Choose your plan — Nebutra",
};

/**
 * Static plan catalogue rendered on /choose-plan.
 *
 * NOTE: Until the database-driven plan catalogue (see
 * `packages/commerce/billing/src/config/plan-config.ts`) is exposed via a public
 * server-readable surface, the grid uses a hand-curated list mirroring the
 * supastarter reference. Replace with `getPlanConfig().getPlans({ publicOnly:
 * true })` once the billing service is wired into apps/web.
 */
const STATIC_PLANS: PricingPlan[] = [
  {
    id: "plan_pro",
    name: "Pro",
    tier: "PRO",
    description: "For active SaaS teams running Nebutra as their operating surface.",
    features: ["10 projects", "10 team members", "Advanced analytics", "Priority support"],
    recommended: true,
    prices: [
      { id: "price_pro_month", interval: "month", amount: 2900, currency: "USD" },
      { id: "price_pro_year", interval: "year", amount: 27900, currency: "USD" },
    ],
  },
  {
    id: "plan_enterprise",
    name: "Enterprise",
    tier: "ENTERPRISE",
    description: "For regulated teams that need SSO, audit posture, and dedicated support.",
    features: ["Unlimited usage policy", "SSO/SAML", "Audit logs", "Dedicated support"],
    prices: [],
  },
];

export default async function ChoosePlanPage() {
  const { userId, orgId } = await getAuth();
  const { active } = orgId ? await hasActivePlan(orgId) : { active: false };

  const decision = resolveChoosePlanRedirect({ userId, orgId, active });
  if (decision) {
    redirect(decision.destination);
  }

  return (
    <section className="mx-auto w-full max-w-[1400px] px-4 py-12 md:px-6">
      <header className="mx-auto mb-10 max-w-2xl text-center">
        <h1 className="font-bold text-3xl text-[color:var(--neutral-12)] dark:text-white lg:text-4xl">
          Choose your plan
        </h1>
        <p className="mt-3 text-[color:var(--neutral-11)] text-sm dark:text-white/70 lg:text-base">
          Pick the plan that fits your workspace. You can switch anytime from the billing page.
        </p>
      </header>

      <PricingPlanGrid plans={STATIC_PLANS} orgId={orgId ?? undefined} />
    </section>
  );
}
