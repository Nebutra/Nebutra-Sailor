"use client";

import { CreditCard, Sparkles } from "@nebutra/icons";
import Link from "next/link";
import { useFormatter, useTranslations } from "next-intl";
import type { SubscriptionStatus } from "@/lib/billing/active-plan";

/**
 * Public snapshot consumed by ActivePlanCard.
 *
 * Shape mirrors `HasActivePlanResult` from `@/lib/billing/active-plan` so that
 * a server component can fetch via `hasActivePlan(orgId)` and pass the result
 * down without remapping.
 */
export interface ActivePlanCardSnapshot {
  active: boolean;
  planId: string | null;
  planName: string | null;
  status: SubscriptionStatus;
  currentPeriodEnd: string | null;
}

export interface ActivePlanCardProps {
  organizationId: string;
  /** Pre-fetched snapshot. `null` renders the empty / error state. */
  snapshot: ActivePlanCardSnapshot | null;
  /** When true, renders a load-failed alert. Mutually exclusive with snapshot. */
  error?: boolean;
  className?: string;
}

const STATUS_TONES: Record<SubscriptionStatus, string> = {
  active:
    "bg-[hsl(var(--success)/0.1)] text-[hsl(var(--success))] ring-1 ring-[hsl(var(--success)/0.3)]",
  trialing: "bg-[hsl(var(--info)/0.1)] text-[hsl(var(--info))] ring-1 ring-[hsl(var(--info)/0.3)]",
  past_due:
    "bg-[hsl(var(--warning)/0.1)] text-[hsl(var(--warning))] ring-1 ring-[hsl(var(--warning)/0.3)]",
  canceled:
    "bg-[hsl(var(--destructive)/0.1)] text-[hsl(var(--destructive))] ring-1 ring-[hsl(var(--destructive)/0.3)]",
  free: "bg-[color:var(--neutral-3)] text-[color:var(--neutral-11)] ring-1 ring-[color:var(--neutral-7)]",
};

/**
 * Renders the active subscription summary for an organization.
 *
 * Inputs are passed in (snapshot) rather than fetched here so that this remains
 * a presentation component — callers (page.tsx server components) call
 * `hasActivePlan(orgId)` and pass the result down. This keeps the component
 * client-renderable and trivially testable.
 */
export function ActivePlanCard({
  organizationId: _organizationId,
  snapshot,
  error,
  className,
}: ActivePlanCardProps) {
  const t = useTranslations("billing.activePlan");
  const format = useFormatter();

  if (error) {
    return (
      <div
        role="alert"
        className={`rounded-[var(--radius-3xl)] border border-[hsl(var(--destructive)/0.3)] bg-[hsl(var(--destructive)/0.1)] p-5 text-[hsl(var(--destructive))] text-sm ${className ?? ""}`}
      >
        {t("errors.loadFailed")}
      </div>
    );
  }

  if (!snapshot || !snapshot.planId) {
    return (
      <div
        className={`rounded-[var(--radius-3xl)] border border-[color:var(--neutral-7)] bg-[color:var(--neutral-1)] p-5 shadow-sm dark:bg-black/40 ${className ?? ""}`}
      >
        <p className="font-medium text-sm uppercase tracking-[0.18em] text-[color:var(--neutral-10)]">
          {t("title")}
        </p>
        <h2 className="mt-3 font-semibold text-2xl text-[color:var(--neutral-12)]">
          {t("noPlanTitle")}
        </h2>
        <p className="mt-2 max-w-2xl text-[color:var(--neutral-11)] text-sm">
          {t("noPlanDescription")}
        </p>
        <div className="mt-5">
          <Link
            href="/choose-plan"
            className="inline-flex items-center gap-2 rounded-[var(--radius-xl)] bg-[color:var(--brand-primary)] px-4 py-2.5 font-medium text-sm text-white transition hover:opacity-90"
          >
            <Sparkles className="size-4" aria-hidden="true" />
            {t("choosePlan")}
          </Link>
        </div>
      </div>
    );
  }

  const { planName, status, currentPeriodEnd } = snapshot;
  const periodDate = currentPeriodEnd ? new Date(currentPeriodEnd) : null;
  const dateLabel =
    periodDate && !Number.isNaN(periodDate.getTime())
      ? format.dateTime(periodDate, { year: "numeric", month: "short", day: "numeric" })
      : "";
  const statusLabel = t(`status.${status}`);
  const statusTone = STATUS_TONES[status] ?? STATUS_TONES.free;

  let periodCopy: string | null = null;
  if (dateLabel) {
    if (status === "trialing") periodCopy = t("trialEndsOn", { date: dateLabel });
    else if (status === "canceled") periodCopy = t("endsOn", { date: dateLabel });
    else periodCopy = t("renewsOn", { date: dateLabel });
  }

  const isFree = status === "free";

  return (
    <div
      className={`rounded-[var(--radius-3xl)] border border-[color:var(--neutral-7)] bg-[color:var(--neutral-1)] p-5 shadow-sm dark:bg-black/40 ${className ?? ""}`}
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="font-medium text-sm uppercase tracking-[0.18em] text-[color:var(--neutral-10)]">
            {t("title")}
          </p>
          <h2 className="mt-3 flex items-center gap-2 font-semibold text-2xl text-[color:var(--neutral-12)]">
            <Sparkles className="size-5 text-[color:var(--brand-primary)]" aria-hidden="true" />
            {planName}
          </h2>
          {periodCopy && (
            <p className="mt-2 text-[color:var(--neutral-11)] text-sm">{periodCopy}</p>
          )}
        </div>
        <span
          data-testid="active-plan-status"
          className={`inline-flex items-center rounded-full px-3 py-1 font-medium text-xs ${statusTone}`}
        >
          {statusLabel}
        </span>
      </div>

      <div className="mt-6 flex flex-col gap-2 sm:flex-row">
        {isFree ? (
          <Link
            href="/choose-plan"
            className="inline-flex w-full items-center justify-center gap-2 rounded-[var(--radius-xl)] bg-[color:var(--brand-primary)] px-4 py-2.5 font-medium text-sm text-white transition hover:opacity-90 sm:w-auto"
          >
            <Sparkles className="size-4" aria-hidden="true" />
            {t("choosePlan")}
          </Link>
        ) : (
          <Link
            href="/billing"
            className="inline-flex w-full items-center justify-center gap-2 rounded-[var(--radius-xl)] bg-[color:var(--neutral-12)] px-4 py-2.5 font-medium text-sm text-white transition hover:bg-[color:var(--neutral-11)] dark:text-black sm:w-auto"
          >
            <CreditCard className="size-4" aria-hidden="true" />
            {t("manage")}
          </Link>
        )}
      </div>
    </div>
  );
}
