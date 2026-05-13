"use client";

import { CreditCard, Sparkles } from "@nebutra/icons";
import Link from "next/link";
import { useTranslations } from "next-intl";
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
  active: "bg-emerald-500/10 text-emerald-700 ring-1 ring-emerald-500/30 dark:text-emerald-300",
  trialing: "bg-blue-500/10 text-blue-700 ring-1 ring-blue-500/30 dark:text-blue-300",
  past_due: "bg-amber-500/10 text-amber-700 ring-1 ring-amber-500/30 dark:text-amber-300",
  canceled: "bg-red-500/10 text-red-700 ring-1 ring-red-500/30 dark:text-red-300",
  free: "bg-[color:var(--neutral-3)] text-[color:var(--neutral-11)] ring-1 ring-[color:var(--neutral-7)]",
};

function formatDate(iso: string | null): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

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

  if (error) {
    return (
      <div
        role="alert"
        className={`rounded-3xl border border-red-500/30 bg-red-500/10 p-5 text-sm text-red-800 dark:text-red-200 ${className ?? ""}`}
      >
        {t("errors.loadFailed")}
      </div>
    );
  }

  if (!snapshot || !snapshot.planId) {
    return (
      <div
        className={`rounded-3xl border border-[color:var(--neutral-7)] bg-[color:var(--neutral-1)] p-5 shadow-sm dark:border-white/10 dark:bg-black/40 ${className ?? ""}`}
      >
        <p className="font-medium text-sm uppercase tracking-[0.18em] text-[color:var(--neutral-10)] dark:text-white/50">
          {t("title")}
        </p>
        <h2 className="mt-3 font-semibold text-2xl text-[color:var(--neutral-12)] dark:text-white">
          {t("noPlanTitle")}
        </h2>
        <p className="mt-2 max-w-2xl text-[color:var(--neutral-11)] text-sm dark:text-white/70">
          {t("noPlanDescription")}
        </p>
        <div className="mt-5">
          <Link
            href="/choose-plan"
            className="inline-flex items-center gap-2 rounded-xl bg-[color:var(--brand-primary)] px-4 py-2.5 font-medium text-sm text-white transition hover:opacity-90"
          >
            <Sparkles className="size-4" aria-hidden="true" />
            {t("choosePlan")}
          </Link>
        </div>
      </div>
    );
  }

  const { planName, status, currentPeriodEnd } = snapshot;
  const dateLabel = formatDate(currentPeriodEnd);
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
      className={`rounded-3xl border border-[color:var(--neutral-7)] bg-[color:var(--neutral-1)] p-5 shadow-sm dark:border-white/10 dark:bg-black/40 ${className ?? ""}`}
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="font-medium text-sm uppercase tracking-[0.18em] text-[color:var(--neutral-10)] dark:text-white/50">
            {t("title")}
          </p>
          <h2 className="mt-3 flex items-center gap-2 font-semibold text-2xl text-[color:var(--neutral-12)] dark:text-white">
            <Sparkles className="size-5 text-[color:var(--brand-primary)]" aria-hidden="true" />
            {planName}
          </h2>
          {periodCopy && (
            <p className="mt-2 text-[color:var(--neutral-11)] text-sm dark:text-white/70">
              {periodCopy}
            </p>
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
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[color:var(--brand-primary)] px-4 py-2.5 font-medium text-sm text-white transition hover:opacity-90 sm:w-auto"
          >
            <Sparkles className="size-4" aria-hidden="true" />
            {t("choosePlan")}
          </Link>
        ) : (
          <Link
            href="/billing"
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[color:var(--neutral-12)] px-4 py-2.5 font-medium text-sm text-white transition hover:bg-[color:var(--neutral-11)] dark:bg-white dark:text-black dark:hover:bg-white/90 sm:w-auto"
          >
            <CreditCard className="size-4" aria-hidden="true" />
            {t("manage")}
          </Link>
        )}
      </div>
    </div>
  );
}
