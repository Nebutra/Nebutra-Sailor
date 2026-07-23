import "server-only";
import {
  ChartActivity as Activity,
  CreditCard,
  External as ExternalLink,
  Lightning as Rocket,
  Users,
} from "@nebutra/icons";
import { AnimateIn, AnimateInGroup } from "@nebutra/ui/components";
import { Card } from "@nebutra/ui/layout";
import { DashboardMetricTile, DashboardPanel } from "@nebutra/ui/patterns";
import { getLocale, getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { AccessInviteIssuer } from "@/components/admin/access-invite-issuer";
import { listAdminDirectory } from "@/components/admin/admin-directory-data";
import { AdminDirectoryPanel } from "@/components/admin/admin-directory-panel";
import { getAuth } from "@/lib/auth";
import { getGrowthSummary } from "@/lib/warehouse/gold";
import { MetricsSkeleton } from "../_dashboard-skeletons";

/**
 * Minimal admin dashboard.
 *
 * This page is deliberately thin. Per Silicon Valley best practice, full
 * user/org CRUD and customer-support flows belong in Retool/Metabase wired
 * to the internal API, not in self-built UI. See docs/admin/retool-recipe.md.
 *
 * What lives here: high-leverage, at-a-glance product signals. The Workspace
 * Snapshot tiles below are backed by real warehouse data (getGrowthSummary →
 * ClickHouse growth_metrics_daily) and render honest zero values when the
 * warehouse has no data for the active tenant yet.
 */

function fmtCompact(n: number, locale: string) {
  return n.toLocaleString(locale, {
    notation: "compact",
    maximumFractionDigits: 1,
  });
}

function fmtUSD(n: number, locale: string) {
  return n.toLocaleString(locale, {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });
}

async function WorkspaceMetrics() {
  const [t, locale, authState] = await Promise.all([
    getTranslations("dashboard.workspaceSnapshot"),
    getLocale(),
    getAuth().catch(() => null),
  ]);

  const tenantId = authState?.orgId || process.env.DEFAULT_DASHBOARD_TENANT_ID;
  // getGrowthSummary never throws — on missing data / warehouse error it
  // resolves an empty summary (zeros, day=null). Render honest zero tiles
  // rather than hiding the panel.
  const summary = await getGrowthSummary(tenantId ?? undefined);

  const dayLabel = summary.day ?? t("meta.daily");
  const snapshotValue = summary.day ? t("meta.latestDay", { day: summary.day }) : "—";
  const snapshotMeta = [
    { label: t("meta.snapshot"), value: snapshotValue },
    { label: t("meta.cadence"), value: t("meta.daily") },
    { label: t("meta.tenant"), value: summary.tenantId },
  ];

  const metrics = [
    {
      label: t("metrics.activeUsers"),
      value: fmtCompact(summary.activeUsers, locale),
      detail: t("details.activeUsers"),
      source: t("meta.users"),
      icon: Users,
      tone: "green" as const,
    },
    {
      label: t("metrics.totalEvents"),
      value: fmtCompact(summary.totalEvents, locale),
      detail: t("details.totalEvents"),
      source: t("meta.events"),
      icon: Activity,
      tone: "blue" as const,
    },
    {
      label: t("metrics.conversions"),
      value: fmtCompact(summary.conversions, locale),
      detail: t("details.conversions"),
      source: t("meta.funnel"),
      icon: Rocket,
      tone: "amber" as const,
    },
    {
      label: t("metrics.revenue"),
      value: fmtUSD(summary.revenue, locale),
      detail: t("details.revenue"),
      source: t("meta.billing"),
      icon: CreditCard,
      tone: "neutral" as const,
    },
  ];

  return (
    <DashboardPanel
      title={t("title")}
      description={t("description", { day: dayLabel })}
      meta={
        <div className="flex max-w-full flex-wrap items-center gap-1.5">
          {snapshotMeta.map((item) => (
            <span
              key={item.label}
              className="inline-flex max-w-full items-center gap-1.5 rounded-[var(--radius-sm)] bg-neutral-2 px-1.5 py-0.5 text-[11px] text-neutral-10"
            >
              <span className="font-medium text-neutral-11">{item.label}</span>
              <span className="max-w-32 truncate tabular-nums">{item.value}</span>
            </span>
          ))}
        </div>
      }
    >
      <AnimateInGroup stagger="fast" className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map(({ label, value, detail, source, icon: Icon, tone }) => (
          <AnimateIn key={label} preset="fadeUp">
            <DashboardMetricTile
              label={label}
              value={value}
              detail={detail}
              source={source}
              icon={Icon}
              tone={tone}
            />
          </AnimateIn>
        ))}
      </AnimateInGroup>
    </DashboardPanel>
  );
}

type AdminSearchParams = Promise<Record<string, string | string[] | undefined>>;

function readParam(value: string | string[] | undefined): string {
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}

function RetoolBanner() {
  return (
    <div
      className="mb-6 rounded-[var(--radius-xl)] border p-4"
      style={{
        background: "hsl(var(--primary))",
      }}
    >
      <div className="rounded-[var(--radius-lg)] bg-background p-4">
        <div className="flex items-start gap-3">
          <ExternalLink
            aria-hidden="true"
            className="mt-0.5 size-4 shrink-0 text-[color:hsl(var(--primary))]"
          />
          <p className="text-sm text-neutral-12">
            This is a deliberately minimal admin. For user/org CRUD, customer support flows, and
            content ops, see{" "}
            <code className="rounded bg-neutral-3 px-1.5 py-0.5 font-mono text-neutral-12 text-xs">
              docs/admin/retool-recipe.md
            </code>{" "}
            Wire Retool to the internal API in 30 minutes.
          </p>
        </div>
      </div>
    </div>
  );
}

export default async function AdminPage({ searchParams }: { searchParams: AdminSearchParams }) {
  const params = await searchParams;
  const directory = await listAdminDirectory({
    query: readParam(params.q),
    page: readParam(params.page),
    pageSize: readParam(params.pageSize),
  });

  return (
    <>
      <RetoolBanner />

      <Suspense fallback={<MetricsSkeleton />}>
        <WorkspaceMetrics />
      </Suspense>

      <AnimateIn preset="fadeUp">
        <Card className="mt-6 p-4 sm:p-6">
          <h3 className="text-sm font-medium text-neutral-12">Escape hatches</h3>
          <p className="mt-1 text-neutral-10 text-xs">
            Debug-only utilities. Not a substitute for Retool flows.
          </p>
          <ul className="mt-3 space-y-1.5 text-neutral-11 text-sm">
            <li>
              <code className="font-mono text-xs">POST /api/admin/impersonate</code>
              {": "}
              start a session as another user (signed cookie, audited)
            </li>
          </ul>
        </Card>
      </AnimateIn>

      <AnimateIn preset="fadeUp">
        <AccessInviteIssuer />
      </AnimateIn>

      <AnimateIn preset="fadeUp">
        <AdminDirectoryPanel
          query={directory.query}
          page={directory.page}
          pageSize={directory.pageSize}
          users={directory.users}
          organizations={directory.organizations}
          totalUsers={directory.totalUsers}
          totalOrganizations={directory.totalOrganizations}
        />
      </AnimateIn>
    </>
  );
}
