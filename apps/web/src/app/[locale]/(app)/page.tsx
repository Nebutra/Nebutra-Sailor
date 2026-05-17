import { getConfiguredAuthProvider } from "@nebutra/auth";
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
import { ViewTransitionLink } from "@/components/navigation/view-transition-link";
import { RecentSessions } from "@/components/onboarding/recent-sessions";
import { getAuth, getUser } from "@/lib/auth";
import { getGrowthSummary } from "@/lib/warehouse/gold";
import { CommandSkeleton, MetricsSkeleton, RecentSessionsSkeleton } from "./_dashboard-skeletons";

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

// ── Helpers ──────────────────────────────────────────────────────────────────

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

// ── Streaming server components ───────────────────────────────────────────────

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
      <div className="border-b border-neutral-5 pb-4 dark:border-white/10">
        <div className="flex max-w-5xl flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="size-1.5 rounded-full bg-green-9" aria-hidden="true" />
              <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-neutral-10 dark:text-white/45">
                {dateLabel}
              </p>
            </div>
            <h1 className="mt-2 text-xl font-semibold tracking-tight text-neutral-12 dark:text-white sm:text-2xl">
              {greeting}, {userName}.
            </h1>
            <p className="mt-1.5 max-w-2xl text-[13px] leading-5 text-neutral-11 dark:text-white/60">
              {t("commandCenter.description")}
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-1.5">
            <ViewTransitionLink
              href="/chat"
              className="inline-flex items-center gap-1.5 rounded-[var(--radius-md)] bg-neutral-12 px-2.5 py-1.5 text-[13px] font-medium text-neutral-1 transition-colors hover:bg-neutral-11 dark:bg-white dark:text-neutral-12 dark:hover:bg-white/90"
            >
              {t("commandCenter.openSailor")}
              <ArrowRight className="size-3" aria-hidden="true" />
            </ViewTransitionLink>
            <ViewTransitionLink
              href="/analytics"
              className="inline-flex items-center gap-1.5 rounded-[var(--radius-md)] px-2.5 py-1.5 text-[13px] font-medium text-neutral-11 transition-colors hover:bg-neutral-2 hover:text-neutral-12 dark:text-white/60 dark:hover:bg-white/[0.06] dark:hover:text-white"
            >
              {t("commandCenter.viewAnalytics")}
            </ViewTransitionLink>
          </div>
        </div>
      </div>
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
    },
    {
      label: t("metrics.totalEvents"),
      value: fmtCompact(summary.totalEvents, locale),
      detail: t("details.totalEvents"),
      source: t("meta.events"),
      icon: Activity,
    },
    {
      label: t("metrics.conversions"),
      value: fmtCompact(summary.conversions, locale),
      detail: t("details.conversions"),
      source: t("meta.funnel"),
      icon: Rocket,
    },
    {
      label: t("metrics.revenue"),
      value: fmtUSD(summary.revenue, locale),
      detail: t("details.revenue"),
      source: t("meta.billing"),
      icon: CreditCard,
    },
  ];

  return (
    <div className="rounded-[var(--radius-xl)] border border-neutral-6 bg-neutral-1 p-3.5 dark:border-white/10 dark:bg-white/[0.03] sm:p-4">
      <AnimateIn preset="fadeUp">
        <div className="mb-3 flex flex-col gap-2.5 border-b border-neutral-5 pb-3 dark:border-white/10 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-sm font-semibold text-neutral-12 dark:text-white">{t("title")}</h2>
            <p className="mt-0.5 text-xs text-neutral-10 dark:text-white/40">
              {t("description", { day: summary.day })}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 lg:justify-end">
            <div className="flex max-w-full flex-wrap items-center gap-1.5">
              {snapshotMeta.map((item) => (
                <span
                  key={item.label}
                  className="inline-flex max-w-full items-center gap-1.5 rounded-[var(--radius-sm)] bg-neutral-2 px-1.5 py-0.5 text-[11px] text-neutral-10 dark:bg-white/[0.05] dark:text-white/45"
                >
                  <span className="font-medium text-neutral-11 dark:text-white/65">
                    {item.label}
                  </span>
                  <span className="max-w-32 truncate tabular-nums">{item.value}</span>
                </span>
              ))}
            </div>
            <ViewTransitionLink
              href="/analytics"
              className="text-xs font-medium text-blue-11 transition-colors hover:text-blue-12 dark:text-blue-9 dark:hover:text-blue-8"
            >
              {t("viewAnalytics")}
            </ViewTransitionLink>
          </div>
        </div>
      </AnimateIn>

      <AnimateInGroup stagger="fast" className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map(({ label, value, detail, source, icon: Icon }) => (
          <AnimateIn key={label} preset="fadeUp">
            <ViewTransitionLink href="/analytics" className="block">
              <div className="rounded-[var(--radius-lg)] bg-neutral-2/70 p-3 ring-1 ring-neutral-5 transition-colors duration-150 hover:bg-neutral-3/70 hover:ring-neutral-7 dark:bg-white/[0.035] dark:ring-white/10 dark:hover:bg-white/[0.06] dark:hover:ring-white/20">
                <div className="flex items-center justify-between gap-2">
                  <span className="min-w-0 truncate text-xs font-medium text-neutral-10 dark:text-white/50">
                    {label}
                  </span>
                  <Icon
                    className="size-3.5 shrink-0 text-neutral-9 dark:text-white/25"
                    aria-hidden="true"
                  />
                </div>
                <p className="mt-1.5 text-xl font-semibold tabular-nums text-neutral-12 dark:text-white">
                  {value}
                </p>
                <div className="mt-1.5 space-y-0.5 text-xs text-neutral-10 dark:text-white/45">
                  <span className="block">{detail}</span>
                  <span className="block text-[11px] text-neutral-9 dark:text-white/35">
                    {source}
                  </span>
                </div>
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
    <section className="mx-auto w-full max-w-[1760px] space-y-5">
      {/* Fast: command center and primary action. Keep the dashboard left-aligned and decision-led. */}
      <Suspense fallback={<CommandSkeleton />}>
        <CommandCenter />
      </Suspense>

      <div className="space-y-4">
        {/* Slow: warehouse metrics query. Hide the module until a real warehouse snapshot exists. */}
        <Suspense fallback={<MetricsSkeleton />}>
          <WorkspaceMetrics />
        </Suspense>

        {/* Fast: 1 indexed query on chat_sessions; hide until a real working queue exists. */}
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
