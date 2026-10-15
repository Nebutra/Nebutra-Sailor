import { EmptyState, ErrorState, LoadingState, PageHeader } from "@nebutra/ui/layout";
import { Button, Card } from "@nebutra/ui/primitives";
import { headers } from "next/headers";
import { useLocale, useTranslations } from "next-intl";
import { getLocale, getTranslations } from "next-intl/server";
import { type ReactNode, Suspense } from "react";
import { ViewTransitionLink } from "@/components/navigation/view-transition-link";
import { getTypedApi } from "@/lib/api/client";
import { getTenantContext, resolveServerRequestOrigin } from "@/lib/auth";
import {
  loadUsageBreakdown,
  type UsageBreakdownGroup,
  type UsageBreakdownResult,
} from "@/lib/metering/usage-breakdown";

// ── Data Fetching ────────────────────────────────────────────────────────────

const CREDIT_SUMMARY_PATH = "/api/billing/credits/summary";

interface UsageData {
  period: string;
  apiCalls: { used: number; limit: number; percentUsed: number };
  aiTokens: { used: number };
}

interface CreditTransactionItem {
  id: string;
  type: string;
  amount: number;
  balanceAfter: number;
  description?: string;
  relatedId?: string;
  createdAt: string;
}

interface CreditSummaryData {
  balance: {
    amount: number;
    currency: string;
    formatted: string;
  };
  allowance: {
    plan: string;
    includedMonthly: number;
    dailyRefresh: number;
    refreshTime: string;
  };
  transactions: CreditTransactionItem[];
}

async function fetchUsage(): Promise<UsageData | null> {
  try {
    const api = await getTypedApi();
    const res = await api.GET("/api/v1/billing/usage");
    return (res.data as UsageData) ?? null;
  } catch {
    return null;
  }
}

function buildForwardedAuthHeaders(requestHeaders: Headers): Headers {
  const forwardedHeaders = new Headers();
  const cookie = requestHeaders.get("cookie");
  const authorization = requestHeaders.get("authorization");

  if (cookie) {
    forwardedHeaders.set("cookie", cookie);
  }

  if (authorization) {
    forwardedHeaders.set("authorization", authorization);
  }

  return forwardedHeaders;
}

async function fetchCreditSummary(): Promise<CreditSummaryData | null> {
  try {
    const requestHeaders = new Headers(await headers());
    const origin = resolveServerRequestOrigin(requestHeaders);
    const res = await fetch(`${origin}${CREDIT_SUMMARY_PATH}`, {
      cache: "no-store",
      headers: buildForwardedAuthHeaders(requestHeaders),
    });

    if (!res.ok) {
      return null;
    }

    return (await res.json()) as CreditSummaryData;
  } catch {
    return null;
  }
}

// ── Helper Components ────────────────────────────────────────────────────────

function UsageGauge({
  label,
  used,
  limit,
  unit,
}: {
  label: string;
  used: number;
  limit: number;
  unit: string;
}) {
  const tc = useTranslations("copy.usagePage");
  const percent = limit > 0 ? Math.min((used / limit) * 100, 100) : 0;
  const isWarning = percent >= 80;
  const isCritical = percent >= 95;

  const barColor = isCritical ? "bg-destructive" : isWarning ? "bg-warning" : "bg-primary";

  // Meter fill and its percentage label must read as one object, so both sides
  // of the pair come from the same registered ramp. The -900 step is AA in both
  // themes (red 5.32/5.84, amber 5.60/8.14, green 5.22/8.30 on the card).
  const statusColor = isCritical
    ? "text-destructive-strong"
    : isWarning
      ? "text-warning-strong"
      : "text-success-strong";

  return (
    <MetricCell>
      <div className="flex items-center justify-between">
        <h3 className="text-sm text-neutral-11">{label}</h3>
        <span className={`font-mono text-xs tabular-nums ${statusColor}`}>
          {percent.toFixed(1)}%
        </span>
      </div>

      <p className="mt-3 text-3xl font-semibold tracking-tight tabular-nums text-neutral-12">
        {used.toLocaleString()}
        <span className="ml-1.5 text-sm font-normal text-neutral-10">
          / {limit.toLocaleString()} {unit}
        </span>
      </p>

      <div className="mt-4 h-1 w-full overflow-hidden rounded-full bg-neutral-3">
        <div
          className={`h-full rounded-full transition-[width] duration-500 motion-reduce:transition-none ${barColor}`}
          style={{ width: `${percent}%` }}
        />
      </div>

      {/* Remaining */}
      <p className="mt-2 text-xs text-neutral-10">
        {tc("remainingThisPeriod", { value0: Math.max(limit - used, 0).toLocaleString(), unit })}
      </p>

      {/* Warning */}
      {isCritical && (
        <div className="mt-3 rounded-[var(--radius-lg)] border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive-strong">
          {tc("quotaNearlyExhaustedUpgrade")}
        </div>
      )}
      {isWarning && !isCritical && (
        <div className="mt-3 rounded-[var(--radius-lg)] border border-warning/30 bg-warning/10 px-3 py-2 text-xs text-warning-strong">
          {tc("approachingQuotaLimitConsider")}
        </div>
      )}
    </MetricCell>
  );
}

/**
 * Metrics share one hairline panel, divided into cells — the way current
 * dashboards present a row of numbers — instead of a card per number.
 */
function MetricStrip({ children }: { children: ReactNode }) {
  return (
    <div className="grid overflow-hidden rounded-xl border border-border sm:grid-cols-3 sm:divide-x sm:divide-border max-sm:divide-y max-sm:divide-border">
      {children}
    </div>
  );
}

function MetricCell({ children }: { children: ReactNode }) {
  return <div className="p-5 sm:p-6">{children}</div>;
}

function StatCard({ label, value, subLabel }: { label: string; value: string; subLabel?: string }) {
  return (
    <MetricCell>
      <h3 className="text-sm text-neutral-11">{label}</h3>
      <p className="mt-3 text-3xl font-semibold tracking-tight tabular-nums text-neutral-12">
        {value}
      </p>
      {subLabel && <p className="mt-1.5 text-xs text-neutral-10">{subLabel}</p>}
    </MetricCell>
  );
}

function SectionHeading({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h2 className="text-base font-semibold text-neutral-12">{title}</h2>
        {description ? <p className="mt-1 text-sm text-neutral-11">{description}</p> : null}
      </div>
      {action}
    </div>
  );
}

type UsageT = (key: string, values?: Record<string, string | number>) => string;

function formatCreditAllowance(value: number, tc: UsageT): string {
  return value < 0 ? tc("unlimited") : value.toLocaleString();
}

function formatSignedCredits(value: number, tc: UsageT): string {
  const sign = value > 0 ? "+" : "";
  return tc("signedCredits", { amount: `${sign}${value.toLocaleString()}` });
}

/** Plan code from the ledger (FREE / PRO / ENTERPRISE) → its catalog name. */
function planName(plan: string, tp: UsageT): string {
  const id =
    plan.toUpperCase() === "PRO"
      ? "pro_monthly"
      : plan.toUpperCase() === "ENTERPRISE"
        ? "enterprise"
        : "free";
  return tp(`${id}.name`);
}

function formatTransactionType(type: string): string {
  return type
    .toLowerCase()
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function formatCreditDate(value: string, locale: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat(locale, {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function CreditSummarySection({
  creditSummary,
  emptyActivityLabel,
}: {
  creditSummary: CreditSummaryData | null;
  emptyActivityLabel: string;
}) {
  const tc = useTranslations("copy.usagePage");
  const tp = useTranslations("copy.billingPlans");
  const locale = useLocale();
  if (!creditSummary) {
    return (
      <section>
        <SectionHeading title={tc("credits")} description={tc("creditBalanceIsUnavailable")} />
        <MetricStrip>
          <StatCard label={tc("creditBalance")} value="—" />
          <StatCard label={tc("dailyRefresh")} value="—" />
          <StatCard label={tc("planAllowance")} value="—" />
        </MetricStrip>
      </section>
    );
  }

  return (
    <section>
      <SectionHeading title={tc("credits")} />
      <MetricStrip>
        <StatCard
          label={tc("creditBalance")}
          value={creditSummary.balance.amount.toLocaleString()}
          subLabel={tc("available", { amount: creditSummary.balance.formatted })}
        />

        <StatCard
          label={tc("dailyRefresh")}
          value={formatCreditAllowance(creditSummary.allowance.dailyRefresh, tc)}
          subLabel={tc("refreshesAt", { time: creditSummary.allowance.refreshTime })}
        />

        <StatCard
          label={tc("planAllowance")}
          value={formatCreditAllowance(creditSummary.allowance.includedMonthly, tc)}
          subLabel={tc("monthlyIncluded", { plan: planName(creditSummary.allowance.plan, tp) })}
        />
      </MetricStrip>

      <div className="mt-12">
        <SectionHeading title={tc("creditActivity")} description={tc("recentCreditGrantsAnd")} />

        {creditSummary.transactions.length === 0 ? (
          <EmptyState preview="list" title={emptyActivityLabel} />
        ) : (
          <div className="divide-y divide-border border-y border-border">
            {creditSummary.transactions.map((transaction) => (
              <div
                key={transaction.id}
                className="grid gap-2 py-3 sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:items-center sm:gap-6"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-neutral-12">
                    {transaction.description ?? formatTransactionType(transaction.type)}
                  </p>
                  <p className="mt-1 text-xs text-neutral-10">
                    {formatCreditDate(transaction.createdAt, locale)}
                    {transaction.relatedId ? ` · ${transaction.relatedId}` : ""}
                  </p>
                </div>

                <span
                  className={`text-sm font-semibold ${
                    transaction.amount >= 0 ? "text-success-strong" : "text-neutral-12"
                  }`}
                >
                  {formatSignedCredits(transaction.amount, tc)}
                </span>

                <span className="text-xs text-neutral-10">
                  {tc("balance", { value0: transaction.balanceAfter.toLocaleString() })}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

// ── Usage Breakdown ──────────────────────────────────────────────────────────

/**
 * Fixed-height slot shared by the breakdown's loading, empty, error and loaded
 * states so the page below it does not move as the section resolves.
 */
function BreakdownFrame({ children }: { children: ReactNode }) {
  return <div className="min-h-[19rem]">{children}</div>;
}

function BreakdownSkeleton() {
  const tc = useTranslations("copy.usagePage");
  const placeholders = ["model", "provider", "endpoint"];

  return (
    <BreakdownFrame>
      <div
        className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
        role="status"
        aria-label={tc("loadingUsageBreakdown")}
      >
        {placeholders.map((id) => (
          <Card key={id} className="p-4 sm:p-6">
            <div className="h-3.5 w-24 animate-pulse rounded bg-neutral-3" />
            <div className="mt-3 h-7 w-32 animate-pulse rounded bg-neutral-3" />
            <div className="mt-5 space-y-4">
              {[0, 1, 2, 3].map((row) => (
                <div key={row} className="space-y-1.5">
                  <div className="h-3 w-full animate-pulse rounded bg-neutral-2" />
                  <div className="h-1.5 w-full animate-pulse rounded-full bg-neutral-3" />
                </div>
              ))}
            </div>
          </Card>
        ))}
      </div>
    </BreakdownFrame>
  );
}

function BreakdownGroupCard({ group }: { group: UsageBreakdownGroup }) {
  return (
    <Card className="p-4 sm:p-6">
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="text-sm font-semibold text-neutral-12">{group.dimensionLabel}</h3>
        <span className="shrink-0 text-xs text-neutral-10">{group.meterName}</span>
      </div>

      <p className="mt-2 text-2xl font-bold tracking-tight text-neutral-12">
        {group.total.toLocaleString()}
        <span className="ml-1 text-xs font-normal text-neutral-10">{group.unit}</span>
      </p>

      <ul className="mt-4 space-y-3">
        {group.rows.map((row) => (
          <li key={row.key}>
            <div className="flex items-baseline justify-between gap-3">
              <span className="truncate text-xs font-medium text-neutral-11">{row.label}</span>
              <span className="shrink-0 text-xs tabular-nums text-neutral-10">
                {row.value.toLocaleString()} · {row.share.toFixed(0)}%
              </span>
            </div>
            <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-neutral-3">
              <div
                className="h-full rounded-full bg-primary transition-[width] duration-500 motion-reduce:transition-none"
                style={{ width: `${Math.max(row.share, 2)}%` }}
              />
            </div>
          </li>
        ))}
      </ul>
    </Card>
  );
}

type BreakdownSectionResult = UsageBreakdownResult | { status: "no-tenant" };

/**
 * Resolve the breakdown without awaiting anything else first, so its latency
 * runs alongside the gateway usage and credit requests rather than after them.
 * Never rejects: the tenant lookup is guarded here and `loadUsageBreakdown`
 * converts backend failures into an `error` result.
 */
async function resolveUsageBreakdown(): Promise<BreakdownSectionResult> {
  let tenantId: string | null = null;

  try {
    const tenant = await getTenantContext();
    tenantId = tenant?.tenantId ?? null;
  } catch {
    tenantId = null;
  }

  if (!tenantId) {
    return { status: "no-tenant" };
  }

  return loadUsageBreakdown(tenantId);
}

async function UsageBreakdownSection({
  result: pending,
}: {
  result: Promise<BreakdownSectionResult>;
}) {
  const tc = await getTranslations("copy.usagePage");
  const locale = await getLocale();
  const result = await pending;

  if (result.status === "no-tenant") {
    return (
      <BreakdownFrame>
        <EmptyState
          preview="table"
          title={tc("selectAnOrganizationTo")}
          description={tc("meteredUsageIsRecorded")}
        />
      </BreakdownFrame>
    );
  }

  if (result.status === "error") {
    return (
      <BreakdownFrame>
        <ErrorState title={tc("usageBreakdownUnavailable")} message={result.message} />
      </BreakdownFrame>
    );
  }

  if (result.breakdown.groups.length === 0) {
    return (
      <BreakdownFrame>
        <EmptyState
          preview="table"
          title={tc("thisPeriodHasNo")}
          description={tc("modelCallsAndAPI")}
        />
      </BreakdownFrame>
    );
  }

  return (
    <BreakdownFrame>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {result.breakdown.groups.map((group) => (
          <BreakdownGroupCard key={group.id} group={group} />
        ))}
      </div>

      {result.breakdown.periodStart && result.breakdown.periodEnd && (
        <p className="mt-4 text-xs text-neutral-10 first-letter:uppercase">
          {tc("windowTo", {
            period: result.breakdown.period,
            value1: formatCreditDate(result.breakdown.periodStart, locale),
            value2: formatCreditDate(result.breakdown.periodEnd, locale),
          })}
        </p>
      )}
    </BreakdownFrame>
  );
}

// ── Main Content ─────────────────────────────────────────────────────────────

async function UsageContent() {
  const tc = await getTranslations("copy.usagePage");
  const breakdown = resolveUsageBreakdown();
  const t = await getTranslations("startupOs");
  const [usage, creditSummary] = await Promise.all([fetchUsage(), fetchCreditSummary()]);

  return (
    <>
      <PageHeader title={tc("usageMetering")} description={tc("monitorCreditsAPICalls")} />

      <CreditSummarySection
        creditSummary={creditSummary}
        emptyActivityLabel={t("emptyState.creditActivity")}
      />

      <section className="mt-12">
        <SectionHeading title={tc("thisPeriod")} />
        {!usage ? (
          <EmptyState
            preview="chart"
            title={t("emptyState.usageData")}
            description={tc("usageMetricsWillAppear")}
            action={
              <Button asChild size="sm" variant="outline">
                <ViewTransitionLink href="/settings/api-keys">
                  {tc("createAnAPIKey")}
                </ViewTransitionLink>
              </Button>
            }
          />
        ) : (
          <MetricStrip>
            <UsageGauge
              label={tc("aPICalls")}
              used={usage.apiCalls.used}
              limit={usage.apiCalls.limit}
              unit={tc("requests")}
            />

            <StatCard
              label={tc("aITokensUsed")}
              value={usage.aiTokens.used.toLocaleString()}
              subLabel={tc("totalTokensConsumed")}
            />

            <StatCard
              label={tc("billingPeriod")}
              value={usage.period}
              subLabel={tc("currentMeteringWindow")}
            />
          </MetricStrip>
        )}
      </section>

      {/* Usage Breakdown — read straight from @nebutra/metering, so it renders
          independently of the gateway usage endpoint above. */}
      <section className="mt-12">
        <SectionHeading
          title={tc("usageBreakdown")}
          description={tc("thisPeriodSMetered")}
          action={
            <ViewTransitionLink
              href="/billing"
              className="shrink-0 text-sm font-medium text-neutral-11 underline-offset-4 transition-colors hover:text-neutral-12 hover:underline"
            >
              {tc("managePlanAndLimits")}
            </ViewTransitionLink>
          }
        />
        <Suspense fallback={<BreakdownSkeleton />}>
          <UsageBreakdownSection result={breakdown} />
        </Suspense>
      </section>
    </>
  );
}

export default async function UsagePage() {
  const tc = await getTranslations("copy.usagePage");
  return (
    <section className="mx-auto w-full max-w-wide" aria-label={tc("usageMetering")}>
      <Suspense fallback={<LoadingState message={tc("loadingUsageMetrics")} />}>
        <UsageContent />
      </Suspense>
    </section>
  );
}
