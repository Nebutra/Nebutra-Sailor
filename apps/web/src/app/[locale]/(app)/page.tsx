import { AnimateIn, AnimateInGroup } from "@nebutra/ui/components";
import { Activity, CreditCard, Rocket, Users } from "lucide-react";
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

function getGreetingKey(): GreetingKey {
  const h = new Date().getHours();
  if (h >= 5 && h < 12) return "morning";
  if (h >= 12 && h < 18) return "afternoon";
  return "evening";
}

function fmtCompact(n: number, locale: string) {
  return new Intl.NumberFormat(locale, {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(n);
}

function fmtUSD(n: number, locale: string) {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);
}

// ── Streaming server components ───────────────────────────────────────────────

async function GreetingShell() {
  await connection();

  const t = await getTranslations("dashboard");
  const locale = await getLocale();
  let userName = "there";

  if (hasClerkKey) {
    try {
      const user = await getUser();
      userName = user?.name?.split(" ")[0] || "there";
    } catch {
      // graceful fallback
    }
  }

  const greeting = t(`greeting.${getGreetingKey()}`);
  const dateLabel = new Intl.DateTimeFormat(locale, {
    weekday: "long",
    month: "long",
    day: "numeric",
  }).format(new Date());

  return (
    <div className="relative">
      {/* Atmospheric brand glow — decorative only */}
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-0 h-56 w-[640px] -translate-x-1/2 -translate-y-10 opacity-[0.055] blur-3xl dark:opacity-[0.09]"
        style={{ background: "var(--brand-gradient)" }}
      />

      <CommandModeProvider>
        <AnimateInGroup
          stagger="normal"
          className="relative mx-auto flex max-w-2xl flex-col items-center gap-4 text-center"
        >
          <AnimateIn preset="fadeUp">
            <p className="text-xs font-medium text-neutral-10 dark:text-white/40">{dateLabel}</p>
          </AnimateIn>

          <AnimateIn preset="fadeUp">
            <h1 className="text-2xl font-semibold tracking-tight text-neutral-12 dark:text-white">
              {greeting},{" "}
              <span
                style={{
                  background: "var(--brand-gradient)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                }}
              >
                {userName}
              </span>
              .
            </h1>
          </AnimateIn>

          <AnimateIn preset="fadeUp" className="w-full">
            <CommandSurfaceButton />
          </AnimateIn>

          <AnimateIn preset="fadeUp" className="w-full">
            <ModePills />
          </AnimateIn>
        </AnimateInGroup>
      </CommandModeProvider>
    </div>
  );
}

async function WorkspaceMetrics() {
  const t = await getTranslations("dashboard.workspaceSnapshot");
  const locale = await getLocale();
  let tenantId = process.env.DEFAULT_DASHBOARD_TENANT_ID || "demo_org";

  if (hasClerkKey) {
    try {
      const authState = await getAuth();
      tenantId = authState.orgId || tenantId;
    } catch {
      // graceful fallback
    }
  }

  const summary = await getGrowthSummary(tenantId).catch(() => null);

  if (!summary?.day) return null;

  const metrics = [
    {
      label: t("metrics.activeUsers"),
      value: fmtCompact(summary.activeUsers, locale),
      icon: Users,
    },
    {
      label: t("metrics.totalEvents"),
      value: fmtCompact(summary.totalEvents, locale),
      icon: Activity,
    },
    {
      label: t("metrics.conversions"),
      value: fmtCompact(summary.conversions, locale),
      icon: Rocket,
    },
    { label: t("metrics.revenue"), value: fmtUSD(summary.revenue, locale), icon: CreditCard },
  ];

  return (
    <div>
      <AnimateIn preset="fadeUp">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-neutral-12 dark:text-white">{t("title")}</h2>
            <p className="mt-0.5 text-xs text-neutral-10 dark:text-white/40">
              {t("description", { day: summary.day })}
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

      <AnimateInGroup stagger="fast" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {metrics.map(({ label, value, icon: Icon }) => (
          <AnimateIn key={label} preset="fadeUp">
            <ViewTransitionLink href="/analytics" className="block">
              <div className="rounded-xl border border-neutral-6 bg-neutral-1 p-4 transition-all duration-200 hover:border-neutral-8 hover:shadow-md dark:border-white/10 dark:bg-white/[0.03] dark:hover:border-white/20 dark:hover:shadow-none">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-neutral-10 dark:text-white/50">
                    {label}
                  </span>
                  <Icon className="h-3.5 w-3.5 text-neutral-9 dark:text-white/25" />
                </div>
                <p className="mt-2 text-2xl font-semibold tabular-nums text-neutral-12 dark:text-white">
                  {value}
                </p>
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
    <section className="mx-auto w-full max-w-7xl space-y-12">
      {/* First-visit hint — cookie-gated; renders null for returning users */}
      <DashboardHint />

      {/* Fast: auth greeting + command surface + mode pills */}
      <Suspense fallback={<CommandSkeleton />}>
        <GreetingShell />
      </Suspense>

      {/* Fast: 1 indexed query on chat_sessions; renders null when empty */}
      <Suspense fallback={<RecentSessionsSkeleton />}>
        <RecentSessions />
      </Suspense>

      {/* Medium: 4 parallel DB count queries derive real onboarding state */}
      <Suspense fallback={<OnboardingSkeleton />}>
        <GettingStarted />
      </Suspense>

      {/* Slow: warehouse metrics query */}
      <Suspense fallback={<MetricsSkeleton />}>
        <WorkspaceMetrics />
      </Suspense>

      {!hasClerkKey && <NoAuthNotice />}
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
