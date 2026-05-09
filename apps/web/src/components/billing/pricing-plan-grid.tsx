"use client";

import { ArrowRight, Check, Sparkles } from "lucide-react";
import { useMemo, useState, useTransition } from "react";

export type BillingInterval = "month" | "year";

export interface PricingPlanPrice {
  id: string;
  interval: BillingInterval | "one-time";
  amount: number; // smallest currency unit (cents)
  currency: string;
  /**
   * @deprecated Use `trialPeriodDays` instead. Retained for backward compatibility.
   */
  trialDays?: number;
  /** Number of free trial days. Drives the "Free N-day trial" badge. */
  trialPeriodDays?: number;
  /** When true, the price is multiplied by seat count at checkout. */
  seatBased?: boolean;
}

export interface PricingPlan {
  id: string;
  name: string;
  description?: string;
  features: string[];
  tier: "FREE" | "PRO" | "ENTERPRISE";
  recommended?: boolean;
  /** When true, the per-seat suffix is shown next to the cadence label. */
  perSeat?: boolean;
  prices: PricingPlanPrice[];
}

export interface PricingPlanGridProps {
  /** Plans to render. Free plans without prices render an "Included" CTA. */
  plans: PricingPlan[];
  /** Plan id of the org's current plan — hidden from the grid. */
  activePlanId?: string;
  /** Active organization id — appended as `?organizationId=` on the return URL. */
  orgId?: string;
  /**
   * Optional override. Defaults to POSTing `{ planId, interval, redirectUrl }`
   * to `/api/billing/checkout` and following `data.url` via `window.location`.
   */
  onSelectPlan?: (planId: string, interval: BillingInterval) => Promise<void>;
  className?: string;
}

const PLAN_LABEL = "pricing.choosePlan";

function formatAmount(amountCents: number, currency: string): string {
  const amount = amountCents / 100;
  // Use Intl.NumberFormat for currency
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: amount % 1 === 0 ? 0 : 2,
  }).format(amount);
}

function findPriceForInterval(
  plan: PricingPlan,
  interval: BillingInterval,
): PricingPlanPrice | null {
  const exact = plan.prices.find((p) => p.interval === interval);
  if (exact) return exact;
  // fallback: any non-one-time price
  return plan.prices.find((p) => p.interval !== "one-time") ?? null;
}

async function defaultOnSelectPlan(
  planId: string,
  interval: BillingInterval,
  orgId: string | undefined,
) {
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const returnPath = orgId
    ? `${origin}/checkout-return?organizationId=${encodeURIComponent(orgId)}`
    : `${origin}/checkout-return`;

  const response = await fetch("/api/billing/checkout", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      planId,
      interval,
      redirectUrl: returnPath,
    }),
  });

  if (!response.ok) {
    throw new Error(`Checkout failed: ${response.status}`);
  }

  const payload = (await response.json()) as { url?: unknown };
  if (typeof payload.url !== "string") {
    throw new Error("Checkout response missing redirect URL.");
  }

  if (typeof window !== "undefined") {
    window.location.href = payload.url;
  }
}

/**
 * Reusable pricing grid for the first-purchase plan-selection UX.
 *
 * Pure presentation + dispatch — the caller passes `plans` and (optionally)
 * `onSelectPlan`. By default selecting a plan POSTs `{ planId, interval,
 * redirectUrl }` to `/api/billing/checkout` and redirects to the returned URL.
 *
 * Tokens follow the project palette: rounded-3xl cards, `var(--neutral-*)`,
 * `var(--brand-primary)` highlights for the recommended plan and CTA.
 */
export function PricingPlanGrid({
  plans,
  activePlanId,
  orgId,
  onSelectPlan,
  className,
}: PricingPlanGridProps) {
  const visiblePlans = useMemo(
    () => plans.filter((plan) => plan.id !== activePlanId),
    [plans, activePlanId],
  );

  const showIntervalTabs = useMemo(
    () =>
      visiblePlans.some(
        (plan) =>
          plan.prices.some((p) => p.interval === "month") &&
          plan.prices.some((p) => p.interval === "year"),
      ),
    [visiblePlans],
  );

  const [interval, setInterval] = useState<BillingInterval>("month");
  const [pendingPlanId, setPendingPlanId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const handleSelect = async (planId: string) => {
    if (pendingPlanId) return;
    setPendingPlanId(planId);
    try {
      const handler =
        onSelectPlan ?? ((id: string, i: BillingInterval) => defaultOnSelectPlan(id, i, orgId));
      await handler(planId, interval);
    } catch (error) {
      // The caller is expected to surface the failure (toast, error boundary).
      // Re-throwing here would crash the React tree on transient checkout faults,
      // so we swallow and reset the loading state.
      // eslint-disable-next-line no-console
      console.error("[PricingPlanGrid] onSelectPlan failed", error);
    } finally {
      startTransition(() => {
        setPendingPlanId(null);
      });
    }
  };

  return (
    <div className={className} data-testid="pricing-plan-grid">
      {showIntervalTabs && (
        <div
          role="tablist"
          aria-label="Billing interval"
          className="mb-6 flex justify-center gap-1 rounded-full border border-[color:var(--neutral-7)] bg-[color:var(--neutral-2)] p-1"
        >
          <IntervalTab
            value="month"
            label="Monthly"
            active={interval === "month"}
            onSelect={() => setInterval("month")}
          />
          <IntervalTab
            value="year"
            label="Yearly"
            active={interval === "year"}
            onSelect={() => setInterval("year")}
          />
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {visiblePlans.map((plan) => (
          <PlanCard
            key={plan.id}
            plan={plan}
            interval={interval}
            loading={pendingPlanId === plan.id}
            disabled={pendingPlanId !== null && pendingPlanId !== plan.id}
            onSelect={() => handleSelect(plan.id)}
          />
        ))}
      </div>
    </div>
  );
}

function IntervalTab({
  value,
  label,
  active,
  onSelect,
}: {
  value: BillingInterval;
  label: string;
  active: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      aria-controls={`pricing-panel-${value}`}
      onClick={onSelect}
      className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
        active
          ? "bg-[color:var(--neutral-1)] text-[color:var(--neutral-12)] shadow-sm"
          : "text-[color:var(--neutral-11)] hover:text-[color:var(--neutral-12)]"
      }`}
    >
      {label}
    </button>
  );
}

interface PlanCardProps {
  plan: PricingPlan;
  interval: BillingInterval;
  loading: boolean;
  disabled: boolean;
  onSelect: () => void;
}

function resolveTrialDays(price: PricingPlanPrice | null): number | null {
  if (!price) return null;
  const days = price.trialPeriodDays ?? price.trialDays ?? null;
  if (typeof days !== "number" || days <= 0) return null;
  return days;
}

function isPerSeatPlan(plan: PricingPlan, price: PricingPlanPrice | null): boolean {
  if (plan.perSeat === true) return true;
  return price?.seatBased === true;
}

function PlanCard({ plan, interval, loading, disabled, onSelect }: PlanCardProps) {
  const price = findPriceForInterval(plan, interval);
  const recommended = plan.recommended ?? false;
  const isFree = plan.tier === "FREE" || (plan.prices.length === 0 && plan.tier !== "ENTERPRISE");
  const ctaLabel = loading ? "Redirecting..." : isFree ? "Included" : `Choose ${plan.name}`;

  const priceLabel = price ? formatAmount(price.amount, price.currency) : isFree ? "$0" : "Custom";
  const cadenceLabel = price
    ? interval === "year"
      ? "/ year"
      : "/ month"
    : isFree
      ? "forever"
      : "contact us";

  const trialDays = resolveTrialDays(price);
  const perSeat = isPerSeatPlan(plan, price);

  return (
    <article
      aria-label={plan.name}
      data-testid={`pricing-plan-${plan.id}`}
      className={`relative flex flex-col rounded-3xl border p-6 shadow-sm transition ${
        recommended
          ? "border-[color:var(--brand-primary)] bg-[color:var(--neutral-1)] dark:bg-black/40"
          : "border-[color:var(--neutral-7)] bg-[color:var(--neutral-1)] dark:border-white/10 dark:bg-black/40"
      }`}
    >
      {recommended && (
        <span className="-top-3 -translate-x-1/2 absolute left-1/2 inline-flex items-center gap-1 rounded-full bg-[color:var(--brand-primary)] px-3 py-1 font-medium text-white text-xs">
          <Sparkles className="size-3" aria-hidden="true" />
          Recommended
        </span>
      )}

      <div>
        <h3 className="font-semibold text-[color:var(--neutral-12)] text-xl dark:text-white">
          {plan.name}
        </h3>
        {plan.description && (
          <p className="mt-2 text-[color:var(--neutral-11)] text-sm dark:text-white/70">
            {plan.description}
          </p>
        )}
      </div>

      <div className="mt-6">
        <span className="font-semibold text-3xl text-[color:var(--neutral-12)] dark:text-white">
          {priceLabel}
        </span>
        <span className="ml-2 text-[color:var(--neutral-10)] text-sm dark:text-white/50">
          {cadenceLabel}
        </span>
        {perSeat && (
          <span
            data-testid={`pricing-plan-${plan.id}-per-seat`}
            className="ml-1 text-[color:var(--neutral-10)] text-sm dark:text-white/50"
          >
            / seat
          </span>
        )}
      </div>

      {plan.features.length > 0 && (
        <ul className="mt-6 flex-1 space-y-2">
          {plan.features.map((feature) => (
            <li
              key={feature}
              className="flex items-start gap-2 text-[color:var(--neutral-11)] text-sm dark:text-white/70"
            >
              <Check
                className="mt-0.5 size-4 shrink-0 text-[color:var(--brand-primary)]"
                aria-hidden="true"
              />
              <span>{feature}</span>
            </li>
          ))}
        </ul>
      )}

      {trialDays !== null && !isFree && (
        <p
          data-testid={`pricing-plan-${plan.id}-trial`}
          className="mt-4 inline-flex w-fit items-center rounded-full bg-[color:var(--brand-primary)]/10 px-3 py-1 font-medium text-[color:var(--brand-primary)] text-xs"
        >
          {`Free ${trialDays}-day trial`}
        </p>
      )}

      <button
        type="button"
        onClick={onSelect}
        disabled={loading || disabled || isFree}
        aria-label={isFree ? `${plan.name} included` : `Choose ${plan.name}`}
        className={`mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 font-medium text-sm transition ${
          recommended
            ? "bg-[color:var(--brand-primary)] text-white hover:opacity-90"
            : "border border-[color:var(--neutral-7)] text-[color:var(--neutral-12)] hover:bg-[color:var(--neutral-3)] dark:border-white/10 dark:text-white dark:hover:bg-white/10"
        } ${loading || disabled || isFree ? "cursor-not-allowed opacity-70" : ""}`}
      >
        {ctaLabel}
        {!loading && !isFree && <ArrowRight className="size-4" aria-hidden="true" />}
      </button>
    </article>
  );
}

// Re-exported translation key in case callers want to localize the CTA elsewhere.
export const PRICING_CHOOSE_PLAN_KEY = PLAN_LABEL;
