import { AnimateIn, AnimateInGroup } from "@nebutra/ui/components";
import { Card, EmptyState, ErrorState, LoadingState, PageHeader } from "@nebutra/ui/layout";
import { headers } from "next/headers";
import { getTranslations } from "next-intl/server";
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
  const percent = limit > 0 ? Math.min((used / limit) * 100, 100) : 0;
  const isWarning = percent >= 80;
  const isCritical = percent >= 95;

  const barColor = isCritical ? "bg-destructive" : isWarning ? "bg-warning" : "bg-primary";

  // Meter fill and its percentage label must read as one object, so both sides
  // of the pair come from the same registered ramp. The -900 step is AA in both
  // themes (red 5.32/5.84, amber 5.60/8.14, green 5.22/8.30 on the card).
  const statusColor = isCritical
    ? "text-[hsl(var(--destructive-strong))]"
    : isWarning
      ? "text-[hsl(var(--warning-strong))]"
      : "text-[hsl(var(--success-strong))]";

  return (
    <Card className="p-4 sm:p-6">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-neutral-11">{label}</h3>
        <span className={`text-xs font-semibold ${statusColor}`}>{percent.toFixed(1)}%</span>
      </div>

      {/* Large number */}
      <p className="mt-2 text-3xl font-bold tracking-tight text-neutral-12">
        {used.toLocaleString()}
        <span className="ml-1 text-sm font-normal text-neutral-10">
          / {limit.toLocaleString()} {unit}
        </span>
      </p>

      {/* Progress bar */}
      <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-neutral-3">
        <div
          className={`h-full rounded-full transition-[width] duration-500 motion-reduce:transition-none ${barColor}`}
          style={{ width: `${percent}%` }}
        />
      </div>

      {/* Remaining */}
      <p className="mt-2 text-xs text-neutral-10">
        {Math.max(limit - used, 0).toLocaleString()} {unit} remaining this period
      </p>

      {/* Warning */}
      {isCritical && (
        <div className="mt-3 rounded-[var(--radius-lg)] border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-[hsl(var(--destructive-strong))]">
          Quota nearly exhausted. Upgrade your plan to avoid service interruption.
        </div>
      )}
      {isWarning && !isCritical && (
        <div className="mt-3 rounded-[var(--radius-lg)] border border-warning/30 bg-warning/10 px-3 py-2 text-xs text-[hsl(var(--warning-strong))]">
          Approaching quota limit. Consider upgrading to avoid disruptions.
        </div>
      )}
    </Card>
  );
}

function StatCard({ label, value, subLabel }: { label: string; value: string; subLabel?: string }) {
  return (
    <Card className="p-4 sm:p-6">
      <h3 className="text-sm font-medium text-neutral-11">{label}</h3>
      <p className="mt-2 text-3xl font-bold tracking-tight text-neutral-12">{value}</p>
      {subLabel && <p className="mt-1 text-xs text-neutral-10">{subLabel}</p>}
    </Card>
  );
}

function formatCreditAllowance(value: number): string {
  return value < 0 ? "Unlimited" : value.toLocaleString();
}

function formatSignedCredits(value: number): string {
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toLocaleString()} credits`;
}

function formatTransactionType(type: string): string {
  return type
    .toLowerCase()
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function formatCreditDate(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en", {
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
  if (!creditSummary) {
    return (
      <AnimateIn preset="fadeUp">
        <Card className="p-4 sm:p-6">
          <h2 className="text-lg font-semibold text-neutral-12">Credit Balance</h2>
          <p className="mt-2 text-sm text-neutral-11">
            Credit balance is unavailable right now. Usage metering below is still loaded from the
            gateway.
          </p>
        </Card>
      </AnimateIn>
    );
  }

  return (
    <>
      <AnimateInGroup stagger="fast" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <AnimateIn preset="fadeUp">
          <StatCard
            label="Credit Balance"
            value={creditSummary.balance.amount.toLocaleString()}
            subLabel={`${creditSummary.balance.formatted} available`}
          />
        </AnimateIn>

        <AnimateIn preset="fadeUp">
          <StatCard
            label="Daily refresh"
            value={formatCreditAllowance(creditSummary.allowance.dailyRefresh)}
            subLabel={`Refreshes at ${creditSummary.allowance.refreshTime}`}
          />
        </AnimateIn>

        <AnimateIn preset="fadeUp">
          <StatCard
            label="Plan allowance"
            value={formatCreditAllowance(creditSummary.allowance.includedMonthly)}
            subLabel={`${creditSummary.allowance.plan} monthly included credits`}
          />
        </AnimateIn>
      </AnimateInGroup>

      <AnimateIn preset="fadeUp">
        <Card className="mt-6 p-4 sm:p-6">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-neutral-12">Credit Activity</h2>
              <p className="text-sm text-neutral-11">
                Recent credit grants and consumption events.
              </p>
            </div>
            <span className="text-xs font-medium uppercase tracking-normal text-neutral-10">
              {creditSummary.allowance.plan}
            </span>
          </div>

          {creditSummary.transactions.length === 0 ? (
            <p className="mt-6 rounded-[var(--radius-lg)] border border-neutral-6 bg-neutral-2 px-4 py-3 text-sm text-neutral-11">
              {emptyActivityLabel}
            </p>
          ) : (
            <div className="mt-4 divide-y divide-neutral-6">
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
                      {formatCreditDate(transaction.createdAt)}
                      {transaction.relatedId ? ` · ${transaction.relatedId}` : ""}
                    </p>
                  </div>

                  <span
                    className={`text-sm font-semibold ${
                      transaction.amount >= 0 ? "text-success" : "text-neutral-12"
                    }`}
                  >
                    {formatSignedCredits(transaction.amount)}
                  </span>

                  <span className="text-xs text-neutral-10">
                    Balance {transaction.balanceAfter.toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </AnimateIn>
    </>
  );
}

// ── Usage Breakdown ──────────────────────────────────────────────────────────

/**
 * Fixed-height slot shared by the breakdown's loading, empty, error and loaded
 * states so the page below it does not move as the section resolves.
 */
function BreakdownFrame({ children }: { children: ReactNode }) {
  return <div className="mt-4 min-h-[19rem]">{children}</div>;
}

function BreakdownSkeleton() {
  const placeholders = ["model", "provider", "endpoint"];

  return (
    <BreakdownFrame>
      <div
        className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
        role="status"
        aria-label="Loading usage breakdown"
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
  const result = await pending;

  if (result.status === "no-tenant") {
    return (
      <BreakdownFrame>
        <EmptyState
          tone="subtle"
          size="md"
          title="Select an organization to see the breakdown"
          description="Metered usage is recorded per organization. Switch to one to see how this period splits across models, providers and endpoints."
        />
      </BreakdownFrame>
    );
  }

  if (result.status === "error") {
    return (
      <BreakdownFrame>
        <ErrorState title="Usage breakdown unavailable" message={result.message} />
      </BreakdownFrame>
    );
  }

  if (result.breakdown.groups.length === 0) {
    return (
      <BreakdownFrame>
        <EmptyState
          tone="subtle"
          size="md"
          title="This period has no metered usage"
          description="Model calls and API requests are grouped here as soon as the first usage event lands in this billing period."
        />
      </BreakdownFrame>
    );
  }

  return (
    <BreakdownFrame>
      <AnimateInGroup stagger="fast" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {result.breakdown.groups.map((group) => (
          <AnimateIn key={group.id} preset="fadeUp">
            <BreakdownGroupCard group={group} />
          </AnimateIn>
        ))}
      </AnimateInGroup>

      {result.breakdown.periodStart && result.breakdown.periodEnd && (
        <p className="mt-4 text-xs text-neutral-10 first-letter:uppercase">
          {result.breakdown.period} window · {formatCreditDate(result.breakdown.periodStart)} to{" "}
          {formatCreditDate(result.breakdown.periodEnd)}
        </p>
      )}
    </BreakdownFrame>
  );
}

// ── Main Content ─────────────────────────────────────────────────────────────

async function UsageContent() {
  const breakdown = resolveUsageBreakdown();
  const t = await getTranslations("startupOs");
  const [usage, creditSummary] = await Promise.all([fetchUsage(), fetchCreditSummary()]);

  return (
    <>
      <AnimateIn preset="fadeUp">
        <PageHeader
          title="Usage & Metering"
          description="Monitor credits, API calls, AI token consumption, and quota status across your organization."
        />
      </AnimateIn>

      <CreditSummarySection
        creditSummary={creditSummary}
        emptyActivityLabel={t("emptyState.creditActivity")}
      />

      {!usage ? (
        <AnimateIn preset="fadeUp">
          <EmptyState
            tone="branded"
            size="lg"
            title={t("emptyState.usageData")}
            description="Usage metrics will appear once your organization starts making API calls. Ensure the API gateway is connected."
          />
        </AnimateIn>
      ) : (
        /* Quota Gauges */
        <AnimateInGroup stagger="fast" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <AnimateIn preset="fadeUp">
            <UsageGauge
              label="API Calls"
              used={usage.apiCalls.used}
              limit={usage.apiCalls.limit}
              unit="requests"
            />
          </AnimateIn>

          <AnimateIn preset="fadeUp">
            <StatCard
              label="AI Tokens Used"
              value={usage.aiTokens.used.toLocaleString()}
              subLabel="Total tokens consumed this period"
            />
          </AnimateIn>

          <AnimateIn preset="fadeUp">
            <StatCard
              label="Billing Period"
              value={usage.period}
              subLabel="Current metering window"
            />
          </AnimateIn>
        </AnimateInGroup>
      )}

      {/* Usage Breakdown — read straight from @nebutra/metering, so it renders
          independently of the gateway usage endpoint above. */}
      <AnimateIn preset="fadeUp">
        <div className="mt-8 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-neutral-12">Usage Breakdown</h2>
            <p className="mt-1 text-sm text-neutral-11">
              This period&rsquo;s metered usage, grouped by the dimensions recorded on each event.
            </p>
          </div>
          <ViewTransitionLink
            href="/billing"
            className="shrink-0 text-sm font-medium text-neutral-11 underline-offset-4 transition-colors hover:text-neutral-12 hover:underline"
          >
            Manage plan and limits
          </ViewTransitionLink>
        </div>
      </AnimateIn>

      <Suspense fallback={<BreakdownSkeleton />}>
        <UsageBreakdownSection result={breakdown} />
      </Suspense>
    </>
  );
}

export default async function UsagePage() {
  return (
    <section className="mx-auto w-full max-w-[1400px]" aria-label="Usage & Metering">
      <Suspense fallback={<LoadingState message="Loading usage metrics..." />}>
        <UsageContent />
      </Suspense>
    </section>
  );
}
