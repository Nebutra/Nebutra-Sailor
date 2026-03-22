import { AnimateIn } from "@nebutra/ui/components";
import { Card, LoadingState, PageHeader } from "@nebutra/ui/layout";
import { Suspense } from "react";
import { getGrowthSummary } from "@/lib/warehouse/gold";

async function TenantsContent() {
  const tenantId = process.env.DEFAULT_DASHBOARD_TENANT_ID || "demo_org";
  const summary = await getGrowthSummary(tenantId);

  return (
    <>
      <AnimateIn preset="fadeUp">
        <PageHeader title="Tenants" description="Workspace health and tenant-level metrics." />
      </AnimateIn>

      <AnimateIn preset="fadeUp">
        <Card className="overflow-hidden p-0">
          <div className="space-y-3 p-4 md:hidden">
            <div className="rounded-lg border border-neutral-7 bg-neutral-2 p-3 dark:border-white/10 dark:bg-white/5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-neutral-12 dark:text-white">
                    {summary.tenantId}
                  </p>
                  <p className="mt-1 text-xs text-neutral-10 dark:text-white/60">
                    Snapshot: {summary.day ?? "N/A"}
                  </p>
                </div>
                <span className="inline-flex rounded-full bg-cyan-3 px-2.5 py-1 text-xs font-medium text-cyan-11 dark:bg-(--cyan-9)/20 dark:text-cyan-9">
                  Healthy
                </span>
              </div>
              <dl className="mt-3 grid grid-cols-1 gap-x-3 gap-y-2 text-xs min-[420px]:grid-cols-2">
                <div>
                  <dt className="text-neutral-10 dark:text-white/60">Events</dt>
                  <dd className="font-medium text-neutral-12 dark:text-white">
                    {summary.totalEvents.toLocaleString()}
                  </dd>
                </div>
                <div>
                  <dt className="text-neutral-10 dark:text-white/60">Active Users</dt>
                  <dd className="font-medium text-neutral-12 dark:text-white">
                    {summary.activeUsers.toLocaleString()}
                  </dd>
                </div>
                <div className="min-[420px]:col-span-2">
                  <dt className="text-neutral-10 dark:text-white/60">Revenue</dt>
                  <dd className="font-medium text-neutral-12 dark:text-white">
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
            <div className="grid grid-cols-12 border-b border-neutral-7 bg-neutral-2 px-4 py-3 text-xs font-medium uppercase tracking-wide text-neutral-11 dark:border-white/10 dark:bg-white/5 dark:text-white/60">
              <div className="col-span-4">Tenant</div>
              <div className="col-span-2">Status</div>
              <div className="col-span-2">Events</div>
              <div className="col-span-2">Active Users</div>
              <div className="col-span-2">Revenue</div>
            </div>
            <div className="grid grid-cols-12 items-center px-4 py-4 text-sm">
              <div className="col-span-4">
                <p className="font-medium text-neutral-12 dark:text-white">{summary.tenantId}</p>
                <p className="text-xs text-neutral-10 dark:text-white/60">
                  Snapshot: {summary.day ?? "N/A"}
                </p>
              </div>
              <div className="col-span-2">
                <span className="inline-flex rounded-full bg-cyan-3 px-2.5 py-1 text-xs font-medium text-cyan-11 dark:bg-(--cyan-9)/20 dark:text-cyan-9">
                  Healthy
                </span>
              </div>
              <div className="col-span-2 text-neutral-12 dark:text-white">
                {summary.totalEvents.toLocaleString()}
              </div>
              <div className="col-span-2 text-neutral-12 dark:text-white">
                {summary.activeUsers.toLocaleString()}
              </div>
              <div className="col-span-2 text-neutral-12 dark:text-white">
                $
                {summary.revenue.toLocaleString(undefined, {
                  maximumFractionDigits: 2,
                })}
              </div>
            </div>
          </div>
        </Card>
      </AnimateIn>
    </>
  );
}

export default async function TenantsPage() {
  return (
    <section className="mx-auto w-full max-w-7xl" aria-label="Tenants">
      <Suspense fallback={<LoadingState message="Loading tenant health..." />}>
        <TenantsContent />
      </Suspense>
    </section>
  );
}
