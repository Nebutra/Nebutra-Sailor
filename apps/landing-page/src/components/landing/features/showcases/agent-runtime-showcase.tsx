"use client";

import {
  ArrowRight,
  Brain,
  Check,
  Cpu,
  Lightning,
  MagnifyingGlass,
  Sparkles,
  Wrench,
} from "@nebutra/icons";
import { Badge } from "@nebutra/ui/primitives/badge";
import { Card, CardContent, CardHeader } from "@nebutra/ui/primitives/card";
import { MetricCard, MetricGrid } from "@nebutra/ui/primitives/metric-card";
import { StatusDot } from "@nebutra/ui/primitives/status-dot";
import type { ComponentType, SVGProps } from "react";

import { ShowcaseFrame } from "./showcase-frame";
import type { PackageShowcaseProps } from "./types";

type TraceKind = "prompt" | "think" | "tool" | "result" | "answer";

type TraceEvent = {
  label: string;
  detail: string;
  kind: TraceKind;
};

type Copy = {
  agentRun: string;
  complete: string;
  events: TraceEvent[];
  metrics: { label: string; value: string }[];
};

const COPY: Record<"en" | "zh", Copy> = {
  en: {
    agentRun: "Agent run",
    complete: "complete",
    events: [
      {
        kind: "prompt",
        label: "User prompt",
        detail: "Find recent signups in EU and email the team",
      },
      { kind: "think", label: "Model turn", detail: "planning · 412 tokens" },
      { kind: "tool", label: "tool_call", detail: "search_users({ region: 'eu', since: '7d' })" },
      { kind: "result", label: "tool_result", detail: "→ 23 rows · 184 ms" },
      { kind: "tool", label: "tool_call", detail: "send_email({ to: 'team@', body: ... })" },
      { kind: "result", label: "tool_result", detail: "→ ok · message_id=msg_8f2a" },
      { kind: "answer", label: "Final answer", detail: "Sent digest to team. 23 EU signups." },
    ],
    metrics: [
      { label: "Steps", value: "7" },
      { label: "Tokens", value: "1,247" },
      { label: "Latency", value: "2.3s" },
      { label: "Tool calls", value: "2" },
    ],
  },
  zh: {
    agentRun: "Agent 执行",
    complete: "已完成",
    events: [
      { kind: "prompt", label: "用户提问", detail: "查找最近欧区注册并通知团队" },
      { kind: "think", label: "模型推理", detail: "规划中 · 412 tokens" },
      { kind: "tool", label: "tool_call", detail: "search_users({ region: 'eu', since: '7d' })" },
      { kind: "result", label: "tool_result", detail: "→ 23 条 · 184 ms" },
      { kind: "tool", label: "tool_call", detail: "send_email({ to: 'team@', body: ... })" },
      { kind: "result", label: "tool_result", detail: "→ ok · message_id=msg_8f2a" },
      { kind: "answer", label: "最终回复", detail: "已发送欧区注册摘要给团队（23 条）。" },
    ],
    metrics: [
      { label: "步骤", value: "7" },
      { label: "Tokens", value: "1,247" },
      { label: "耗时", value: "2.3s" },
      { label: "工具调用", value: "2" },
    ],
  },
};

type IconCmp = ComponentType<SVGProps<SVGSVGElement>>;

const KIND_META: Record<
  TraceKind,
  { Icon: IconCmp; iconClass: string; pipClass: string; chip: string }
> = {
  prompt: {
    Icon: Sparkles,
    iconClass: "text-blue-600 dark:text-blue-400",
    pipClass: "bg-blue-500",
    chip: "bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300",
  },
  think: {
    Icon: Brain,
    iconClass: "text-purple-600 dark:text-purple-400",
    pipClass: "bg-purple-500",
    chip: "bg-purple-100 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300",
  },
  tool: {
    Icon: Wrench,
    iconClass: "text-amber-600 dark:text-amber-400",
    pipClass: "bg-amber-500",
    chip: "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300",
  },
  result: {
    Icon: Check,
    iconClass: "text-emerald-600 dark:text-emerald-400",
    pipClass: "bg-emerald-500",
    chip: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300",
  },
  answer: {
    Icon: ArrowRight,
    iconClass: "text-foreground",
    pipClass: "bg-foreground",
    chip: "bg-muted text-foreground",
  },
};

function TraceRow({ event, isLast }: { event: TraceEvent; isLast: boolean }) {
  const meta = KIND_META[event.kind];
  const { Icon } = meta;
  return (
    <li className="relative flex items-start gap-3 pl-1">
      <div className="relative flex flex-col items-center">
        <span
          className={`inline-flex h-7 w-7 items-center justify-center rounded-full border border-border bg-background ${meta.iconClass}`}
        >
          <Icon className="h-3.5 w-3.5" aria-hidden="true" />
        </span>
        {!isLast && <span className="mt-1 h-6 w-px bg-border" aria-hidden="true" />}
      </div>
      <div className="flex min-w-0 flex-1 items-center gap-2 pt-1">
        <span className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium ${meta.chip}`}>
          {event.label}
        </span>
        <span className="truncate font-mono text-xs text-muted-foreground">{event.detail}</span>
      </div>
    </li>
  );
}

export function AgentRuntimeShowcase({ locale }: PackageShowcaseProps) {
  const copy = COPY[locale];

  return (
    <ShowcaseFrame>
      <Card className="border-border/60 shadow-none">
        <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0 p-4 md:p-5">
          <div className="flex min-w-0 items-center gap-2">
            <span className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-[image:var(--brand-gradient)] text-white">
              <Cpu className="h-3.5 w-3.5" aria-hidden="true" />
            </span>
            <span className="text-sm font-semibold text-foreground">{copy.agentRun}</span>
            <Badge variant="outline" size="sm" className="font-mono">
              claude-sonnet-4-6
            </Badge>
          </div>
          <StatusDot state="READY" label titlePrefix="This agent run" />
        </CardHeader>
        <CardContent className="space-y-5 p-4 pt-0 md:p-5 md:pt-0">
          <ol className="space-y-0">
            {copy.events.map((event, i) => (
              <TraceRow
                key={`${event.kind}-${i}`}
                event={event}
                isLast={i === copy.events.length - 1}
              />
            ))}
          </ol>
          <div className="rounded-md border border-border/60 bg-muted/30 p-3">
            <MetricGrid columns={4} className="gap-3">
              <MetricCard size="sm" label={copy.metrics[0]!.label} value={copy.metrics[0]!.value} />
              <MetricCard
                size="sm"
                label={copy.metrics[1]!.label}
                value={copy.metrics[1]!.value}
                icon={<Lightning />}
              />
              <MetricCard size="sm" label={copy.metrics[2]!.label} value={copy.metrics[2]!.value} />
              <MetricCard
                size="sm"
                label={copy.metrics[3]!.label}
                value={copy.metrics[3]!.value}
                icon={<MagnifyingGlass />}
              />
            </MetricGrid>
          </div>
          <Badge variant="success" size="sm" className="font-medium">
            <Check className="h-3 w-3" aria-hidden="true" />
            {copy.complete}
          </Badge>
        </CardContent>
      </Card>
    </ShowcaseFrame>
  );
}
