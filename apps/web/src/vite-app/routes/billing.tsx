import { PageHeader } from "@nebutra/ui/layout";
import { createRoute } from "@tanstack/react-router";
import {
  ActivePlanCard,
  BillingProviderNotice,
  buildBillingSelfServiceModel,
  PlanChoiceGrid,
} from "@/components/billing/billing-self-service";
import { getVitePublicEnv } from "@/vite-app/app-env";
import { rootRoute } from "./__root";

function BillingRoute() {
  const billingModel = buildBillingSelfServiceModel({
    currentPlan: "FREE",
    env: getVitePublicEnv(),
  });

  return (
    <section className="space-y-4" aria-label="Billing">
      <PageHeader title="Billing" description="Your plan, and what each plan includes." />

      <div className="space-y-4">
        <BillingProviderNotice model={billingModel} />

        <ActivePlanCard model={billingModel} />

        <PlanChoiceGrid plans={billingModel.plans} />
      </div>
    </section>
  );
}

export const billingRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/billing",
  component: BillingRoute,
});
