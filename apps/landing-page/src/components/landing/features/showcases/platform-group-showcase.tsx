"use client";

import {
  ChartActivity,
  Database,
  Layers,
  Lightning,
  Servers,
  SettingsGear,
  Shield,
} from "@nebutra/icons";
import { Badge } from "@nebutra/ui/primitives/badge";
import { Card, CardContent, CardHeader } from "@nebutra/ui/primitives/card";
import { Field } from "@nebutra/ui/primitives/field";
import { Gauge } from "@nebutra/ui/primitives/gauge";
import { Input } from "@nebutra/ui/primitives/input";
import { MetricCard, MetricGrid } from "@nebutra/ui/primitives/metric-card";
import { StatusDot } from "@nebutra/ui/primitives/status-dot";

import type { PackageShowcaseProps } from "./types";

// Deterministic per-slug variation. Same slug always renders the same numbers.
function seeded(slug: string, max: number, offset = 0): number {
  let hash = offset;
  for (let i = 0; i < slug.length; i += 1) hash = (hash * 31 + slug.charCodeAt(i)) | 0;
  return Math.abs(hash) % max;
}

const STACK_LAYERS = [
  { id: "edge", label: "edge", icon: Lightning },
  { id: "gateway", label: "gateway", icon: Shield },
  { id: "services", label: "services", icon: Servers },
  { id: "platform", label: "platform", icon: Layers },
  { id: "storage", label: "storage", icon: Database },
] as const;

const COPY = {
  en: {
    badgeFoundational: "Foundational layer",
    stackHeading: "Runtime stack",
    configHeading: "Resolved config",
    youAreHere: "you are here",
    metricUptime: "Uptime",
    metricLatency: "p99 latency",
    metricConns: "Active connections",
    metricTenants: "Active tenants",
    uptimeLabel: "Uptime",
    footnote: "Lowest shared layer · zero-app coupling",
    cfgUrl: "url",
    cfgTimeout: "timeoutMs",
    cfgPoolSize: "poolSize",
  },
  zh: {
    badgeFoundational: "基础层",
    stackHeading: "运行时栈",
    configHeading: "解析后的配置",
    youAreHere: "当前层",
    metricUptime: "可用性",
    metricLatency: "p99 延迟",
    metricConns: "活跃连接",
    metricTenants: "活跃租户",
    uptimeLabel: "可用性",
    footnote: "最低共享层 · 与应用零耦合",
    cfgUrl: "url",
    cfgTimeout: "timeoutMs",
    cfgPoolSize: "poolSize",
  },
} as const;

function configHost(slug: string) {
  const region = ["use1", "euc1", "apse1", "apne2"][seeded(slug, 4, 11)] ?? "use1";
  return `https://${slug}.${region}.svc.nebutra.internal:6432`;
}

export function PlatformGroupShowcase({ entry, locale }: PackageShowcaseProps) {
  const t = COPY[locale];
  const uptime = 99.0 + seeded(entry.slug, 99, 3) / 100;
  const p99Ms = 8 + seeded(entry.slug, 42, 7);
  const conns = 320 + seeded(entry.slug, 4_680, 11);
  const tenants = 18 + seeded(entry.slug, 482, 17);
  const timeoutMs = 500 + seeded(entry.slug, 4_500, 19);
  const poolSize = 8 + seeded(entry.slug, 56, 23);

  const matchIdx = STACK_LAYERS.findIndex((l) => l.id === entry.slug);
  const highlightIdx =
    matchIdx !== -1 ? matchIdx : STACK_LAYERS.findIndex((l) => l.id === "platform");

  const inputCls =
    "h-8 w-full rounded-md border border-border bg-background px-2 font-mono text-[11px] text-foreground";

  return (
    <div
      className="rounded-[var(--radius-lg)] border border-border bg-background p-4 md:p-6"
      style={{ minHeight: 400 }}
    >
      <Card className="border-border/60 shadow-none">
        <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0 p-4 md:p-5">
          <div className="flex min-w-0 items-center gap-2">
            <span className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-[image:var(--brand-gradient)] text-white">
              <Database className="h-3.5 w-3.5" aria-hidden="true" />
            </span>
            <span className="truncate text-sm font-semibold text-foreground">{entry.label}</span>
            <Badge variant="outline" size="sm" className="font-mono">
              {entry.path}
            </Badge>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Badge variant="blue-subtle" size="sm" icon={<Layers />}>
              {t.badgeFoundational}
            </Badge>
            <StatusDot state="READY" decorative titlePrefix={`${entry.label} layer`} />
          </div>
        </CardHeader>

        <CardContent className="space-y-4 p-4 pt-0 md:p-5 md:pt-0">
          <div className="grid gap-4 md:grid-cols-[1fr_220px]">
            {/* Stack diagram */}
            <div className="space-y-2 rounded-md border border-border/60 bg-muted/30 p-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground">{t.stackHeading}</span>
                <Badge variant="gray-subtle" size="sm" icon={<Servers />}>
                  {STACK_LAYERS.length} layers
                </Badge>
              </div>
              <ul className="flex flex-col gap-1.5" aria-label={t.stackHeading}>
                {STACK_LAYERS.map((layer, idx) => {
                  const active = idx === highlightIdx;
                  const dim = active ? 1 : Math.max(0.4, 1 - Math.abs(idx - highlightIdx) * 0.18);
                  const rowCls = active
                    ? "flex items-center gap-2 rounded-sm border border-blue-500/40 bg-[image:var(--brand-gradient)]/10 px-2 py-1.5 shadow-[0_0_0_1px_var(--blue-7),0_4px_18px_-4px_var(--blue-9)]"
                    : "flex items-center gap-2 rounded-sm border border-border/40 bg-background/70 px-2 py-1.5";
                  const iconCls = active
                    ? "h-3.5 w-3.5 text-blue-600"
                    : "h-3.5 w-3.5 text-muted-foreground";
                  const lblCls = active
                    ? "flex-1 truncate font-mono text-xs font-semibold text-foreground"
                    : "flex-1 truncate font-mono text-xs text-muted-foreground";
                  return (
                    <li
                      key={layer.id}
                      className={rowCls}
                      style={active ? undefined : { opacity: dim }}
                      aria-current={active ? "true" : undefined}
                    >
                      <layer.icon className={iconCls} aria-hidden="true" />
                      <span className={lblCls}>{layer.label}</span>
                      {active && (
                        <Badge variant="blue-subtle" size="sm">
                          {t.youAreHere}
                        </Badge>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>

            {/* Uptime gauge */}
            <div className="flex flex-col items-center justify-center gap-2 rounded-md border border-border/60 bg-muted/30 p-3">
              <span className="text-xs font-medium text-muted-foreground">{t.uptimeLabel}</span>
              <Gauge value={uptime} size="medium" showValue aria-label={t.uptimeLabel} />
              <span className="font-mono text-[11px] tabular-nums text-muted-foreground">
                {uptime.toFixed(2)}%
              </span>
            </div>
          </div>

          {/* Config panel */}
          <div className="space-y-3 rounded-md border border-border/60 bg-muted/30 p-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">{t.configHeading}</span>
              <Badge variant="gray-subtle" size="sm" icon={<SettingsGear />}>
                {entry.label}.config
              </Badge>
            </div>
            <div className="grid gap-3 md:grid-cols-3">
              <Field label={`${entry.label}.${t.cfgUrl}`} htmlFor={`${entry.slug}-url`}>
                <Input
                  id={`${entry.slug}-url`}
                  className={inputCls}
                  readOnly
                  value={configHost(entry.slug)}
                />
              </Field>
              <Field label={`${entry.label}.${t.cfgTimeout}`} htmlFor={`${entry.slug}-timeout`}>
                <Input
                  id={`${entry.slug}-timeout`}
                  className={inputCls}
                  readOnly
                  value={`${timeoutMs}`}
                />
              </Field>
              <Field label={`${entry.label}.${t.cfgPoolSize}`} htmlFor={`${entry.slug}-pool`}>
                <Input
                  id={`${entry.slug}-pool`}
                  className={inputCls}
                  readOnly
                  value={`${poolSize}`}
                />
              </Field>
            </div>
          </div>

          {/* Metrics */}
          <div className="rounded-md border border-border/60 bg-muted/30 p-3">
            <MetricGrid columns={4} className="gap-3">
              <MetricCard
                size="sm"
                label={t.metricUptime}
                value={`${uptime.toFixed(2)}%`}
                icon={<Shield />}
                trend="up"
                trendValue={`+${(seeded(entry.slug, 9, 29) + 1) / 100}%`}
              />
              <MetricCard
                size="sm"
                label={t.metricLatency}
                value={`${p99Ms} ms`}
                icon={<ChartActivity />}
                trend="down"
                trendValue={`-${1 + seeded(entry.slug, 8, 31)}%`}
              />
              <MetricCard
                size="sm"
                label={t.metricConns}
                value={conns}
                icon={<Servers />}
                trend="neutral"
              />
              <MetricCard
                size="sm"
                label={t.metricTenants}
                value={tenants}
                icon={<Layers />}
                trend="up"
                trendValue={`+${1 + seeded(entry.slug, 12, 37)}%`}
              />
            </MetricGrid>
          </div>

          <div className="flex items-center justify-between gap-2 font-mono text-[11px] text-muted-foreground">
            <span className="truncate">{entry.path}</span>
            <span className="shrink-0">
              {entry.groupLabel} · {t.footnote}
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
