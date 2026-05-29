"use client";

import { BeakerFlask, Brain, Cpu, Lightning, MagnifyingGlass, Sparkles } from "@nebutra/icons";
import { Badge } from "@nebutra/ui/primitives";
import { cn } from "@nebutra/ui/utils";
import type { ComponentType, SVGProps } from "react";

import { ShowcaseFrame } from "./showcase-frame";
import type { PackageShowcaseProps } from "./types";

function seeded(slug: string, max: number, offset = 0): number {
  let hash = offset;
  for (let i = 0; i < slug.length; i += 1) hash = (hash * 31 + slug.charCodeAt(i)) | 0;
  return Math.abs(hash) % max;
}

const HUB_ICONS = [Sparkles, Brain, Lightning, Cpu, BeakerFlask, MagnifyingGlass] as const;
type HubIcon = (typeof HUB_ICONS)[number];
type IconCmp = ComponentType<SVGProps<SVGSVGElement>>;

type Copy = {
  ready: string;
  graphTitle: string;
  ledgerTitle: string;
  contractTitle: string;
  input: string;
  plan: string;
  policy: string;
  stream: string;
  output: string;
  latency: string;
  throughput: string;
  providers: string;
  quality: string;
  footer: string;
  ms: string;
  rps: string;
};

const COPY: Record<"en" | "zh", Copy> = {
  en: {
    ready: "Ready",
    graphTitle: "Capability graph",
    ledgerTitle: "Run ledger",
    contractTitle: "Runtime contract",
    input: "Input",
    plan: "Plan",
    policy: "Tool policy",
    stream: "Stream UI",
    output: "Output",
    latency: "p50 latency",
    throughput: "events/sec",
    providers: "providers",
    quality: "eval score",
    footer: "AI runtime · tool registry · MCP boundary",
    ms: "ms",
    rps: "/s",
  },
  zh: {
    ready: "就绪",
    graphTitle: "能力图谱",
    ledgerTitle: "执行账本",
    contractTitle: "运行时契约",
    input: "输入",
    plan: "规划",
    policy: "工具策略",
    stream: "流式 UI",
    output: "输出",
    latency: "p50 延迟",
    throughput: "事件/秒",
    providers: "提供方",
    quality: "评测分",
    footer: "AI 运行时 · 工具注册表 · MCP 边界",
    ms: "毫秒",
    rps: "/秒",
  },
};

function CompactMetric({
  label,
  value,
  icon: Icon,
  accent,
}: {
  label: string;
  value: string | number;
  icon: IconCmp;
  accent?: boolean;
}) {
  return (
    <div
      className={cn(
        "min-w-0 rounded-[var(--radius-md)] border px-3 py-2.5",
        accent ? "border-primary/30 bg-primary/5" : "border-border/60 bg-background/70",
      )}
    >
      <div className="mb-1 flex items-center gap-1.5 text-muted-foreground">
        <Icon className="size-3.5 shrink-0" aria-hidden="true" />
        <span className="truncate text-[11px] font-medium">{label}</span>
      </div>
      <div className="truncate font-semibold text-foreground text-lg tabular-nums">{value}</div>
    </div>
  );
}

function LedgerRow({
  label,
  detail,
  index,
  done,
}: {
  label: string;
  detail: string;
  index: number;
  done?: boolean;
}) {
  return (
    <li className="grid grid-cols-[1.5rem_minmax(0,1fr)] gap-3">
      <div className="flex flex-col items-center">
        <span
          className={cn(
            "flex size-6 items-center justify-center rounded-full border font-mono text-[10px]",
            done
              ? "border-[hsl(var(--success)/0.35)] bg-success/10 text-success"
              : "border-border bg-background text-muted-foreground",
          )}
        >
          {index}
        </span>
        {index < 5 ? <span className="mt-1 h-6 w-px bg-border/70" aria-hidden="true" /> : null}
      </div>
      <div className="min-w-0 pt-0.5">
        <div className="text-xs font-medium text-foreground">{label}</div>
        <div className="truncate font-mono text-[11px] text-muted-foreground">{detail}</div>
      </div>
    </li>
  );
}

function CapabilityNode({
  label,
  active,
  Icon,
}: {
  label: string;
  active?: boolean;
  Icon: HubIcon;
}) {
  return (
    <div
      className={cn(
        "flex min-w-0 items-center gap-2 rounded-[var(--radius-md)] border px-3 py-2",
        active
          ? "border-transparent bg-[image:var(--brand-gradient)] text-white shadow-[0_10px_30px_-18px_hsl(var(--primary))]"
          : "border-border/60 bg-background/80 text-foreground",
      )}
    >
      <Icon
        className={cn("size-4 shrink-0", active ? "text-white" : "text-muted-foreground")}
        aria-hidden="true"
      />
      <span className="truncate text-xs font-semibold">{label}</span>
    </div>
  );
}

export function AiGroupShowcase({ entry, locale }: PackageShowcaseProps) {
  const copy = COPY[locale];
  const latency = 40 + seeded(entry.slug, 180);
  const throughput = 220 + seeded(entry.slug, 480, 7);
  const providers = 2 + seeded(entry.slug, 6, 13);
  const quality = 78 + seeded(entry.slug, 18, 19);
  const Icon = HUB_ICONS[seeded(entry.slug, HUB_ICONS.length, 3)] ?? Sparkles;
  const capabilityNodes = [
    entry.label,
    ...entry.children.slice(0, 5).map((child) => child.replaceAll("-", " ")),
  ];

  const ledger = [
    { label: copy.input, detail: `${entry.path}/request` },
    { label: copy.plan, detail: "message reducer -> model turn" },
    { label: copy.policy, detail: "tool schema · auth scope · rate limit" },
    { label: copy.stream, detail: "events -> UI state machine" },
    { label: copy.output, detail: "@nebutra/agents response envelope" },
  ];

  return (
    <ShowcaseFrame className="p-0! md:p-0!" minHeight={360}>
      <div className="relative overflow-hidden rounded-[calc(var(--radius-panel)-1px)] border border-border/50 bg-background">
        <div
          className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,hsl(var(--border))_1px,transparent_1px),linear-gradient(hsl(var(--border))_1px,transparent_1px)] bg-[length:32px_32px] opacity-[0.28]"
          aria-hidden="true"
        />
        <div className="relative flex flex-col gap-5 p-4 md:p-5">
          <div className="flex flex-col gap-3 border-border/60 border-b pb-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-center gap-2">
              <span className="inline-flex size-7 items-center justify-center rounded-[var(--radius-sm)] bg-[image:var(--brand-gradient)] text-white">
                <Icon className="size-4" aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <div className="flex min-w-0 items-center gap-2">
                  <h3 className="truncate font-semibold text-foreground text-sm">{entry.label}</h3>
                  <Badge variant="outline" size="sm" className="font-mono">
                    {entry.path}
                  </Badge>
                </div>
                <p className="mt-1 font-mono text-[11px] text-muted-foreground">{copy.footer}</p>
              </div>
            </div>
            <div className="inline-flex w-fit items-center gap-2 rounded-full border border-border/70 bg-background/80 px-2.5 py-1 text-xs text-foreground">
              <span
                className="size-1.5 rounded-full bg-success shadow-[0_0_0_3px_hsl(var(--success)/0.12)]"
                aria-hidden="true"
              />
              {copy.ready}
            </div>
          </div>

          <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
            <section
              className="min-w-0 rounded-[var(--radius-lg)] border border-border/60 bg-background/70 p-4"
              aria-labelledby={`${entry.slug}-graph`}
            >
              <div className="mb-4 flex items-center justify-between gap-3">
                <h4
                  id={`${entry.slug}-graph`}
                  className="font-mono text-[11px] text-muted-foreground uppercase tracking-[0.22em]"
                >
                  {copy.graphTitle}
                </h4>
                <span className="font-mono text-[11px] text-muted-foreground" translate="no">
                  {entry.group}/{entry.slug}
                </span>
              </div>

              <div className="grid items-center gap-3 md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]">
                <div className="grid gap-2">
                  {capabilityNodes.slice(1, 4).map((node, index) => (
                    <CapabilityNode
                      key={node}
                      label={node}
                      Icon={HUB_ICONS[(index + 1) % HUB_ICONS.length] ?? Brain}
                    />
                  ))}
                </div>

                <div className="flex items-center justify-center gap-2 md:flex-col">
                  <span className="hidden h-12 w-px bg-border md:block" aria-hidden="true" />
                  <CapabilityNode label={capabilityNodes[0] ?? entry.label} active Icon={Icon} />
                  <span className="hidden h-12 w-px bg-border md:block" aria-hidden="true" />
                </div>

                <div className="grid gap-2">
                  {(capabilityNodes.length > 4
                    ? capabilityNodes.slice(4, 7)
                    : [copy.policy, copy.stream, copy.output]
                  ).map((node, index) => (
                    <CapabilityNode
                      key={node}
                      label={node}
                      Icon={HUB_ICONS[(index + 4) % HUB_ICONS.length] ?? Sparkles}
                    />
                  ))}
                </div>
              </div>
            </section>

            <section
              className="rounded-[var(--radius-lg)] border border-border/60 bg-background/70 p-4"
              aria-labelledby={`${entry.slug}-ledger`}
            >
              <h4
                id={`${entry.slug}-ledger`}
                className="mb-4 font-mono text-[11px] text-muted-foreground uppercase tracking-[0.22em]"
              >
                {copy.ledgerTitle}
              </h4>
              <ol className="space-y-0">
                {ledger.map((item, index) => (
                  <LedgerRow
                    key={item.label}
                    label={item.label}
                    detail={item.detail}
                    index={index + 1}
                    done={index < 4}
                  />
                ))}
              </ol>
            </section>
          </div>

          <section
            className="grid gap-3 border-border/60 border-t pt-4 sm:grid-cols-2 lg:grid-cols-4"
            aria-label={copy.contractTitle}
          >
            <CompactMetric
              label={copy.latency}
              value={`${latency} ${copy.ms}`}
              icon={Lightning}
              accent
            />
            <CompactMetric
              label={copy.throughput}
              value={`${throughput}${copy.rps}`}
              icon={MagnifyingGlass}
            />
            <CompactMetric label={copy.providers} value={providers} icon={Cpu} />
            <CompactMetric label={copy.quality} value={quality} icon={Sparkles} />
          </section>
        </div>
      </div>
    </ShowcaseFrame>
  );
}
