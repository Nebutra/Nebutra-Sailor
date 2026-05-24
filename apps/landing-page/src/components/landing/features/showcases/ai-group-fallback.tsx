"use client";

import {
  ArrowRight,
  BeakerFlask,
  Brain,
  Cpu,
  Lightning,
  MagnifyingGlass,
  Sparkles,
} from "@nebutra/icons";
import { Badge } from "@nebutra/ui/primitives/badge";
import { Card, CardContent, CardHeader } from "@nebutra/ui/primitives/card";
import { Gauge } from "@nebutra/ui/primitives/gauge";
import { MagicCard } from "@nebutra/ui/primitives/magic-card";
import { MetricCard, MetricGrid } from "@nebutra/ui/primitives/metric-card";
import { Progress } from "@nebutra/ui/primitives/progress";
import { StatusDot } from "@nebutra/ui/primitives/status-dot";

import type { PackageShowcaseProps } from "./types";

function seeded(slug: string, max: number, offset = 0): number {
  let hash = offset;
  for (let i = 0; i < slug.length; i += 1) hash = (hash * 31 + slug.charCodeAt(i)) | 0;
  return Math.abs(hash) % max;
}

const HUB_ICONS = [Sparkles, Brain, Lightning, Cpu, BeakerFlask, MagnifyingGlass] as const;
type HubIcon = (typeof HUB_ICONS)[number];

type Copy = {
  input: string;
  output: string;
  latency: string;
  throughput: string;
  providers: string;
  quality: string;
  composes: string;
  footer: string;
  ms: string;
  rps: string;
};

const COPY: Record<"en" | "zh", Copy> = {
  en: {
    input: "Input",
    output: "Output",
    latency: "Latency p50",
    throughput: "Throughput",
    providers: "Providers",
    quality: "Quality",
    composes: "composes",
    footer: "AI runtime · composable",
    ms: "ms",
    rps: "rps",
  },
  zh: {
    input: "输入",
    output: "输出",
    latency: "P50 延迟",
    throughput: "吞吐",
    providers: "提供方",
    quality: "质量",
    composes: "组合",
    footer: "AI 运行时 · 可组合",
    ms: "毫秒",
    rps: "次/秒",
  },
};

function HubLayout({
  entry,
  copy,
  Icon,
}: {
  entry: PackageShowcaseProps["entry"];
  copy: Copy;
  Icon: HubIcon;
}) {
  const children = entry.children.slice(0, 6);
  return (
    <div className="relative mx-auto flex h-[220px] w-full max-w-md items-center justify-center">
      <MagicCard className="rounded-xl" gradientSize={160}>
        <div className="flex h-24 w-40 flex-col items-center justify-center gap-1 px-4 py-3">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-[image:var(--brand-gradient)] text-white">
            <Icon className="h-4 w-4" aria-hidden="true" />
          </span>
          <span className="truncate text-sm font-semibold text-foreground">{entry.label}</span>
          <span className="font-mono text-[10px] text-muted-foreground">
            {entry.children.length} {copy.composes}
          </span>
        </div>
      </MagicCard>
      {children.map((child, i) => {
        const angle = (i / children.length) * Math.PI * 2 - Math.PI / 2;
        const left = `calc(50% + ${Math.cos(angle) * 170}px)`;
        const top = `calc(50% + ${Math.sin(angle) * 92}px)`;
        return (
          <span
            key={child}
            className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full border border-border bg-background/90 px-2 py-1 font-mono text-[10px] text-muted-foreground shadow-sm"
            style={{ left, top }}
          >
            {child}
          </span>
        );
      })}
    </div>
  );
}

function PipelineLayout({
  entry,
  copy,
  Icon,
  latency,
}: {
  entry: PackageShowcaseProps["entry"];
  copy: Copy;
  Icon: HubIcon;
  latency: number;
}) {
  const stages: Array<{ label: string; Icon: HubIcon; accent?: boolean }> = [
    { label: copy.input, Icon: ArrowRight },
    { label: entry.label, Icon, accent: true },
    { label: copy.output, Icon: Sparkles },
  ];
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 items-stretch gap-2">
        {stages.map((s) => (
          <div
            key={s.label}
            className={
              s.accent
                ? "flex flex-col items-center justify-center gap-2 rounded-md border border-transparent bg-[image:var(--brand-gradient)] px-3 py-4 text-white"
                : "flex flex-col items-center justify-center gap-2 rounded-md border border-border bg-muted/30 px-3 py-4 text-foreground"
            }
          >
            <s.Icon className="h-4 w-4" aria-hidden="true" />
            <span
              className={
                s.accent
                  ? "text-center text-xs font-semibold text-white"
                  : "text-center text-xs font-mono text-muted-foreground"
              }
            >
              {s.label}
            </span>
          </div>
        ))}
      </div>
      <Progress value={Math.min(95, 100 - Math.round(latency / 5))} size="sm" />
    </div>
  );
}

export function AiGroupFallback({ entry, locale }: PackageShowcaseProps) {
  const copy = COPY[locale];
  const useHub = entry.children.length >= 3;
  const latency = 40 + seeded(entry.slug, 180);
  const throughput = 220 + seeded(entry.slug, 480, 7);
  const providers = 2 + seeded(entry.slug, 6, 13);
  const quality = 78 + seeded(entry.slug, 18, 19);
  const Icon = HUB_ICONS[seeded(entry.slug, HUB_ICONS.length, 3)] ?? Sparkles;

  return (
    <div
      className="rounded-[var(--radius-lg)] border border-border bg-background p-4 md:p-6"
      style={{ minHeight: 400 }}
    >
      <Card className="border-border/60 shadow-none">
        <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0 p-4 md:p-5">
          <div className="flex min-w-0 items-center gap-2">
            <span className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-[image:var(--brand-gradient)] text-white">
              <Icon className="h-3.5 w-3.5" aria-hidden="true" />
            </span>
            <span className="truncate text-sm font-semibold text-foreground">{entry.label}</span>
            <Badge variant="outline" size="sm" className="font-mono">
              {entry.path}
            </Badge>
          </div>
          <StatusDot state="READY" label titlePrefix={`${entry.label} surface`} />
        </CardHeader>
        <CardContent className="space-y-5 p-4 pt-0 md:p-5 md:pt-0">
          {useHub ? (
            <HubLayout entry={entry} copy={copy} Icon={Icon} />
          ) : (
            <PipelineLayout entry={entry} copy={copy} Icon={Icon} latency={latency} />
          )}
          <div className="rounded-md border border-border/60 bg-muted/30 p-3">
            <MetricGrid columns={3} className="gap-3">
              <MetricCard
                size="sm"
                label={copy.latency}
                value={`${latency} ${copy.ms}`}
                icon={<Lightning />}
              />
              <MetricCard
                size="sm"
                label={copy.throughput}
                value={`${throughput} ${copy.rps}`}
                icon={<MagnifyingGlass />}
              />
              <MetricCard size="sm" label={copy.providers} value={providers} icon={<Cpu />} />
            </MetricGrid>
            <div className="mt-3 flex items-center justify-between gap-3 border-t border-border/60 pt-3">
              <span className="text-xs font-medium text-muted-foreground">{copy.quality}</span>
              <Gauge value={quality} size="small" showValue />
            </div>
          </div>
          <div className="flex items-center justify-between gap-2 font-mono text-[11px] text-muted-foreground">
            <span className="truncate">{entry.path}</span>
            <span className="shrink-0">{copy.footer}</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
