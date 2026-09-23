"use client";

import { Button, Progress, Skeleton } from "@nebutra/ui/primitives";
import { useTranslations } from "next-intl";
import { useUsageSummary } from "./use-usage-summary";

/**
 * Quota readout for the account dialog's subscription tab. The tab's subtitle
 * promises "plan, quota, and renewal" — the quota half was missing, which is
 * why the panel read as an empty page with two buttons.
 *
 * Threshold colors follow the Gauge ramp (success → warning → destructive) so a
 * nearly-spent allowance is visible without reading the numbers.
 */
export function UsageSummaryBlock() {
  const t = useTranslations("account");
  const usage = useUsageSummary();

  return (
    <div className="rounded-[var(--radius-lg)] border border-border bg-card p-4">
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          {t("subscription.usageTitle")}
        </p>
        {usage.data?.period ? (
          <span className="font-mono text-xs text-muted-foreground">{usage.data.period}</span>
        ) : null}
      </div>

      {usage.isPending ? (
        <div className="mt-3 space-y-3">
          <Skeleton className="h-4 w-48" />
          <Skeleton className="h-4 w-36" />
        </div>
      ) : usage.isError ? (
        <div className="mt-3 flex items-center justify-between gap-3">
          <p className="text-xs text-muted-foreground">{t("subscription.usageUnavailable")}</p>
          <Button size="tiny" type="button" variant="outline" onClick={() => void usage.refetch()}>
            {t("subscription.usageRetry")}
          </Button>
        </div>
      ) : (
        <dl className="mt-3 space-y-3">
          <div>
            <div className="flex items-baseline justify-between gap-3 text-xs">
              <dt className="text-muted-foreground">{t("subscription.usageApiCalls")}</dt>
              <dd className="font-mono tabular-nums text-foreground">
                {usage.data.apiCalls.used.toLocaleString()} /{" "}
                {usage.data.apiCalls.limit.toLocaleString()}
              </dd>
            </div>
            <Progress
              aria-label={t("subscription.usageApiCalls")}
              className="mt-1.5"
              max={Math.max(usage.data.apiCalls.limit, 1)}
              value={Math.min(usage.data.apiCalls.used, usage.data.apiCalls.limit)}
              colors={{
                0: "hsl(var(--success))",
                80: "hsl(var(--warning))",
                95: "hsl(var(--destructive))",
              }}
            />
          </div>
          <div className="flex items-baseline justify-between gap-3 text-xs">
            <dt className="text-muted-foreground">{t("subscription.usageAiTokens")}</dt>
            <dd className="font-mono tabular-nums text-foreground">
              {usage.data.aiTokens.used.toLocaleString()}
            </dd>
          </div>
        </dl>
      )}
    </div>
  );
}
