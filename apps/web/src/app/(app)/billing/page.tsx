import { LoadingState, PageHeader } from "@nebutra/ui/layout";
import Link from "next/link";
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
  const tenant = await getTenantContext();
  const billingModel = buildBillingSelfServiceModel({ currentPlan: tenant.plan });

  return (
    <>
      <PageHeader
        title="Billing"
        description="Your plan, and every order paid for any product in this organization."
      />

      <div className="space-y-4">
        {journeyNotice && <BillingReturnNotice notice={journeyNotice} />}

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
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const journeyNotice = resolveBillingJourneyNotice(resolvedSearchParams);

  return (
    <section className="mx-auto w-full max-w-wide" aria-label="Billing">
      <Suspense fallback={<LoadingState message="Loading billing overview..." />}>
        <BillingContent journeyNotice={journeyNotice} />
      </Suspense>
    </section>
  );
}
