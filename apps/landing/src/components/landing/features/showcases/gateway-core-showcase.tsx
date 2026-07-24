"use client";

import { Api, ArrowRight, Check, Lightning, LockClosed, Shield } from "@nebutra/icons";
import {
  Badge,
  Card,
  CardContent,
  CardHeader,
  Gauge,
  MetricCard,
  Separator,
  StatusBadge,
  StatusDot,
} from "@nebutra/ui/primitives";
import type { ComponentType, SVGProps } from "react";
import { ShowcaseFrame } from "./showcase-frame";
import type { PackageShowcaseProps } from "./types";

type IconComponent = ComponentType<SVGProps<SVGSVGElement>>;

type Stop = {
  id: string;
  icon: IconComponent;
  label: { en: string; zh: string };
  ms: number;
};

const STOPS: Stop[] = [
  { id: "tenant", icon: Shield, label: { en: "Tenant resolution", zh: "租户解析" }, ms: 2 },
  { id: "ratelimit", icon: Lightning, label: { en: "Rate-limit check", zh: "限流检查" }, ms: 1 },
  { id: "idempotency", icon: Check, label: { en: "Idempotency", zh: "幂等性" }, ms: 1 },
  { id: "auth", icon: LockClosed, label: { en: "Auth", zh: "认证" }, ms: 3 },
  { id: "handler", icon: Api, label: { en: "Route handler", zh: "路由处理" }, ms: 18 },
  { id: "shape", icon: ArrowRight, label: { en: "Response shape", zh: "响应封装" }, ms: 1 },
];

const COPY = {
  en: {
    method: "GET",
    path: "/api/v1/posts",
    origin: "edge-iad1",
    status: "200 OK",
    totalLabel: "Total latency",
    lifecycle: "Middleware lifecycle",
    okLabel: "OK",
    rps: "Requests / sec",
    p50: "p50 latency",
    p95: "p95 latency",
    gaugeLabel: "Success rate",
    success: "success",
  },
  zh: {
    method: "GET",
    path: "/api/v1/posts",
    origin: "edge-iad1",
    status: "200 OK",
    totalLabel: "总延迟",
    lifecycle: "中间件生命周期",
    okLabel: "已通过",
    rps: "每秒请求",
    p50: "p50 延迟",
    p95: "p95 延迟",
    gaugeLabel: "成功率",
    success: "成功",
  },
} as const;

function formatMs(ms: number, locale: "en" | "zh"): string {
  return `${new Intl.NumberFormat(locale === "zh" ? "zh-CN" : "en-US").format(ms)} ms`;
}

const TOTAL_MS = STOPS.reduce((acc, stop) => acc + stop.ms, 0);
const MAX_MS = Math.max(...STOPS.map((stop) => stop.ms));

export function GatewayCoreShowcase({ locale }: PackageShowcaseProps) {
  const t = COPY[locale];

  return (
    <ShowcaseFrame className="flex flex-col gap-5">
      {/* Request envelope */}
      <Card className="shadow-sm">
        <CardHeader className="flex flex-row flex-wrap items-center gap-3 space-y-0 pb-4">
          <Badge size="sm" variant="blue-subtle" className="font-mono">
            {t.method}
          </Badge>
          <code className="flex-1 truncate font-mono text-sm text-foreground">{t.path}</code>
          <StatusBadge
            status="success"
            leftIcon={Check}
            leftLabel={t.status}
            rightLabel={t.origin}
          />
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4 pt-0 sm:grid-cols-4">
          <MetricCard size="sm" label={t.totalLabel} value={formatMs(TOTAL_MS, locale)} />
          <MetricCard size="sm" label={t.rps} value="2,431" trend="up" trendValue="+12%" />
          <MetricCard size="sm" label={t.p50} value={formatMs(22, locale)} />
          <MetricCard size="sm" label={t.p95} value={formatMs(48, locale)} trend="neutral" />
        </CardContent>
      </Card>

      {/* Lifecycle + gauge */}
      <div className="grid grid-cols-1 gap-5 md:grid-cols-[1fr_auto]">
        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {t.lifecycle}
            </p>
            <StatusDot state="READY" label titlePrefix="Pipeline" />
          </CardHeader>
          <CardContent className="pt-0">
            <ol className="flex flex-col gap-3" aria-label={t.lifecycle}>
              {STOPS.map((stop, index) => {
                const Icon = stop.icon;
                const widthPct = Math.max(8, Math.round((stop.ms / MAX_MS) * 100));
                return (
                  <li key={stop.id} className="flex items-center gap-3">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-border bg-muted/40 text-muted-foreground">
                      <Icon className="size-3.5" aria-hidden="true" />
                    </span>
                    <span className="w-5 shrink-0 font-mono text-[11px] text-muted-foreground tabular-nums">
                      {index + 1}
                    </span>
                    <span className="flex-1 truncate text-sm font-medium text-foreground">
                      {stop.label[locale]}
                    </span>
                    <span
                      aria-hidden="true"
                      className="hidden h-1.5 rounded-full bg-gradient-to-r from-primary/40 to-primary/80 sm:block"
                      style={{ width: `${widthPct}%`, maxWidth: "8rem" }}
                    />
                    <span className="w-12 shrink-0 text-right font-mono text-xs tabular-nums text-muted-foreground">
                      {formatMs(stop.ms, locale)}
                    </span>
                    <Badge size="sm" variant="green-subtle" className="shrink-0">
                      <Check aria-hidden="true" />
                      {t.okLabel}
                    </Badge>
                  </li>
                );
              })}
            </ol>
          </CardContent>
        </Card>

        <Card className="flex flex-col items-center justify-center gap-3 px-6 py-5 shadow-sm md:w-44">
          <Gauge value={99} size="medium" showValue aria-label={t.gaugeLabel} />
          <Separator className="w-10" />
          <div className="text-center">
            <p className="text-xs font-medium text-foreground">{t.gaugeLabel}</p>
            <p className="text-[11px] text-muted-foreground">99% · {t.success}</p>
          </div>
        </Card>
      </div>
    </ShowcaseFrame>
  );
}
