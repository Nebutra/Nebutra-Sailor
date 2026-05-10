import { AnimateIn, AnimateInGroup } from "@nebutra/ui/components";
import { Card, LoadingState, PageHeader } from "@nebutra/ui/layout";
import Link from "next/link";
import { Suspense } from "react";
import {
  ActivePlanCard,
  BillingProviderNotice,
  buildBillingSelfServiceModel,
  PlanChoiceGrid,
} from "@/components/billing/billing-self-service";
import { getTenantContext } from "@/lib/auth";
import { getGrowthSummary } from "@/lib/warehouse/gold";
import {
  type BillingJourneyNotice,
  type JourneySearchParams,
  resolveBillingJourneyNotice,
} from "./journey-state";

function toCurrency(value: number) {
  return value.toLocaleString(undefined, {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  });
}

function BillingReturnNotice({ notice }: { notice: BillingJourneyNotice }) {
  const tone =
    notice.tone === "success"
      ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-950 dark:text-emerald-100"
      : "border-amber-500/30 bg-amber-500/10 text-amber-950 dark:text-amber-100";

  return (
    <div className={`rounded-2xl border p-4 ${tone}`}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="font-semibold">{notice.title}</h2>
          <p className="mt-1 max-w-3xl text-sm opacity-80">{notice.description}</p>
        </div>
        <div className="flex shrink-0 flex-col gap-2 sm:flex-row">
          <Link
            href={notice.primaryAction.href}
            className="inline-flex items-center justify-center rounded-xl bg-neutral-12 px-4 py-2 text-sm font-medium text-white transition hover:bg-neutral-11 dark:bg-white dark:text-black dark:hover:bg-white/90"
          >
            {notice.primaryAction.label}
          </Link>
          {notice.secondaryAction && (
            <Link
              href={notice.secondaryAction.href}
              className="inline-flex items-center justify-center rounded-xl border border-current/20 px-4 py-2 text-sm font-medium transition hover:bg-white/20"
            >
              {notice.secondaryAction.label}
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

async function BillingContent({ journeyNotice }: { journeyNotice: BillingJourneyNotice | null }) {
  const tenant = await getTenantContext();
  const tenantId = tenant.tenantId ?? process.env.DEFAULT_DASHBOARD_TENANT_ID ?? "demo_org";
  const billingModel = buildBillingSelfServiceModel({ currentPlan: tenant.plan });
  const summary = await getGrowthSummary(tenantId);
  const projectedMonthlyRevenue = summary.revenue * 30;

  return (
    <>
      <AnimateIn preset="fadeUp">
        <PageHeader
          title="Billing"
          description="Review the active plan, change configured plans, and manage hosted billing when provider setup is available."
        />
      </AnimateIn>

      <AnimateInGroup stagger="fast" className="space-y-4">
        {journeyNotice && (
          <AnimateIn preset="fadeUp">
            <BillingReturnNotice notice={journeyNotice} />
          </AnimateIn>
        )}

        <AnimateIn preset="fadeUp">
          <BillingProviderNotice model={billingModel} />
        </AnimateIn>

        <AnimateIn preset="fadeUp">
          <ActivePlanCard model={billingModel} />
        </AnimateIn>

        <AnimateIn preset="fadeUp">
          <section aria-labelledby="change-plan-heading">
            <div className="mb-3">
              <h2
                id="change-plan-heading"
                className="text-base font-semibold text-neutral-12 dark:text-white"
              >
                Change plan
              </h2>
              <p className="mt-1 text-sm text-neutral-11 dark:text-white/70">
                Paid checkout is only active for plans with configured provider price ids.
              </p>
            </div>
            <PlanChoiceGrid plans={billingModel.plans} />
          </section>
        </AnimateIn>

        <AnimateIn preset="fadeUp">
          <Card className="p-4 sm:p-6">
            <h2 className="text-base font-semibold text-neutral-12 dark:text-white">
              Revenue Snapshot
            </h2>
            {summary.day ? (
              <>
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <div>
                    <p className="text-sm text-neutral-11 dark:text-white/70">Today</p>
                    <p className="mt-1 text-2xl font-semibold text-neutral-12 dark:text-white">
                      {toCurrency(summary.revenue)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-neutral-11 dark:text-white/70">30-day Projection</p>
                    <p className="mt-1 text-2xl font-semibold text-neutral-12 dark:text-white">
                      {toCurrency(projectedMonthlyRevenue)}
                    </p>
                  </div>
                </div>
                <p className="mt-4 text-xs text-neutral-10 dark:text-white/60">
                  Based on the latest daily warehouse snapshot ({summary.day}).
                </p>
              </>
            ) : (
              <p className="mt-3 text-sm text-neutral-11 dark:text-white/70">
                Revenue widgets will appear once billing events are ingested.
              </p>
            )}
          </Card>
        </AnimateIn>
      </AnimateInGroup>
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
    <section className="mx-auto w-full max-w-7xl" aria-label="Billing">
      <Suspense fallback={<LoadingState message="Loading billing overview..." />}>
        <BillingContent journeyNotice={journeyNotice} />
      </Suspense>
    </section>
  );
}
