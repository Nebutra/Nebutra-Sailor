import { resolveBillingProviderReadiness } from "@nebutra/billing";
import { LoadingState, PageHeader } from "@nebutra/ui/layout";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import {
  ActivePlanCard,
  buildBillingSelfServiceModel,
} from "@/components/billing/billing-self-service";
import { OrderHistory } from "@/components/billing/order-history";
import { getTenantContext } from "@/lib/auth";
import {
  type BillingJourneyNotice,
  type JourneySearchParams,
  resolveBillingJourneyNotice,
} from "./journey-state";

function BillingReturnNotice({ notice }: { notice: BillingJourneyNotice }) {
  const tone =
    notice.tone === "success"
      ? "border-success/30 bg-success/10 text-success-strong"
      : "border-warning/30 bg-warning/10 text-warning-strong";

  return (
    <div className={`rounded-[var(--radius-2xl)] border p-4 ${tone}`}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="font-semibold">{notice.title}</h2>
          <p className="mt-1 max-w-3xl text-sm opacity-80">{notice.description}</p>
        </div>
        <div className="flex shrink-0 flex-col gap-2 sm:flex-row">
          <Link
            href={notice.primaryAction.href}
            className="inline-flex items-center justify-center rounded-[var(--radius-xl)] bg-neutral-12 px-4 py-2 text-sm font-medium text-neutral-1 transition hover:bg-neutral-11"
          >
            {notice.primaryAction.label}
          </Link>
          {notice.secondaryAction && (
            <Link
              href={notice.secondaryAction.href}
              className="inline-flex items-center justify-center rounded-[var(--radius-xl)] border border-current/30 px-4 py-2 text-sm font-medium transition hover:bg-current/10"
            >
              {notice.secondaryAction.label}
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * The account ledger (ADR 2026-09-27 product wallets): the organization's plan
 * and every order it paid, across products. Buying happens on each product's
 * own page and on /checkout, never here — which is why the plan grid that
 * could not sell anything is gone, and the revenue snapshot, an operator's
 * number, went with it.
 */
async function BillingContent({ journeyNotice }: { journeyNotice: BillingJourneyNotice | null }) {
  const tc = await getTranslations("copy.billingPage");
  const tenant = await getTenantContext();
  // Provider readiness comes from the checkout factory (@nebutra/billing), never
  // from env sniffing here: the plan portal is the legacy Stripe path and opens
  // only with BILLING_PROVIDER=stripe (ADR 2026-09-26).
  const billingModel = buildBillingSelfServiceModel({
    currentPlan: tenant.plan,
    env: process.env,
    readiness: resolveBillingProviderReadiness({
      selfServiceEnabled:
        process.env.FEATURE_FLAG_BILLING === "true" &&
        process.env.NEBUTRA_BILLING_CHECKOUT_MODE !== "none",
      requiredPriceEnvVars: ["STRIPE_PRICE_ID_PRO_MONTHLY", "STRIPE_PRICE_ID_PRO_YEARLY"],
    }),
  });

  return (
    <>
      <PageHeader title={tc("billing")} description={tc("yourPlanAndEvery")} />

      <div>
        {journeyNotice && (
          <div className="mb-8">
            <BillingReturnNotice notice={journeyNotice} />
          </div>
        )}

        <ActivePlanCard model={billingModel} />

        <OrderHistory />
      </div>
    </>
  );
}

interface BillingPageProps {
  // Next.js 16 PageProps constraint requires searchParams to be a Promise (not
  // a plain object union). The runtime always awaits it via `await searchParams`
  // below, so this is purely a type-level adjustment.
  searchParams?: Promise<JourneySearchParams>;
}

export default async function BillingPage({ searchParams }: BillingPageProps) {
  const tCopy = await getTranslations("copy.billingPage");
  const tc = await getTranslations("copy.billingPage");
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const journeyNotice = resolveBillingJourneyNotice(resolvedSearchParams);

  return (
    <section className="mx-auto w-full max-w-wide" aria-label={tc("billing")}>
      <Suspense fallback={<LoadingState message={tCopy("loadingBillingOverview")} />}>
        <BillingContent journeyNotice={journeyNotice} />
      </Suspense>
    </section>
  );
}
