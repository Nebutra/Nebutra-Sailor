import { getConfiguredAuthProvider } from "@nebutra/auth";
import { ChartActivity as Activity, CreditCard, Lightning as Rocket, Users } from "@nebutra/icons";
import { AnimateIn, AnimateInGroup } from "@nebutra/ui/components";
import { DashboardCommandSurface, DashboardMetricTile, DashboardPanel } from "@nebutra/ui/patterns";
import { connection } from "next/server";
import { getLocale, getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { RecentSessions } from "@/components/onboarding/recent-sessions";
import { getAuth, getUser } from "@/lib/auth";
import { getGrowthSummary } from "@/lib/warehouse/gold";
import { CommandSkeleton, MetricsSkeleton, RecentSessionsSkeleton } from "../_dashboard-skeletons";

const authProvider = getConfiguredAuthProvider();
const isAuthConfigured =
  authProvider === "dev"
    ? process.env.NODE_ENV !== "production"
    : authProvider === "clerk"
      ? Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY)
      : authProvider === "better-auth"
        ? Boolean(process.env.BETTER_AUTH_SECRET)
        : authProvider === "nextauth"
          ? Boolean(process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET)
          : authProvider === "supabase"
            ? Boolean(
                (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL) &&
                  (process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) &&
                  process.env.SUPABASE_SERVICE_ROLE_KEY,
              )
            : false;

type GreetingKey = "morning" | "afternoon" | "evening";

function getGreetingKey(): GreetingKey {
  const h = new Date().getHours();
  if (h >= 5 && h < 12) return "morning";
  if (h >= 12 && h < 18) return "afternoon";
  return "evening";
}

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

function fmtDateLabel(date: Date, locale: string) {
  return date.toLocaleDateString(locale, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

async function CommandCenter() {
  await connection();

  const [t, locale, user] = await Promise.all([
    getTranslations("dashboard"),
    getLocale(),
    getUser().catch(() => null),
  ]);

  const userName = user?.name?.split(" ")[0] || "there";
  const greeting = t(`greeting.${getGreetingKey()}`);
  const dateLabel = fmtDateLabel(new Date(), locale);

  return (
    <AnimateIn preset="fadeUp">
      <DashboardCommandSurface
        status={dateLabel}
        title={
          <>
            {greeting}, {userName}.
          </>
        }
        description={t("commandCenter.description")}
      />
    </AnimateIn>
  );
}

async function WorkspaceMetrics() {
  const [t, locale, authState] = await Promise.all([
    getTranslations("dashboard.workspaceSnapshot"),
    getLocale(),
    getAuth().catch(() => null),
  ]);

  const tenantId = authState?.orgId || process.env.DEFAULT_DASHBOARD_TENANT_ID;
  if (!tenantId) return null;

  const summary = await getGrowthSummary(tenantId).catch(() => null);
  if (!summary?.day) return null;

  const snapshotState = t("meta.latestDay", { day: summary.day });
  const snapshotMeta = [
    { label: t("meta.snapshot"), value: snapshotState },
    { label: t("meta.cadence"), value: t("meta.daily") },
    { label: t("meta.tenant"), value: tenantId },
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
      description={t("description", { day: summary.day })}
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

export default function DashboardPage() {
  return (
    <section
      data-dashboard-section="workspace-overview"
      className="mx-auto w-full max-w-[1760px] space-y-5"
    >
      <Suspense fallback={<CommandSkeleton />}>
        <CommandCenter />
      </Suspense>

      <div className="space-y-4">
        <Suspense fallback={<MetricsSkeleton />}>
          <WorkspaceMetrics />
        </Suspense>

        <Suspense fallback={<RecentSessionsSkeleton />}>
          <RecentSessions />
        </Suspense>

        {!isAuthConfigured && <NoAuthNotice />}
      </div>
    </section>
  );
}

async function NoAuthNotice() {
  const t = await getTranslations("dashboard.commandSurface");
  return (
    <div className="rounded-[var(--radius-xl)] border border-amber-6 bg-amber-2 px-4 py-3 text-sm text-amber-11">
      {t("noAuth")}
    </div>
  );
}
