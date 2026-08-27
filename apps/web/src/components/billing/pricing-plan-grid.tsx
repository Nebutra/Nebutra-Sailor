"use client";

import { ArrowRight, Check, Sparkles } from "@nebutra/icons";
import { ToggleGroup, ToggleGroupItem } from "@nebutra/ui/primitives";
import { useMemo, useRef, useState, useTransition } from "react";

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
  /** Called when checkout dispatch fails. Use this to show a toast or inline error. */
  onSelectError?: (error: unknown, planId: string) => void;
  className?: string;
}

const PLAN_LABEL = "pricing.choosePlan";
const usdWholeFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});
const usdFractionFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 2,
});

function formatAmount(amountCents: number, currency: string): string {
  const amount = amountCents / 100;
  const maximumFractionDigits = amount % 1 === 0 ? 0 : 2;

  if (currency.toUpperCase() === "USD") {
    return (maximumFractionDigits === 0 ? usdWholeFormatter : usdFractionFormatter).format(amount);
  }

  return amount.toLocaleString("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits,
  });
}

function findPriceForInterval(
  plan: PricingPlan,
  interval: BillingInterval,
): PricingPlanPrice | null {
  const exact = plan.prices.find((p) => p.interval === interval);
  if (exact) return exact;
  // Fallback to the first recurring price when the selected cadence is absent.
  return plan.prices.find((p) => p.interval !== "one-time") ?? null;
}

function isFreeLikePlan(plan: PricingPlan): boolean {
  return plan.tier === "FREE" || (plan.prices.length === 0 && plan.tier !== "ENTERPRISE");
}

function dedupeDefaultFreePlans(plans: PricingPlan[]): PricingPlan[] {
  let freePlanSeen = false;
  return plans.filter((plan) => {
    if (!isFreeLikePlan(plan)) return true;
    if (freePlanSeen) return false;
    freePlanSeen = true;
    return true;
  });
}

async function defaultOnSelectPlan(
  plan: PricingPlan,
  interval: BillingInterval,
  orgId: string | undefined,
) {
  const price = findPriceForInterval(plan, interval);
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const returnPath = orgId
    ? `${origin}/checkout-return?organizationId=${encodeURIComponent(orgId)}`
    : `${origin}/checkout-return`;

  const response = await fetch("/api/billing/checkout", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      planId: plan.id,
      interval,
      redirectUrl: returnPath,
      ...(price?.trialPeriodDays ? { trialPeriodDays: price.trialPeriodDays } : {}),
      ...(price?.seatBased || plan.perSeat ? { seatBased: true } : {}),
    }),
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => ({}))) as { error?: unknown };
    throw new Error(
      typeof payload.error === "string" ? payload.error : `Checkout failed: ${response.status}`,
    );
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
 * Tokens follow the project palette: rounded-[var(--radius-3xl)] cards, `var(--neutral-*)`,
 * `hsl(var(--primary))` highlights for the recommended plan and CTA.
 */
export function PricingPlanGrid({
  plans,
  activePlanId,
  orgId,
  onSelectPlan,
  onSelectError,
  className,
}: PricingPlanGridProps) {
  const visiblePlans = useMemo(
    () => dedupeDefaultFreePlans(plans).filter((plan) => plan.id !== activePlanId),
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

  const [billingInterval, setBillingInterval] = useState<BillingInterval>("month");
  const [pendingPlanId, setPendingPlanId] = useState<string | null>(null);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const pendingPlanRef = useRef<string | null>(null);
  const [, startTransition] = useTransition();

  const handleSelect = async (planId: string) => {
    if (pendingPlanRef.current) return;
    const plan = visiblePlans.find((candidate) => candidate.id === planId);
    if (!plan) return;
    pendingPlanRef.current = planId;
    setPendingPlanId(planId);
    setCheckoutError(null);
    try {
      const handler =
        onSelectPlan ?? ((_id: string, i: BillingInterval) => defaultOnSelectPlan(plan, i, orgId));
      await handler(plan.id, billingInterval);
    } catch (error) {
      onSelectError?.(error, planId);
      if (!onSelectPlan) {
        setCheckoutError(error instanceof Error ? error.message : "Checkout could not start.");
      }
    } finally {
      startTransition(() => {
        pendingPlanRef.current = null;
        setPendingPlanId(null);
      });
    }
  };

  return (
    <div className={className} data-testid="pricing-plan-grid">
      {showIntervalTabs && (
        <div className="mb-6 flex justify-center">
          <ToggleGroup
            type="single"
            variant="pill"
            value={billingInterval}
            onValueChange={(value) => setBillingInterval(value as BillingInterval)}
            aria-label="Billing interval"
          >
            <ToggleGroupItem value="month" variant="pill">
              Monthly
            </ToggleGroupItem>
            <ToggleGroupItem value="year" variant="pill">
              Yearly
            </ToggleGroupItem>
          </ToggleGroup>
        </div>
      )}

      {checkoutError && (
        <div
          role="alert"
          className="mb-4 rounded-[var(--radius-2xl)] border border-warning/30 bg-warning/10 px-4 py-3 text-[hsl(var(--warning-strong))] text-sm"
        >
          {checkoutError} You can retry checkout or contact support if the provider setup is still
          unavailable.
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {visiblePlans.map((plan) => (
          <PlanCard
            key={plan.id}
            plan={plan}
            interval={billingInterval}
            loading={pendingPlanId === plan.id}
            disabled={pendingPlanId !== null && pendingPlanId !== plan.id}
            onSelect={() => handleSelect(plan.id)}
          />
        ))}
      </div>
    </div>
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
  const isFree = isFreeLikePlan(plan);
  const ctaLabel = loading ? "Redirecting…" : isFree ? "Included" : `Choose ${plan.name}`;

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
      className={`relative flex flex-col rounded-[var(--radius-3xl)] border p-6 shadow-sm transition ${
        recommended
          ? "border-[color:hsl(var(--primary))] bg-background"
          : "border-border bg-background"
      }`}
    >
      {recommended && (
        <span className="-top-3 -translate-x-1/2 absolute left-1/2 inline-flex items-center gap-1 rounded-full bg-[color:hsl(var(--primary))] px-3 py-1 font-medium text-[color:hsl(var(--background))] text-xs">
          <Sparkles className="size-3" aria-hidden="true" />
          Recommended
        </span>
      )}

      <div>
        <h3 className="font-semibold text-foreground text-xl">{plan.name}</h3>
        {plan.description && (
          <p className="mt-2 text-muted-foreground text-sm">{plan.description}</p>
        )}
      </div>

      <div className="mt-6">
        <span className="font-semibold text-3xl text-foreground">{priceLabel}</span>
        <span className="ml-2 text-muted-foreground text-sm">{cadenceLabel}</span>
        {perSeat && (
          <span
            data-testid={`pricing-plan-${plan.id}-per-seat`}
            className="ml-1 text-muted-foreground text-sm"
          >
            / seat
          </span>
        )}
      </div>

      {plan.features.length > 0 && (
        <ul className="mt-6 flex-1 space-y-2">
          {plan.features.map((feature) => (
            <li key={feature} className="flex items-start gap-2 text-muted-foreground text-sm">
              <Check
                className="mt-0.5 size-4 shrink-0 text-[color:hsl(var(--primary))]"
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
          className="mt-4 inline-flex w-fit items-center rounded-full bg-[color:hsl(var(--primary))]/10 px-3 py-1 font-medium text-[color:hsl(var(--primary))] text-xs"
        >
          {`Free ${trialDays}-day trial`}
        </p>
      )}

      <button
        type="button"
        onClick={onSelect}
        disabled={loading || disabled || isFree}
        aria-label={isFree ? `${plan.name} included` : `Choose ${plan.name}`}
        className={`mt-6 inline-flex w-full items-center justify-center gap-2 rounded-[var(--radius-xl)] px-4 py-2.5 font-medium text-sm transition ${
          recommended
            ? "bg-[color:hsl(var(--primary))] text-[color:hsl(var(--background))] hover:opacity-90"
            : "border border-border text-foreground hover:bg-muted"
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
