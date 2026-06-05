import { AnimateIn, AnimateInGroup } from "@nebutra/ui/components";
import { Card, EmptyState, LoadingState, PageHeader } from "@nebutra/ui/layout";
import { headers } from "next/headers";
import { Suspense } from "react";
import { getTypedApi } from "@/lib/api/client";
import { resolveServerRequestOrigin } from "@/lib/auth";

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

  const barColor = isCritical ? "bg-red-9" : isWarning ? "bg-amber-9" : "bg-[var(--brand-9)]";

  const statusColor = isCritical ? "text-red-11" : isWarning ? "text-amber-11" : "text-green-11";

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
          className={`h-full rounded-full transition-all duration-500 ${barColor}`}
          style={{ width: `${percent}%` }}
        />
      </div>

      {/* Remaining */}
      <p className="mt-2 text-xs text-neutral-10">
        {Math.max(limit - used, 0).toLocaleString()} {unit} remaining this period
      </p>

      {/* Warning */}
      {isCritical && (
        <div className="mt-3 rounded-[var(--radius-lg)] border border-red-6 bg-red-2 px-3 py-2 text-xs text-red-11">
          Quota nearly exhausted. Upgrade your plan to avoid service interruption.
        </div>
      )}
      {isWarning && !isCritical && (
        <div className="mt-3 rounded-[var(--radius-lg)] border border-amber-6 bg-amber-2 px-3 py-2 text-xs text-amber-11">
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

function CreditSummarySection({ creditSummary }: { creditSummary: CreditSummaryData | null }) {
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
              No credit activity recorded yet.
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
                      transaction.amount >= 0 ? "text-green-11" : "text-neutral-12"
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

// ── Main Content ─────────────────────────────────────────────────────────────

async function UsageContent() {
  const [usage, creditSummary] = await Promise.all([fetchUsage(), fetchCreditSummary()]);

  return (
    <>
      <AnimateIn preset="fadeUp">
        <PageHeader
          title="Usage & Metering"
          description="Monitor credits, API calls, AI token consumption, and quota status across your organization."
        />
      </AnimateIn>

      <CreditSummarySection creditSummary={creditSummary} />

      {!usage ? (
        <AnimateIn preset="fadeUp">
          <EmptyState
            tone="branded"
            size="lg"
            title="No usage data yet"
            description="Usage metrics will appear once your organization starts making API calls. Ensure the API gateway is connected."
          />
        </AnimateIn>
      ) : (
        <>
          {/* Quota Gauges */}
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

          {/* Usage Breakdown heading */}
          <AnimateIn preset="fadeUp">
            <h2 className="mt-8 text-lg font-semibold text-neutral-12">Usage Breakdown</h2>
            <p className="mt-1 text-sm text-neutral-11">
              Detailed per-model and per-endpoint breakdown coming soon.
            </p>
          </AnimateIn>

          {/* Quick-action cards */}
          <AnimateInGroup stagger="fast" className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <AnimateIn preset="fadeUp">
              <Card className="group cursor-pointer p-4 transition-all hover:border-[var(--brand-7)] hover:shadow-md sm:p-6">
                <h3 className="text-sm font-semibold text-neutral-12">Per-Model Breakdown</h3>
                <p className="mt-1 text-xs text-neutral-10">
                  See token usage per AI model (GPT-4, Claude, Gemini).
                </p>
              </Card>
            </AnimateIn>

            <AnimateIn preset="fadeUp">
              <Card className="group cursor-pointer p-4 transition-all hover:border-[var(--brand-7)] hover:shadow-md sm:p-6">
                <h3 className="text-sm font-semibold text-neutral-12">Historical Trends</h3>
                <p className="mt-1 text-xs text-neutral-10">
                  View daily/weekly/monthly usage trends over time.
                </p>
              </Card>
            </AnimateIn>

            <AnimateIn preset="fadeUp">
              <Card className="group cursor-pointer p-4 transition-all hover:border-[var(--brand-7)] hover:shadow-md sm:p-6">
                <h3 className="text-sm font-semibold text-neutral-12">Quota Settings</h3>
                <p className="mt-1 text-xs text-neutral-10">
                  Configure usage thresholds and alert notifications.
                </p>
              </Card>
            </AnimateIn>
          </AnimateInGroup>
        </>
      )}
    </>
  );
}

export default async function UsagePage() {
  return (
    <section className="mx-auto w-full max-w-7xl" aria-label="Usage & Metering">
      <Suspense fallback={<LoadingState message="Loading usage metrics..." />}>
        <UsageContent />
      </Suspense>
    </section>
  );
}
