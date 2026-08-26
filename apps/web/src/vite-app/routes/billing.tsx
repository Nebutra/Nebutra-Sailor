import { Card, PageHeader } from "@nebutra/ui/layout";
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
      <PageHeader
        title="Billing"
        description="Plan display is browser-rendered; checkout, portal, metering, and credits remain gateway-owned."
      />

      <div className="space-y-4">
        <BillingProviderNotice model={billingModel} />

        <ActivePlanCard model={billingModel} />

        <PlanChoiceGrid plans={billingModel.plans} />

        <Card className="p-4 sm:p-6">
          <h2 className="text-base font-semibold text-neutral-12">Revenue Snapshot</h2>
          <p className="mt-2 text-sm text-neutral-11">
            Warehouse-backed revenue reads are a server-side legacy dependency and are tracked for
            gateway/BFF归位 rather than imported into the Vite browser bundle.
          </p>
        </Card>
      </div>
    </section>
  );
}

export const billingRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/billing",
  component: BillingRoute,
});
