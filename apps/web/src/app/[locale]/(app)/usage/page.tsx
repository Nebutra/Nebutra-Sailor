import { AnimateIn, AnimateInGroup } from "@nebutra/ui/components";
import { Card, EmptyState, LoadingState, PageHeader } from "@nebutra/ui/layout";
import { Suspense } from "react";
import { getTypedApi } from "@/lib/api/client";

// ── Data Fetching ────────────────────────────────────────────────────────────

interface UsageData {
  period: string;
  apiCalls: { used: number; limit: number; percentUsed: number };
  aiTokens: { used: number };
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
        <h3 className="text-sm font-medium text-neutral-11 dark:text-white/70">{label}</h3>
        <span className={`text-xs font-semibold ${statusColor}`}>{percent.toFixed(1)}%</span>
      </div>

      {/* Large number */}
      <p className="mt-2 text-3xl font-bold tracking-tight text-neutral-12 dark:text-white">
        {used.toLocaleString()}
        <span className="ml-1 text-sm font-normal text-neutral-10 dark:text-white/50">
          / {limit.toLocaleString()} {unit}
        </span>
      </p>

      {/* Progress bar */}
      <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-neutral-3 dark:bg-white/10">
        <div
          className={`h-full rounded-full transition-all duration-500 ${barColor}`}
          style={{ width: `${percent}%` }}
        />
      </div>

      {/* Remaining */}
      <p className="mt-2 text-xs text-neutral-10 dark:text-white/50">
        {Math.max(limit - used, 0).toLocaleString()} {unit} remaining this period
      </p>

      {/* Warning */}
      {isCritical && (
        <div className="mt-3 rounded-lg border border-red-6 bg-red-2 px-3 py-2 text-xs text-red-11">
          ⛔ Quota nearly exhausted. Upgrade your plan to avoid service interruption.
        </div>
      )}
      {isWarning && !isCritical && (
        <div className="mt-3 rounded-lg border border-amber-6 bg-amber-2 px-3 py-2 text-xs text-amber-11">
          ⚠️ Approaching quota limit. Consider upgrading to avoid disruptions.
        </div>
      )}
    </Card>
  );
}

function StatCard({ label, value, subLabel }: { label: string; value: string; subLabel?: string }) {
  return (
    <Card className="p-4 sm:p-6">
      <h3 className="text-sm font-medium text-neutral-11 dark:text-white/70">{label}</h3>
      <p className="mt-2 text-3xl font-bold tracking-tight text-neutral-12 dark:text-white">
        {value}
      </p>
      {subLabel && <p className="mt-1 text-xs text-neutral-10 dark:text-white/50">{subLabel}</p>}
    </Card>
  );
}

// ── Main Content ─────────────────────────────────────────────────────────────

async function UsageContent() {
  const usage = await fetchUsage();

  return (
    <>
      <AnimateIn preset="fadeUp">
        <PageHeader
          title="Usage & Metering"
          description="Monitor API calls, AI token consumption, and quota status across your organization."
        />
      </AnimateIn>

      {!usage ? (
        <AnimateIn preset="fadeUp">
          <Card className="p-8">
            <EmptyState
              title="No usage data yet"
              description="Usage metrics will appear once your organization starts making API calls. Ensure the API gateway is connected."
            />
          </Card>
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
            <h2 className="mt-8 text-lg font-semibold text-neutral-12 dark:text-white">
              Usage Breakdown
            </h2>
            <p className="mt-1 text-sm text-neutral-11 dark:text-white/70">
              Detailed per-model and per-endpoint breakdown coming soon.
            </p>
          </AnimateIn>

          {/* Quick-action cards */}
          <AnimateInGroup stagger="fast" className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <AnimateIn preset="fadeUp">
              <Card className="group cursor-pointer p-4 transition-all hover:border-[var(--brand-7)] hover:shadow-md sm:p-6">
                <h3 className="text-sm font-semibold text-neutral-12 dark:text-white">
                  📊 Per-Model Breakdown
                </h3>
                <p className="mt-1 text-xs text-neutral-10 dark:text-white/50">
                  See token usage per AI model (GPT-4, Claude, Gemini).
                </p>
              </Card>
            </AnimateIn>

            <AnimateIn preset="fadeUp">
              <Card className="group cursor-pointer p-4 transition-all hover:border-[var(--brand-7)] hover:shadow-md sm:p-6">
                <h3 className="text-sm font-semibold text-neutral-12 dark:text-white">
                  📈 Historical Trends
                </h3>
                <p className="mt-1 text-xs text-neutral-10 dark:text-white/50">
                  View daily/weekly/monthly usage trends over time.
                </p>
              </Card>
            </AnimateIn>

            <AnimateIn preset="fadeUp">
              <Card className="group cursor-pointer p-4 transition-all hover:border-[var(--brand-7)] hover:shadow-md sm:p-6">
                <h3 className="text-sm font-semibold text-neutral-12 dark:text-white">
                  ⚙️ Quota Settings
                </h3>
                <p className="mt-1 text-xs text-neutral-10 dark:text-white/50">
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
