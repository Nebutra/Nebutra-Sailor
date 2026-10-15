import { LoadingState, PageHeader } from "@nebutra/ui/layout";
import { Card } from "@nebutra/ui/primitives";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { getGrowthSummary } from "@/lib/warehouse/gold";

async function TenantsContent() {
  const tc = await getTranslations("copy.tenantsPage");
  const tenantId = process.env.DEFAULT_DASHBOARD_TENANT_ID || "demo_org";
  const summary = await getGrowthSummary(tenantId);

  return (
    <>
      <PageHeader title={tc("tenants")} description={tc("workspaceHealthAndTenant")} />

      <Card className="overflow-hidden p-0">
        <div className="space-y-3 p-4 md:hidden">
          <div className="rounded-[var(--radius-lg)] border border-neutral-7 bg-neutral-2 p-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-neutral-12">{summary.tenantId}</p>
                <p className="mt-1 text-xs text-neutral-10">
                  {tc("snapshot", { value0: summary.day ?? "N/A" })}
                </p>
              </div>
              <span className="inline-flex rounded-full bg-cyan-3 px-2.5 py-1 text-xs font-medium text-cyan-11 dark:bg-(--cyan-9)/20 dark:text-cyan-9">
                {tc("healthy")}
              </span>
            </div>
            <dl className="mt-3 grid grid-cols-1 gap-x-3 gap-y-2 text-xs xs:grid-cols-2">
              <div>
                <dt className="text-neutral-10">{tc("events")}</dt>
                <dd className="font-medium text-neutral-12">
                  {summary.totalEvents.toLocaleString()}
                </dd>
              </div>
              <div>
                <dt className="text-neutral-10">{tc("activeUsers")}</dt>
                <dd className="font-medium text-neutral-12">
                  {summary.activeUsers.toLocaleString()}
                </dd>
              </div>
              <div className="xs:col-span-2">
                <dt className="text-neutral-10">{tc("revenue")}</dt>
                <dd className="font-medium text-neutral-12">
                  $
                  {summary.revenue.toLocaleString(undefined, {
                    maximumFractionDigits: 2,
                  })}
                </dd>
              </div>
            </dl>
          </div>
        </div>

        <div className="hidden md:block">
          <div className="grid grid-cols-12 border-b border-neutral-7 bg-neutral-2 px-4 py-3 text-xs font-medium uppercase tracking-wide text-neutral-11">
            <div className="col-span-4">{tc("tenant")}</div>
            <div className="col-span-2">{tc("status")}</div>
            <div className="col-span-2">{tc("events")}</div>
            <div className="col-span-2">{tc("activeUsers")}</div>
            <div className="col-span-2">{tc("revenue")}</div>
          </div>
          <div className="grid grid-cols-12 items-center px-4 py-4 text-sm">
            <div className="col-span-4">
              <p className="font-medium text-neutral-12">{summary.tenantId}</p>
              <p className="text-xs text-neutral-10">
                {tc("snapshot", { value0: summary.day ?? "N/A" })}
              </p>
            </div>
            <div className="col-span-2">
              <span className="inline-flex rounded-full bg-cyan-3 px-2.5 py-1 text-xs font-medium text-cyan-11 dark:bg-(--cyan-9)/20 dark:text-cyan-9">
                {tc("healthy")}
              </span>
            </div>
            <div className="col-span-2 text-neutral-12">{summary.totalEvents.toLocaleString()}</div>
            <div className="col-span-2 text-neutral-12">{summary.activeUsers.toLocaleString()}</div>
            <div className="col-span-2 text-neutral-12">
              $
              {summary.revenue.toLocaleString(undefined, {
                maximumFractionDigits: 2,
              })}
            </div>
          </div>
        </div>
      </Card>
    </>
  );
}

export default async function TenantsPage() {
  const tc = await getTranslations("copy.tenantsPage");
  return (
    <section className="mx-auto w-full max-w-wide" aria-label={tc("tenants")}>
      <Suspense fallback={<LoadingState message="Loading tenant health..." />}>
        <TenantsContent />
      </Suspense>
    </section>
  );
}
