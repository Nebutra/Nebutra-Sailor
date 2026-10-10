"use client";

import { Calendar, ChartTrendingUp, CreditCard, Sparkles } from "@nebutra/icons";
import {
  Badge,
  Card,
  CardContent,
  CardHeader,
  MetricCard,
  MetricGrid,
  Progress,
  StatusDot,
} from "@nebutra/ui/primitives";

import { ShowcaseFrame } from "./showcase-frame";
import type { PackageShowcaseProps } from "./types";
import { useFormatLocale } from "./use-format-locale";

type Metric = { label: string; value: string; trend?: "up" | "down"; trendValue?: string };
type SparkBar = { label: string; pct: number };
type Copy = {
  title: string;
  syncedLabel: string;
  /** Translatable metric label (and trend note), keyed by metric index. */
  metrics: Record<string, { label?: string; trendValue?: string }>;
  invoice: {
    heading: string;
    period: string;
    nextLabel: string;
    statusLabel: string;
  };
  trendHeading: string;
  trendCaption: string;
};

// Figures, the customer, plan and provider — demo data, same on every locale.
const METRICS: ReadonlyArray<Omit<Metric, "label">> = [
  { value: "$12,400", trend: "up", trendValue: "+12%" },
  { value: "847", trend: "up", trendValue: "+34" },
  { value: "+5.2%", trend: "up" },
  { value: "1.2%", trend: "down", trendValue: "-0.3%" },
];
const INVOICE = {
  customer: "Acme Robotics, Inc.",
  customerSub: "billing@acme.dev",
  plan: "Pro",
  amount: "$249.00",
  provider: "Creem",
} as const;
const NEXT_DATE = Date.UTC(2026, 5, 12);

const BAR_PCTS = [42, 58, 51, 67, 73, 80, 92] as const;
// 2024-01-01 was a Monday: seven consecutive days give Mon…Sun in any locale.
const WEEK_START = Date.UTC(2024, 0, 1);
const DAY_MS = 86_400_000;

function weekBars(locale: string): SparkBar[] {
  const fmt = new Intl.DateTimeFormat(locale, { weekday: "short", timeZone: "UTC" });
  return BAR_PCTS.map((pct, i) => ({ label: fmt.format(WEEK_START + i * DAY_MS), pct }));
}

export function BillingShowcase({ copy: rawCopy }: PackageShowcaseProps) {
  const copy = rawCopy as Copy;
  const locale = useFormatLocale();
  const metrics: Metric[] = METRICS.map((metric, i) => ({
    ...metric,
    label: "",
    ...copy.metrics[i],
  }));
  const bars = weekBars(locale);
  const nextDate = new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeZone: "UTC" }).format(
    NEXT_DATE,
  );
  return (
    <ShowcaseFrame>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0 p-4 md:p-5">
          <div className="flex min-w-0 items-center gap-2">
            <span className="inline-flex h-6 w-6 items-center justify-center rounded-[var(--radius-md)] bg-primary text-primary-foreground">
              <CreditCard className="h-3.5 w-3.5" aria-hidden="true" />
            </span>
            <span className="truncate text-sm font-semibold text-foreground">{copy.title}</span>
          </div>
          <div className="flex items-center gap-2">
            <StatusDot state="READY" titlePrefix="Billing sync" />
            <span className="text-xs text-muted-foreground">{copy.syncedLabel}</span>
          </div>
        </CardHeader>
        <CardContent className="space-y-5 p-4 pt-0 md:p-5 md:pt-0">
          <div className="rounded-[var(--radius-md)] border border-border/60 bg-muted/30 p-3">
            <MetricGrid columns={4} className="gap-3">
              {metrics.map((metric) => (
                <MetricCard
                  key={metric.label}
                  size="sm"
                  label={metric.label}
                  value={metric.value}
                  trend={metric.trend}
                  trendValue={metric.trendValue}
                />
              ))}
            </MetricGrid>
          </div>

          <div className="grid gap-4 md:grid-cols-5">
            <div className="space-y-3 rounded-[var(--radius-md)] border border-border/60 bg-card p-4 md:col-span-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                  {copy.invoice.heading}
                </span>
                <Badge variant="success" size="sm" className="font-medium">
                  <Sparkles className="h-3 w-3" aria-hidden="true" />
                  {copy.invoice.statusLabel}
                </Badge>
              </div>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-foreground">
                    {INVOICE.customer}
                  </p>
                  <p className="truncate font-mono text-xs text-muted-foreground">
                    {INVOICE.customerSub}
                  </p>
                </div>
                <Badge variant="blue-subtle" size="sm">
                  {INVOICE.plan}
                </Badge>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-semibold tabular-nums tracking-tight text-foreground">
                  {INVOICE.amount}
                </span>
                <span className="text-xs text-muted-foreground">{copy.invoice.period}</span>
              </div>
              <div className="flex items-center justify-between gap-2 border-t border-border/60 pt-3">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Calendar className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>{copy.invoice.nextLabel}</span>
                  <span className="font-medium text-foreground">{nextDate}</span>
                </div>
                <Badge variant="outline" size="sm" className="font-mono">
                  {INVOICE.provider}
                </Badge>
              </div>
            </div>

            <div className="space-y-3 rounded-[var(--radius-md)] border border-border/60 bg-card p-4 md:col-span-2">
              <div className="flex items-center gap-1.5">
                <ChartTrendingUp className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
                <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                  {copy.trendHeading}
                </span>
              </div>
              <ul className="space-y-1.5">
                {bars.map((bar) => (
                  <li key={bar.label} className="flex items-center gap-2">
                    <span className="w-8 shrink-0 font-mono text-[10px] text-muted-foreground">
                      {bar.label}
                    </span>
                    <Progress value={bar.pct} max={100} size="sm" className="flex-1" />
                    <span className="w-9 shrink-0 text-right font-mono text-[10px] tabular-nums text-muted-foreground">
                      {bar.pct}%
                    </span>
                  </li>
                ))}
              </ul>
              <p className="text-[11px] text-muted-foreground">{copy.trendCaption}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </ShowcaseFrame>
  );
}
