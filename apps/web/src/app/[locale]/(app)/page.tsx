import { AnimateIn, AnimateInGroup } from "@nebutra/ui/components";
import { Card, EmptyState, ErrorState, LoadingState, PageHeader } from "@nebutra/ui/layout";
import { dehydrate, HydrationBoundary } from "@tanstack/react-query";

import { Activity, BarChart3, Coins, Database, Rocket, UserPlus } from "lucide-react";
import { connection } from "next/server";
import { Suspense } from "react";
import { getAuth, getUser } from "@/lib/auth";
import { getQueryClient } from "@/lib/query-client";
import { getGrowthSummary } from "@/lib/warehouse/gold";

const hasClerkKey = !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

const METRICS = [
  { key: "totalEvents", label: "Total Events", icon: Database },
  { key: "activeUsers", label: "Active Users", icon: BarChart3 },
  { key: "signups", label: "Signups", icon: UserPlus },
  { key: "activations", label: "Activations", icon: Activity },
  { key: "conversions", label: "Conversions", icon: Rocket },
] as const;

function formatValue(value: number) {
  return value.toLocaleString();
}

async function DashboardContent() {
  await connection();

  let userName = "User";
  let orgName = "";
  let tenantId = process.env.DEFAULT_DASHBOARD_TENANT_ID || "demo_org";

  if (hasClerkKey) {
    const [authState, user] = await Promise.all([getAuth(), getUser()]);
    userName = user?.firstName || "User";
    orgName = (authState.sessionClaims?.org_name as string) || "";
    tenantId = authState.orgId || tenantId;
  }

  const queryClient = getQueryClient();
  await queryClient.prefetchQuery({
    queryKey: ["growth-summary", tenantId],
    queryFn: () => getGrowthSummary(tenantId),
  });

  const summary = queryClient.getQueryData<Awaited<ReturnType<typeof getGrowthSummary>>>([
    "growth-summary",
    tenantId,
  ]);

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <AnimateIn preset="fadeUp">
        <PageHeader
          title="Dashboard"
          description={
            orgName
              ? `${orgName} · Gold snapshot ${summary?.day ?? "N/A"}`
              : `Gold snapshot ${summary?.day ?? "N/A"}`
          }
          actions={
            <span className="max-w-full truncate rounded-full border border-neutral-7 bg-neutral-1 px-3 py-1 text-xs text-neutral-11 dark:border-white/10 dark:bg-black/40 dark:text-white/70">
              Tenant: {summary?.tenantId ?? tenantId}
            </span>
          }
        />
      </AnimateIn>

      {!summary ? (
        <AnimateIn preset="fadeUp">
          <ErrorState title="Unable to load dashboard data" message="Please refresh to retry." />
        </AnimateIn>
      ) : !summary.day ? (
        <AnimateIn preset="fadeUp">
          <Card className="p-8">
            <EmptyState
              title="No growth data yet"
              description="Events will appear here after your first ingestion cycle."
            />
          </Card>
        </AnimateIn>
      ) : (
        <>
          <AnimateIn preset="fadeUp">
            <Card className="mb-6 p-4 sm:p-6">
              <h2 className="text-lg font-semibold text-neutral-12 dark:text-white">
                Welcome back, {userName}.
              </h2>
              <p className="mt-2 text-sm text-neutral-11 dark:text-white/70">
                Your operational summary for {summary.day} is ready.
              </p>
            </Card>
          </AnimateIn>

          <AnimateInGroup stagger="fast" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {METRICS.map(({ key, label, icon: Icon }) => (
              <AnimateIn key={key} preset="fadeUp">
                <Card className="p-4 sm:p-6">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-medium text-neutral-11 dark:text-white/70">
                      {label}
                    </h3>
                    <Icon className="h-4 w-4 text-blue-10 dark:text-cyan-9" />
                  </div>
                  <p className="mt-3 text-3xl font-semibold text-neutral-12 dark:text-white">
                    {formatValue(summary[key])}
                  </p>
                  <p className="mt-1 text-xs text-neutral-10 dark:text-white/60">Latest day</p>
                </Card>
              </AnimateIn>
            ))}

            <AnimateIn preset="fadeUp">
              <Card className="p-4 sm:p-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-medium text-neutral-11 dark:text-white/70">
                    Revenue
                  </h3>
                  <Coins className="h-4 w-4 text-blue-10 dark:text-cyan-9" />
                </div>
                <p className="mt-3 text-3xl font-semibold text-neutral-12 dark:text-white">
                  $
                  {summary.revenue.toLocaleString(undefined, {
                    maximumFractionDigits: 2,
                  })}
                </p>
                <p className="mt-1 text-xs text-neutral-10 dark:text-white/60">Latest day (USD)</p>
              </Card>
            </AnimateIn>
          </AnimateInGroup>
        </>
      )}

      {!hasClerkKey && (
        <AnimateIn preset="fadeUp">
          <Card className="mt-6 border-[hsl(var(--warning)/0.35)] bg-[hsl(var(--warning)/0.12)] p-4 text-warning-foreground">
            <p className="text-sm">
              Clerk authentication is not configured. Set `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` and
              `CLERK_SECRET_KEY` to enable auth.
            </p>
          </Card>
        </AnimateIn>
      )}
    </HydrationBoundary>
  );
}

export default async function DashboardPage() {
  return (
    <section className="mx-auto w-full max-w-7xl">
      <Suspense fallback={<LoadingState message="Loading dashboard data…" />}>
        <DashboardContent />
      </Suspense>
    </section>
  );
}
