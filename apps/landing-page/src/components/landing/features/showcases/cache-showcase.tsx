"use client";

import { Bug, Check, Clock, Database, Lightning } from "@nebutra/icons";

import { Badge } from "@nebutra/ui/primitives/badge";
import { Card, CardContent, CardHeader } from "@nebutra/ui/primitives/card";
import { Gauge } from "@nebutra/ui/primitives/gauge";
import { MetricCard, MetricGrid } from "@nebutra/ui/primitives/metric-card";
import { Progress } from "@nebutra/ui/primitives/progress";

import { ShowcaseFrame } from "./showcase-frame";
import type { PackageShowcaseProps } from "./types";

type RowStatus = "HIT" | "MISS";
type CacheRow = { key: string; ttl: string; status: RowStatus; size: string };

const ROWS: CacheRow[] = [
  { key: "user:abc123:profile", ttl: "58s", status: "HIT", size: "4.2 KB" },
  { key: "session:xyz789", ttl: "12m", status: "HIT", size: "1.1 KB" },
  { key: "org:42:billing", ttl: "—", status: "MISS", size: "0 B" },
  { key: "post:9c1f:meta", ttl: "5m", status: "HIT", size: "812 B" },
  { key: "rate:ip:10.0.2", ttl: "47s", status: "HIT", size: "64 B" },
  { key: "feed:home:v3", ttl: "—", status: "MISS", size: "0 B" },
];

const COPY = {
  en: {
    title: "Cache observability",
    hitRate: "Hit rate",
    latP50: "Latency p50",
    latP99: "Latency p99",
    memory: "Memory",
    gaugeLabel: "Hit ratio",
    gaugeSub: "last 5 min",
    memUsed: "Memory used",
    recent: "Recent keys",
    ttl: "TTL",
    size: "Size",
  },
  zh: {
    title: "缓存可观测性",
    hitRate: "命中率",
    latP50: "延迟 p50",
    latP99: "延迟 p99",
    memory: "内存",
    gaugeLabel: "命中比",
    gaugeSub: "近 5 分钟",
    memUsed: "已用内存",
    recent: "最近键",
    ttl: "TTL",
    size: "大小",
  },
} as const;

const HIT_RATIO = 94.7;
const MEMORY_PCT = (847 / 2048) * 100;

function StatusPill({ status }: { status: RowStatus }) {
  if (status === "HIT") {
    return (
      <Badge variant="success" size="sm" className="font-mono">
        <Check className="h-3 w-3" aria-hidden="true" />
        HIT
      </Badge>
    );
  }
  return (
    <Badge variant="warning" size="sm" className="font-mono">
      <Bug className="h-3 w-3" aria-hidden="true" />
      MISS
    </Badge>
  );
}

export function CacheShowcase({ locale }: PackageShowcaseProps) {
  const copy = COPY[locale];

  return (
    <ShowcaseFrame>
      <Card className="border-border/60 shadow-none">
        <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0 p-4 md:p-5">
          <div className="flex min-w-0 items-center gap-2">
            <span className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-[image:var(--brand-gradient)] text-white">
              <Database className="h-3.5 w-3.5" aria-hidden="true" />
            </span>
            <span className="text-sm font-semibold text-foreground">{copy.title}</span>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" size="sm" className="font-mono">
              Upstash Redis
            </Badge>
            <Badge variant="gray-subtle" size="sm" className="font-mono">
              us-east-1
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="space-y-5 p-4 pt-0 md:p-5 md:pt-0">
          <div className="rounded-md border border-border/60 bg-muted/30 p-3">
            <MetricGrid columns={4} className="gap-3">
              <MetricCard
                size="sm"
                label={copy.hitRate}
                value="94.7%"
                trend="up"
                trendValue="+2.1%"
                icon={<Lightning />}
              />
              <MetricCard
                size="sm"
                label={copy.latP50}
                value="1.2ms"
                trend="down"
                trendValue="−0.3ms"
                icon={<Clock />}
              />
              <MetricCard
                size="sm"
                label={copy.latP99}
                value="8ms"
                trend="up"
                trendValue="+1.0ms"
                icon={<Clock />}
              />
              <MetricCard
                size="sm"
                label={copy.memory}
                value="847MB"
                description="/ 2GB"
                icon={<Database />}
              />
            </MetricGrid>
          </div>

          <div className="grid gap-4 md:grid-cols-[auto_1fr]">
            <div className="flex flex-col items-center justify-center gap-2 rounded-md border border-border/60 bg-muted/30 p-4">
              <Gauge
                value={HIT_RATIO}
                size="large"
                showValue
                colors={{ primary: "hsl(var(--success))", secondary: "hsl(var(--muted))" }}
                aria-label={`${copy.gaugeLabel} ${HIT_RATIO}%`}
              />
              <div className="text-center">
                <div className="text-xs font-medium text-foreground">{copy.gaugeLabel}</div>
                <div className="text-[11px] text-muted-foreground">{copy.gaugeSub}</div>
              </div>
            </div>

            <div className="space-y-3">
              <div className="rounded-md border border-border/60 bg-muted/30 p-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-foreground">{copy.memUsed}</span>
                  <span className="font-mono text-muted-foreground">847 MB / 2 GB</span>
                </div>
                <div className="mt-2">
                  <Progress value={MEMORY_PCT} size="sm" />
                </div>
              </div>

              <div className="rounded-md border border-border/60">
                <div className="flex items-center justify-between border-b border-border/60 px-3 py-2 text-xs">
                  <span className="font-medium text-foreground">{copy.recent}</span>
                  <span className="flex gap-6 font-medium text-muted-foreground">
                    <span className="w-10 text-right">{copy.ttl}</span>
                    <span className="w-16 text-right">{copy.size}</span>
                  </span>
                </div>
                <ul className="divide-y divide-border/60">
                  {ROWS.map((row) => (
                    <li key={row.key} className="flex items-center justify-between gap-3 px-3 py-2">
                      <span className="min-w-0 flex-1 truncate font-mono text-xs text-foreground">
                        {row.key}
                      </span>
                      <StatusPill status={row.status} />
                      <span className="w-10 text-right font-mono text-xs text-muted-foreground tabular-nums">
                        {row.ttl}
                      </span>
                      <span className="w-16 text-right font-mono text-xs text-muted-foreground tabular-nums">
                        {row.size}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </ShowcaseFrame>
  );
}
