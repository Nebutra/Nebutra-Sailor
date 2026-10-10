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
import {
  Badge,
  Card,
  CardContent,
  CardHeader,
  MetricCard,
  MetricGrid,
  StatusDot,
} from "@nebutra/ui/primitives";
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
  /** Translatable label/detail per trace step, keyed by step index. */
  events: Record<string, Partial<Pick<TraceEvent, "label" | "detail">>>;
  metrics: { steps: string; tokens: string; latency: string; toolCalls: string };
};

// Tool names, call signatures and ids are code — same on every locale.
const EVENTS: ReadonlyArray<Pick<TraceEvent, "kind"> & Partial<TraceEvent>> = [
  { kind: "prompt" },
  { kind: "think" },
  { kind: "tool", label: "tool_call", detail: "search_users({ region: 'eu', since: '7d' })" },
  { kind: "result", label: "tool_result" },
  { kind: "tool", label: "tool_call", detail: "send_email({ to: 'team@', body: ... })" },
  { kind: "result", label: "tool_result", detail: "→ ok · message_id=msg_8f2a" },
  { kind: "answer" },
];

const METRIC_VALUES = { steps: "7", tokens: "1,247", latency: "2.3s", toolCalls: "2" } as const;

type IconCmp = ComponentType<SVGProps<SVGSVGElement>>;

const KIND_META: Record<
  TraceKind,
  { Icon: IconCmp; iconClass: string; pipClass: string; chip: string }
> = {
  prompt: {
    Icon: Sparkles,
    iconClass: "text-info",
    pipClass: "bg-info",
    chip: "bg-info/10 text-info",
  },
  think: {
    Icon: Brain,
    iconClass: "text-chart-3",
    pipClass: "bg-chart-3",
    chip: "bg-chart-3/10 text-chart-3",
  },
  tool: {
    Icon: Wrench,
    iconClass: "text-warning-strong",
    pipClass: "bg-warning",
    chip: "bg-warning/10 text-warning-strong",
  },
  result: {
    Icon: Check,
    iconClass: "text-success-strong",
    pipClass: "bg-success",
    chip: "bg-success/10 text-success-strong",
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

export function AgentRuntimeShowcase({ copy: rawCopy }: PackageShowcaseProps) {
  const copy = rawCopy as Copy;
  const events: TraceEvent[] = EVENTS.map((event, i) => ({
    label: "",
    detail: "",
    ...event,
    ...copy.events[i],
  }));

  return (
    <ShowcaseFrame>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0 p-4 md:p-5">
          <div className="flex min-w-0 items-center gap-2">
            <span className="inline-flex h-6 w-6 items-center justify-center rounded-[var(--radius-md)] bg-primary text-primary-foreground">
              <Cpu className="h-3.5 w-3.5" aria-hidden="true" />
            </span>
            <span className="text-sm font-semibold text-foreground">{copy.agentRun}</span>
            <Badge variant="outline" size="sm" className="font-mono">
              claude-sonnet-5
            </Badge>
          </div>
          <StatusDot state="READY" label titlePrefix="This agent run" />
        </CardHeader>
        <CardContent className="space-y-5 p-4 pt-0 md:p-5 md:pt-0">
          <ol className="space-y-0">
            {events.map((event, i) => (
              <TraceRow key={`${event.kind}-${i}`} event={event} isLast={i === events.length - 1} />
            ))}
          </ol>
          <div className="rounded-[var(--radius-md)] border border-border/60 bg-muted/30 p-3">
            <MetricGrid columns={4} className="gap-3">
              <MetricCard size="sm" label={copy.metrics.steps} value={METRIC_VALUES.steps} />
              <MetricCard
                size="sm"
                label={copy.metrics.tokens}
                value={METRIC_VALUES.tokens}
                icon={<Lightning />}
              />
              <MetricCard size="sm" label={copy.metrics.latency} value={METRIC_VALUES.latency} />
              <MetricCard
                size="sm"
                label={copy.metrics.toolCalls}
                value={METRIC_VALUES.toolCalls}
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
