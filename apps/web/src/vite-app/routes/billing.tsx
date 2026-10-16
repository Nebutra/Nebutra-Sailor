import { PageHeader } from "@nebutra/ui/layout";
import { useQuery } from "@tanstack/react-query";
import { createRoute } from "@tanstack/react-router";
import { useTranslations } from "next-intl";
import { useState } from "react";
import {
  getBillingSelfService,
  readReturnedOrder,
} from "@/components/billing/billing-checkout-api";
import {
  ActivePlanCard,
  BillingProviderNotice,
  buildBillingSelfServiceModel,
} from "@/components/billing/billing-self-service";
import { CheckoutReturnNotice, OfferCheckoutGrid } from "@/components/billing/offer-checkout";
import { useSingleWorkspaceDefault } from "@/components/billing/use-billing-workspace";
import { queryKeys } from "@/lib/query-keys";
import { RoutePending } from "@/vite-app/route-states";
import { rootRoute } from "./__root";

const PRODUCT = "app";

/**
 * The product app's billing page. Everything on it comes from the gateway's
 * GET /api/v1/billing/self-service: which rail the checkout factory picked
 * (Creem for cards; WeChat Pay / Alipay first under NEBUTRA_LOCALE=cn), what to
 * set when nothing can take money yet, the organization's current plan, and
 * the offers it can buy. Back from Creem, the returned order is verified here.
 */
function BillingRoute() {
  const tc = useTranslations("copy.billingPage");
  const tu = useTranslations("billing.checkout");
  const [returnedOrder] = useState(() => readReturnedOrder(window.location.search));
  const choosingWorkspace = useSingleWorkspaceDefault();
  const selfService = useQuery({
    queryKey: queryKeys.billingSelfService.detail(PRODUCT),
    queryFn: () => getBillingSelfService(PRODUCT),
    enabled: !choosingWorkspace,
  });

  if (choosingWorkspace || selfService.isPending) return <RoutePending />;

  const data = selfService.data;
  const model = buildBillingSelfServiceModel({
    currentPlan: data?.plan?.tier ?? "FREE",
    readiness: data
      ? {
          provider: data.provider,
          status: data.status,
          title: data.title,
          description: data.description,
        }
      : {
          provider: "manual",
          status: "degraded",
          title: tu("unavailable.title"),
          description: tu("unavailable.body"),
        },
  });

  return (
    <section className="space-y-4" aria-label={tc("billing")}>
      <PageHeader title={tc("billing")} description={tc("yourPlanAndEvery")} />

      <div className="space-y-4">
        {returnedOrder && <CheckoutReturnNotice orderId={returnedOrder} />}

        <BillingProviderNotice model={model} />

        <ActivePlanCard model={model} />

        {data && <OfferCheckoutGrid offers={data.offers} methods={data.methods} />}
      </div>
    </section>
  );
}

export const billingRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/billing",
  component: BillingRoute,
});
