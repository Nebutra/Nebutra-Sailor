"use client";

import { Calendar, ChartTrendingUp, CreditCard, Sparkles } from "@nebutra/icons";

import { Badge } from "@nebutra/ui/primitives/badge";
import { Card, CardContent, CardHeader } from "@nebutra/ui/primitives/card";
import { MetricCard, MetricGrid } from "@nebutra/ui/primitives/metric-card";
import { Progress } from "@nebutra/ui/primitives/progress";
import { StatusDot } from "@nebutra/ui/primitives/status-dot";

import type { PackageShowcaseProps } from "./types";

type Metric = { label: string; value: string; trend?: "up" | "down"; trendValue?: string };
type SparkBar = { label: string; pct: number };
type Copy = {
  title: string;
  syncedLabel: string;
  metrics: [Metric, Metric, Metric, Metric];
  invoice: {
    heading: string;
    customer: string;
    customerSub: string;
    plan: string;
    amount: string;
    period: string;
    nextLabel: string;
    nextDate: string;
    statusLabel: string;
    provider: string;
  };
  trendHeading: string;
  trendCaption: string;
  bars: SparkBar[];
};

const BAR_PCTS = [42, 58, 51, 67, 73, 80, 92] as const;
const EN_DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;
const ZH_DAYS = ["周一", "周二", "周三", "周四", "周五", "周六", "周日"] as const;
const toBars = (days: readonly string[]): SparkBar[] =>
  days.map((label, i) => ({ label, pct: BAR_PCTS[i]! }));

const COPY: Record<"en" | "zh", Copy> = {
  en: {
    title: "Subscriptions · billing",
    syncedLabel: "live",
    metrics: [
      { label: "MRR", value: "$12,400", trend: "up", trendValue: "+12%" },
      { label: "Active subscribers", value: "847", trend: "up", trendValue: "+34" },
      { label: "MoM growth", value: "+5.2%", trend: "up", trendValue: "vs last" },
      { label: "Churn", value: "1.2%", trend: "down", trendValue: "-0.3%" },
    ],
    invoice: {
      heading: "Next invoice",
      customer: "Acme Robotics, Inc.",
      customerSub: "billing@acme.dev",
      plan: "Pro",
      amount: "$249.00",
      period: "/ month",
      nextLabel: "Renews",
      nextDate: "Jun 12, 2026",
      statusLabel: "active",
      provider: "Stripe",
    },
    trendHeading: "Revenue · last 7 days",
    trendCaption: "$12,400 this month",
    bars: toBars(EN_DAYS),
  },
  zh: {
    title: "订阅 · billing",
    syncedLabel: "已同步",
    metrics: [
      { label: "MRR", value: "$12,400", trend: "up", trendValue: "+12%" },
      { label: "活跃订阅", value: "847", trend: "up", trendValue: "+34" },
      { label: "环比增长", value: "+5.2%", trend: "up", trendValue: "对比上月" },
      { label: "流失率", value: "1.2%", trend: "down", trendValue: "-0.3%" },
    ],
    invoice: {
      heading: "下一张账单",
      customer: "Acme Robotics, Inc.",
      customerSub: "billing@acme.dev",
      plan: "Pro",
      amount: "$249.00",
      period: " / 月",
      nextLabel: "下次扣款",
      nextDate: "2026 年 6 月 12 日",
      statusLabel: "进行中",
      provider: "Stripe",
    },
    trendHeading: "收入 · 最近 7 天",
    trendCaption: "本月 $12,400",
    bars: toBars(ZH_DAYS),
  },
};

export function BillingShowcase({ locale }: PackageShowcaseProps) {
  const copy = COPY[locale];
  return (
    <div
      className="rounded-[var(--radius-lg)] border border-border bg-background p-4 md:p-6"
      style={{ minHeight: 400 }}
    >
      <Card className="border-border/60 shadow-none">
        <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0 p-4 md:p-5">
          <div className="flex min-w-0 items-center gap-2">
            <span className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-[image:var(--brand-gradient)] text-white">
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
          <div className="rounded-md border border-border/60 bg-muted/30 p-3">
            <MetricGrid columns={4} className="gap-3">
              {copy.metrics.map((metric) => (
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
            <div className="space-y-3 rounded-md border border-border/60 bg-card p-4 md:col-span-3">
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
                    {copy.invoice.customer}
                  </p>
                  <p className="truncate font-mono text-xs text-muted-foreground">
                    {copy.invoice.customerSub}
                  </p>
                </div>
                <Badge variant="blue-subtle" size="sm">
                  {copy.invoice.plan}
                </Badge>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-semibold tabular-nums tracking-tight text-foreground">
                  {copy.invoice.amount}
                </span>
                <span className="text-xs text-muted-foreground">{copy.invoice.period}</span>
              </div>
              <div className="flex items-center justify-between gap-2 border-t border-border/60 pt-3">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Calendar className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>{copy.invoice.nextLabel}</span>
                  <span className="font-medium text-foreground">{copy.invoice.nextDate}</span>
                </div>
                <Badge variant="outline" size="sm" className="font-mono">
                  {copy.invoice.provider}
                </Badge>
              </div>
            </div>

            <div className="space-y-3 rounded-md border border-border/60 bg-card p-4 md:col-span-2">
              <div className="flex items-center gap-1.5">
                <ChartTrendingUp className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
                <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                  {copy.trendHeading}
                </span>
              </div>
              <ul className="space-y-1.5">
                {copy.bars.map((bar) => (
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
    </div>
  );
}
