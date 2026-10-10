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
import { useFormatLocale } from "./use-format-locale";

type IconComponent = ComponentType<SVGProps<SVGSVGElement>>;

type Stop = {
  id: string;
  icon: IconComponent;
  ms: number;
};

const STOPS: Stop[] = [
  { id: "tenant", icon: Shield, ms: 2 },
  { id: "ratelimit", icon: Lightning, ms: 1 },
  { id: "idempotency", icon: Check, ms: 1 },
  { id: "auth", icon: LockClosed, ms: 3 },
  { id: "handler", icon: Api, ms: 18 },
  { id: "shape", icon: ArrowRight, ms: 1 },
];

type GatewayCoreCopy = {
  stops: Record<string, string>;
  totalLabel: string;
  lifecycle: string;
  okLabel: string;
  rps: string;
  p50: string;
  p95: string;
  gaugeLabel: string;
  success: string;
};

// The demo request line — same on every locale.
const METHOD = "GET";
const PATH = "/api/v1/posts";
const ORIGIN = "edge-iad1";
const STATUS = "200 OK";

function formatMs(ms: number, locale: string): string {
  return `${new Intl.NumberFormat(locale).format(ms)} ms`;
}

const TOTAL_MS = STOPS.reduce((acc, stop) => acc + stop.ms, 0);
const MAX_MS = Math.max(...STOPS.map((stop) => stop.ms));

export function GatewayCoreShowcase({ copy }: PackageShowcaseProps) {
  const t = copy as GatewayCoreCopy;
  const locale = useFormatLocale();

  return (
    <ShowcaseFrame className="flex flex-col gap-5">
      {/* Request envelope */}
      <Card className="shadow-sm">
        <CardHeader className="flex flex-row flex-wrap items-center gap-3 space-y-0 pb-4">
          <Badge size="sm" variant="blue-subtle" className="font-mono">
            {METHOD}
          </Badge>
          <code className="flex-1 truncate font-mono text-sm text-foreground">{PATH}</code>
          <StatusBadge status="success" leftIcon={Check} leftLabel={STATUS} rightLabel={ORIGIN} />
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
                      {t.stops[String(index)]}
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
