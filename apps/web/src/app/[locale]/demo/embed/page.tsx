import { Card } from "@nebutra/ui/layout";
import { BarChart3, Coins, Database, Users } from "lucide-react";
import Link from "next/link";
import { connection } from "next/server";
import { getGrowthSummary } from "@/lib/warehouse/gold";

const DEMO_TABS = [
  { id: "analytics", label: "Analytics" },
  { id: "billing", label: "Billing" },
  { id: "tenants", label: "Tenants" },
] as const;

type DemoTabId = (typeof DEMO_TABS)[number]["id"];

function resolveTab(view: string | undefined): DemoTabId {
  if (view === "billing" || view === "tenants") return view;
  return "analytics";
}

function toCurrency(value: number) {
  return value.toLocaleString(undefined, {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  });
}

export default async function DemoEmbedPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>;
}) {
  await connection();
  const params = await searchParams;
  const activeTab = resolveTab(params.view);
  const summary = await getGrowthSummary(process.env.DEFAULT_DASHBOARD_TENANT_ID || "demo_org");

  return (
    <main className="min-h-screen bg-[color:var(--neutral-2)] p-4 text-[color:var(--neutral-12)] dark:bg-black dark:text-white">
      <div className="mx-auto max-w-5xl">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold tracking-[0.12em] text-[color:var(--blue-11)] uppercase">
              Interactive demo
            </p>
            <h1 className="text-lg font-semibold">Nebutra Sailor Dashboard</h1>
          </div>
          <div className="flex flex-wrap gap-2">
            {DEMO_TABS.map((tab) => (
              <Link
                key={tab.id}
                href={`/demo/embed?view=${tab.id}`}
                className={`rounded-[var(--radius-lg)] px-3 py-1.5 text-sm font-medium transition-colors ${
                  activeTab === tab.id
                    ? "bg-[color:var(--blue-9)] text-white"
                    : "bg-[color:var(--neutral-1)] text-[color:var(--neutral-11)] hover:text-[color:var(--neutral-12)] dark:bg-white/10 dark:text-white/70 dark:hover:text-white"
                }`}
              >
                {tab.label}
              </Link>
            ))}
          </div>
        </div>

        {activeTab === "analytics" && (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Card className="p-4">
              <p className="flex items-center gap-2 text-xs text-[color:var(--neutral-10)] dark:text-white/60">
                <Database className="h-3.5 w-3.5" />
                Total Events
              </p>
              <p className="mt-2 text-2xl font-semibold">{summary.totalEvents.toLocaleString()}</p>
            </Card>
            <Card className="p-4">
              <p className="flex items-center gap-2 text-xs text-[color:var(--neutral-10)] dark:text-white/60">
                <Users className="h-3.5 w-3.5" />
                Active Users
              </p>
              <p className="mt-2 text-2xl font-semibold">{summary.activeUsers.toLocaleString()}</p>
            </Card>
            <Card className="p-4">
              <p className="flex items-center gap-2 text-xs text-[color:var(--neutral-10)] dark:text-white/60">
                <BarChart3 className="h-3.5 w-3.5" />
                Signups
              </p>
              <p className="mt-2 text-2xl font-semibold">{summary.signups.toLocaleString()}</p>
            </Card>
            <Card className="p-4">
              <p className="flex items-center gap-2 text-xs text-[color:var(--neutral-10)] dark:text-white/60">
                <Coins className="h-3.5 w-3.5" />
                Revenue
              </p>
              <p className="mt-2 text-2xl font-semibold">{toCurrency(summary.revenue)}</p>
            </Card>
          </div>
        )}

        {activeTab === "billing" && (
          <div className="grid gap-3 md:grid-cols-2">
            <Card className="p-4">
              <h2 className="text-sm font-semibold">Plan overview</h2>
              <p className="mt-2 text-sm text-[color:var(--neutral-11)] dark:text-white/70">
                Starter · Usage overage enabled · Monthly billing
              </p>
              <p className="mt-3 text-xl font-semibold">{toCurrency(summary.revenue * 30)}</p>
              <p className="text-xs text-[color:var(--neutral-10)] dark:text-white/60">
                30-day projected revenue
              </p>
            </Card>
            <Card className="p-4">
              <h2 className="text-sm font-semibold">Today snapshot</h2>
              <dl className="mt-3 space-y-2 text-sm">
                <div className="flex items-center justify-between gap-4">
                  <dt className="text-[color:var(--neutral-10)] dark:text-white/60">Revenue</dt>
                  <dd className="font-medium">{toCurrency(summary.revenue)}</dd>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <dt className="text-[color:var(--neutral-10)] dark:text-white/60">Conversions</dt>
                  <dd className="font-medium">{summary.conversions.toLocaleString()}</dd>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <dt className="text-[color:var(--neutral-10)] dark:text-white/60">Day</dt>
                  <dd className="font-medium">{summary.day ?? "N/A"}</dd>
                </div>
              </dl>
            </Card>
          </div>
        )}

        {activeTab === "tenants" && (
          <Card className="p-0">
            <div className="space-y-3 p-4 md:hidden">
              <div className="rounded-[var(--radius-lg)] border border-[color:var(--neutral-7)] bg-[color:var(--neutral-2)] p-3 dark:border-white/10 dark:bg-white/5">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold">{summary.tenantId}</p>
                  <span className="inline-flex rounded-full bg-[color:var(--cyan-3)] px-2.5 py-1 text-xs font-medium text-[color:var(--cyan-11)] dark:bg-[color:var(--cyan-9)]/20 dark:text-[color:var(--cyan-9)]">
                    Healthy
                  </span>
                </div>
                <p className="mt-1 text-xs text-[color:var(--neutral-10)] dark:text-white/60">
                  Snapshot: {summary.day ?? "N/A"}
                </p>
              </div>
            </div>
            <div className="hidden md:block">
              <div className="grid grid-cols-12 border-b border-[color:var(--neutral-7)] bg-[color:var(--neutral-2)] px-4 py-3 text-xs font-medium uppercase tracking-wide text-[color:var(--neutral-11)] dark:border-white/10 dark:bg-white/5 dark:text-white/60">
                <div className="col-span-4">Tenant</div>
                <div className="col-span-2">Status</div>
                <div className="col-span-2">Events</div>
                <div className="col-span-2">Users</div>
                <div className="col-span-2">Revenue</div>
              </div>
              <div className="grid grid-cols-12 items-center px-4 py-4 text-sm">
                <div className="col-span-4 font-medium">{summary.tenantId}</div>
                <div className="col-span-2">
                  <span className="inline-flex rounded-full bg-[color:var(--cyan-3)] px-2.5 py-1 text-xs font-medium text-[color:var(--cyan-11)] dark:bg-[color:var(--cyan-9)]/20 dark:text-[color:var(--cyan-9)]">
                    Healthy
                  </span>
                </div>
                <div className="col-span-2">{summary.totalEvents.toLocaleString()}</div>
                <div className="col-span-2">{summary.activeUsers.toLocaleString()}</div>
                <div className="col-span-2">{toCurrency(summary.revenue)}</div>
              </div>
            </div>
          </Card>
        )}
      </div>
    </main>
  );
}
