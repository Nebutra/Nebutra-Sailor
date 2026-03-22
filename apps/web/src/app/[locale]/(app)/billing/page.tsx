import { AnimateIn, AnimateInGroup } from "@nebutra/ui/components";
import { Card, EmptyState, LoadingState, PageHeader } from "@nebutra/ui/layout";
import { Suspense } from "react";
import { getGrowthSummary } from "@/lib/warehouse/gold";

function toCurrency(value: number) {
  return value.toLocaleString(undefined, {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  });
}

async function BillingContent() {
  const tenantId = process.env.DEFAULT_DASHBOARD_TENANT_ID || "demo_org";
  const summary = await getGrowthSummary(tenantId);
  const projectedMonthlyRevenue = summary.revenue * 30;

  return (
    <>
      <AnimateIn preset="fadeUp">
        <PageHeader title="Billing" description="Revenue health, invoicing, and plan status." />
      </AnimateIn>

      {!summary.day ? (
        <AnimateIn preset="fadeUp">
          <Card className="p-8">
            <EmptyState
              title="No billing metrics yet"
              description="Revenue widgets will appear once billing events are ingested."
            />
          </Card>
        </AnimateIn>
      ) : (
        <AnimateInGroup stagger="fast" className="grid gap-4 lg:grid-cols-3">
          <AnimateIn preset="fadeUp">
            <Card className="p-4 sm:p-6 lg:col-span-2">
              <h2 className="text-base font-semibold text-neutral-12 dark:text-white">
                Revenue Snapshot
              </h2>
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
            </Card>
          </AnimateIn>

          <AnimateIn preset="fadeUp">
            <Card className="p-4 sm:p-6">
              <h2 className="text-base font-semibold text-neutral-12 dark:text-white">Plan</h2>
              <p className="mt-2 text-sm text-neutral-11 dark:text-white/70">Starter</p>
              <div className="mt-4 space-y-2 text-sm text-neutral-11 dark:text-white/70">
                <p>Seats: 5 included</p>
                <p>Usage-based overage enabled</p>
                <p>Invoice cycle: Monthly</p>
              </div>
              <button
                type="button"
                className="mt-6 w-full rounded-lg bg-blue-9 px-3 py-2 text-sm font-medium text-white transition hover:bg-blue-10"
              >
                Manage Billing
              </button>
            </Card>
          </AnimateIn>
        </AnimateInGroup>
      )}
    </>
  );
}

export default async function BillingPage() {
  return (
    <section className="mx-auto w-full max-w-7xl" aria-label="Billing">
      <Suspense fallback={<LoadingState message="Loading billing overview..." />}>
        <BillingContent />
      </Suspense>
    </section>
  );
}
