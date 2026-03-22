import { AnimateIn, AnimateInGroup } from "@nebutra/ui/components";
import { Card, EmptyState, LoadingState, PageHeader } from "@nebutra/ui/layout";
import { Suspense } from "react";
import { GrowthAreaChart } from "@/components/charts/GrowthAreaChart";
import { RevenueBarChart } from "@/components/charts/RevenueBarChart";
import { getGrowthSummary, getGrowthTimeSeries } from "@/lib/warehouse/gold";

function toPercent(numerator: number, denominator: number) {
  if (!denominator) return "0.0%";
  return `${((numerator / denominator) * 100).toFixed(1)}%`;
}

function toCurrency(value: number) {
  return value.toLocaleString(undefined, {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  });
}

async function AnalyticsContent() {
  const tenantId = process.env.DEFAULT_DASHBOARD_TENANT_ID || "demo_org";

  const [summary, series] = await Promise.all([
    getGrowthSummary(tenantId),
    getGrowthTimeSeries(tenantId, 30),
  ]);

  const activationRate = toPercent(summary.activations, summary.signups);
  const conversionRate = toPercent(summary.conversions, summary.activations);
  const arpu = summary.activeUsers > 0 ? summary.revenue / summary.activeUsers : 0;

  return (
    <>
      <AnimateIn preset="fadeUp">
        <PageHeader
          title="Analytics"
          description={`Funnel and efficiency metrics · ${summary.day ?? "No data yet"}`}
        />
      </AnimateIn>

      {!summary.day ? (
        <AnimateIn preset="fadeUp">
          <Card className="p-8">
            <EmptyState
              title="No analytics data yet"
              description="Run ingestion and transformation jobs to populate funnel metrics."
            />
          </Card>
        </AnimateIn>
      ) : (
        <>
          {/* KPI cards */}
          <AnimateInGroup stagger="fast" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <AnimateIn preset="fadeUp">
              <Card className="p-4 sm:p-6">
                <p className="text-sm text-neutral-11 dark:text-white/70">Activation Rate</p>
                <p className="mt-2 text-3xl font-semibold text-neutral-12 dark:text-white">
                  {activationRate}
                </p>
                <p className="mt-1 text-xs text-neutral-10 dark:text-white/60">
                  Activations / Signups
                </p>
              </Card>
            </AnimateIn>

            <AnimateIn preset="fadeUp">
              <Card className="p-4 sm:p-6">
                <p className="text-sm text-neutral-11 dark:text-white/70">Conversion Rate</p>
                <p className="mt-2 text-3xl font-semibold text-neutral-12 dark:text-white">
                  {conversionRate}
                </p>
                <p className="mt-1 text-xs text-neutral-10 dark:text-white/60">
                  Conversions / Activations
                </p>
              </Card>
            </AnimateIn>

            <AnimateIn preset="fadeUp">
              <Card className="p-4 sm:p-6">
                <p className="text-sm text-neutral-11 dark:text-white/70">ARPU</p>
                <p className="mt-2 text-3xl font-semibold text-neutral-12 dark:text-white">
                  {toCurrency(arpu)}
                </p>
                <p className="mt-1 text-xs text-neutral-10 dark:text-white/60">
                  Revenue / Active Users
                </p>
              </Card>
            </AnimateIn>

            <AnimateIn preset="fadeUp">
              <Card className="p-4 sm:p-6">
                <p className="text-sm text-neutral-11 dark:text-white/70">Total Events</p>
                <p className="mt-2 text-3xl font-semibold text-neutral-12 dark:text-white">
                  {summary.totalEvents.toLocaleString()}
                </p>
                <p className="mt-1 text-xs text-neutral-10 dark:text-white/60">
                  Last daily snapshot
                </p>
              </Card>
            </AnimateIn>
          </AnimateInGroup>

          {/* Charts row */}
          <AnimateInGroup stagger="normal" className="mt-6 grid gap-6 lg:grid-cols-2">
            <AnimateIn preset="fadeUp">
              <Card className="p-4 sm:p-6">
                <p className="mb-4 text-sm font-semibold text-[var(--neutral-12)]">
                  Funnel — 30 days
                </p>
                <GrowthAreaChart series={series} />
              </Card>
            </AnimateIn>

            <AnimateIn preset="fadeUp">
              <Card className="p-4 sm:p-6">
                <p className="mb-4 text-sm font-semibold text-[var(--neutral-12)]">
                  Revenue — 30 days
                </p>
                <RevenueBarChart series={series} />
              </Card>
            </AnimateIn>
          </AnimateInGroup>
        </>
      )}
    </>
  );
}

export default async function AnalyticsPage() {
  return (
    <section className="mx-auto w-full max-w-7xl" aria-label="Analytics">
      <Suspense fallback={<LoadingState message="Loading analytics..." />}>
        <AnalyticsContent />
      </Suspense>
    </section>
  );
}
