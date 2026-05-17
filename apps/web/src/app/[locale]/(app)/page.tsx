import {
  ChartActivity as Activity,
  ArrowRight,
  CreditCard,
  Lightning as Rocket,
  Users,
} from "@nebutra/icons";
import { AnimateIn, AnimateInGroup } from "@nebutra/ui/components";
import { connection } from "next/server";
import { getLocale, getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { CommandModeProvider } from "@/components/command-palette/command-mode-context";
import { CommandSurfaceButton } from "@/components/command-palette/command-surface-button";
import { ModePills } from "@/components/command-palette/mode-pills";
import { ViewTransitionLink } from "@/components/navigation/view-transition-link";
import { DashboardHint } from "@/components/onboarding/dashboard-hint";
import { GettingStarted } from "@/components/onboarding/getting-started";
import { RecentSessions } from "@/components/onboarding/recent-sessions";
import { getAuth, getUser } from "@/lib/auth";
import { getGrowthSummary } from "@/lib/warehouse/gold";
import {
  CommandSkeleton,
  MetricsSkeleton,
  OnboardingSkeleton,
  RecentSessionsSkeleton,
} from "./_dashboard-skeletons";

const hasClerkKey = !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

// ── Helpers ──────────────────────────────────────────────────────────────────

type GreetingKey = "morning" | "afternoon" | "evening";
type MetricMeta = {
  label: string;
  value: string;
};

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

// ── Streaming server components ───────────────────────────────────────────────

async function CommandCenter() {
  await connection();

  const [t, locale, user] = await Promise.all([
    getTranslations("dashboard"),
    getLocale(),
    hasClerkKey ? getUser().catch(() => null) : Promise.resolve(null),
  ]);

  const userName = user?.name?.split(" ")[0] || "there";
  const greeting = t(`greeting.${getGreetingKey()}`);
  const dateLabel = fmtDateLabel(new Date(), locale);

  return (
    <CommandModeProvider>
      <AnimateIn preset="fadeUp">
        <div className="grid gap-5 rounded-2xl border border-neutral-6 bg-neutral-1/90 p-5 shadow-sm shadow-neutral-12/[0.03] dark:border-white/10 dark:bg-white/[0.035] dark:shadow-none sm:p-6 lg:grid-cols-[minmax(0,1fr)_minmax(28rem,38rem)] lg:items-end">
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-[0.12em] text-neutral-10 dark:text-white/40">
              {dateLabel}
            </p>
            <h1 className="mt-3 text-2xl font-semibold tracking-tight text-neutral-12 dark:text-white sm:text-3xl">
              {greeting}, {userName}.
            </h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-neutral-11 dark:text-white/60">
              {t("commandCenter.description")}
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <ViewTransitionLink
                href="/chat"
                className="inline-flex items-center gap-1.5 rounded-md bg-neutral-12 px-3 py-2 text-sm font-medium text-neutral-1 transition-colors hover:bg-neutral-11 dark:bg-white dark:text-neutral-12 dark:hover:bg-white/90"
              >
                {t("commandCenter.openSailor")}
                <ArrowRight className="size-3.5" aria-hidden="true" />
              </ViewTransitionLink>
              <ViewTransitionLink
                href="/analytics"
                className="inline-flex items-center gap-1.5 rounded-md border border-neutral-7 bg-neutral-1 px-3 py-2 text-sm font-medium text-neutral-12 transition-colors hover:border-neutral-8 hover:bg-neutral-2 dark:border-white/10 dark:bg-white/[0.04] dark:text-white dark:hover:bg-white/[0.08]"
              >
                {t("commandCenter.viewAnalytics")}
              </ViewTransitionLink>
            </div>
          </div>

          <div className="space-y-3">
            <CommandSurfaceButton />
            <ModePills />
          </div>
        </div>
      </AnimateIn>
    </CommandModeProvider>
  );
}

async function WorkspaceMetrics() {
  const [t, locale, authState] = await Promise.all([
    getTranslations("dashboard.workspaceSnapshot"),
    getLocale(),
    hasClerkKey ? getAuth().catch(() => null) : Promise.resolve(null),
  ]);

  const tenantId = authState?.orgId || process.env.DEFAULT_DASHBOARD_TENANT_ID || "demo_org";
  const summary = await getGrowthSummary(tenantId).catch(() => null);
  const snapshotState = summary?.day
    ? t("meta.latestDay", { day: summary.day })
    : t("meta.awaiting");
  const dailyMeta = (source: string, state: string = snapshotState): MetricMeta[] => [
    { label: t("meta.source"), value: source },
    { label: t("meta.cadence"), value: t("meta.daily") },
    { label: t("meta.state"), value: state },
  ];

  const metrics = summary?.day
    ? [
        {
          label: t("metrics.activeUsers"),
          value: fmtCompact(summary.activeUsers, locale),
          detail: t("details.activeUsers"),
          meta: dailyMeta(t("meta.users")),
          icon: Users,
        },
        {
          label: t("metrics.totalEvents"),
          value: fmtCompact(summary.totalEvents, locale),
          detail: t("details.totalEvents"),
          meta: dailyMeta(t("meta.events")),
          icon: Activity,
        },
        {
          label: t("metrics.conversions"),
          value: fmtCompact(summary.conversions, locale),
          detail: t("details.conversions"),
          meta: dailyMeta(t("meta.funnel")),
          icon: Rocket,
        },
        {
          label: t("metrics.revenue"),
          value: fmtUSD(summary.revenue, locale),
          detail: t("details.revenue"),
          meta: dailyMeta(t("meta.billing")),
          icon: CreditCard,
        },
      ]
    : [
        {
          label: t("metrics.activeUsers"),
          value: t("empty.pending"),
          detail: t("empty.connectData"),
          meta: dailyMeta(t("meta.users"), t("meta.notConnected")),
          icon: Users,
        },
        {
          label: t("metrics.totalEvents"),
          value: "0",
          detail: t("empty.noSnapshot"),
          meta: dailyMeta(t("meta.events")),
          icon: Activity,
        },
        {
          label: t("metrics.conversions"),
          value: "0",
          detail: t("empty.awaitingSignals"),
          meta: dailyMeta(t("meta.funnel")),
          icon: Rocket,
        },
        {
          label: t("metrics.revenue"),
          value: "$0",
          detail: t("empty.noBillingFeed"),
          meta: dailyMeta(t("meta.billing"), t("meta.notConnected")),
          icon: CreditCard,
        },
      ];

  return (
    <div className="rounded-2xl border border-neutral-6 bg-neutral-1 p-4 dark:border-white/10 dark:bg-white/[0.03] sm:p-5">
      <AnimateIn preset="fadeUp">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-neutral-12 dark:text-white">{t("title")}</h2>
            <p className="mt-0.5 text-xs text-neutral-10 dark:text-white/40">
              {summary?.day ? t("description", { day: summary.day }) : t("empty.noSnapshot")}
            </p>
          </div>
          <ViewTransitionLink
            href="/analytics"
            className="text-xs font-medium text-blue-11 transition-colors hover:text-blue-12 dark:text-blue-9 dark:hover:text-blue-8"
          >
            {t("viewAnalytics")}
          </ViewTransitionLink>
        </div>
      </AnimateIn>

      <AnimateInGroup stagger="fast" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map(({ label, value, detail, meta, icon: Icon }) => (
          <AnimateIn key={label} preset="fadeUp">
            <ViewTransitionLink href="/analytics" className="block">
              <div className="rounded-xl border border-neutral-6 bg-neutral-1 p-4 transition-colors duration-150 hover:border-neutral-8 hover:bg-neutral-2 dark:border-white/10 dark:bg-white/[0.02] dark:hover:border-white/20 dark:hover:bg-white/[0.05]">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-neutral-10 dark:text-white/50">
                    {label}
                  </span>
                  <Icon className="size-3.5 text-neutral-9 dark:text-white/25" />
                </div>
                <p className="mt-2 text-2xl font-semibold tabular-nums text-neutral-12 dark:text-white">
                  {value}
                </p>
                <p className="mt-1 text-xs text-neutral-10 dark:text-white/45">{detail}</p>
                <dl className="mt-3 space-y-1.5 border-t border-neutral-5 pt-3 dark:border-white/10">
                  {meta.map((item) => (
                    <div
                      key={`${label}-${item.label}`}
                      className="flex items-center justify-between gap-3"
                    >
                      <dt className="text-[10px] font-medium uppercase tracking-[0.12em] text-neutral-9 dark:text-white/30">
                        {item.label}
                      </dt>
                      <dd className="truncate text-xs font-medium text-neutral-11 dark:text-white/55">
                        {item.value}
                      </dd>
                    </div>
                  ))}
                </dl>
              </div>
            </ViewTransitionLink>
          </AnimateIn>
        ))}
      </AnimateInGroup>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  return (
    <section className="mx-auto w-full max-w-[1440px] space-y-7">
      {/* Fast: command center and primary action. Keep the dashboard left-aligned and decision-led. */}
      <Suspense fallback={<CommandSkeleton />}>
        <CommandCenter />
      </Suspense>

      <div className="grid gap-7 xl:grid-cols-[minmax(0,1fr)_24rem] xl:items-start">
        <div className="space-y-7">
          {/* Slow: warehouse metrics query. Render an honest empty state instead of disappearing. */}
          <Suspense fallback={<MetricsSkeleton />}>
            <WorkspaceMetrics />
          </Suspense>

          {/* Fast: 1 indexed query on chat_sessions; renders a stable empty state when empty. */}
          <Suspense fallback={<RecentSessionsSkeleton />}>
            <RecentSessions />
          </Suspense>
        </div>

        <aside className="space-y-4">
          {/* First-visit hint, cookie-gated; secondary guidance, not the hero. */}
          <DashboardHint />

          {/* Medium: 4 parallel DB count queries derive real onboarding state */}
          <Suspense fallback={<OnboardingSkeleton />}>
            <GettingStarted />
          </Suspense>

          {!hasClerkKey && <NoAuthNotice />}
        </aside>
      </div>
    </section>
  );
}

async function NoAuthNotice() {
  const t = await getTranslations("dashboard.commandSurface");
  return (
    <div className="rounded-xl border border-amber-6 bg-amber-2 px-4 py-3 text-sm text-amber-11">
      {t("noAuth")}
    </div>
  );
}
