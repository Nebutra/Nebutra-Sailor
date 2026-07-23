"use client";

import { Check, Sparkles, Users } from "@nebutra/icons";
import { Badge, MetricCard } from "@nebutra/ui/primitives";
import type { SubpackageGlyphProps } from "./types";

const COPY = {
  en: {
    deflected: "Deflected",
    avgSolve: "Avg solve",
    savedHrs: "Saved hrs",
    footer: "AI-first · human escalation 16%",
  },
  zh: {
    deflected: "已转移",
    avgSolve: "平均解决",
    savedHrs: "节省小时",
    footer: "AI 优先 · 人工升级 16%",
  },
} as const;

const TICKETS: ReadonlyArray<{ question: string; resolution: string }> = [
  { question: '"How do I reset MFA?"', resolution: "auto-resolved · linked to article" },
  { question: '"Refund order #1234"', resolution: "auto-resolved · refund issued" },
];

export function SupportDeflectorGlyph({ locale }: SubpackageGlyphProps) {
  const copy = COPY[locale];

  return (
    <div aria-hidden className="flex w-full flex-col justify-center" style={{ height: 160 }}>
      <div className="mx-auto flex w-full max-w-[340px] flex-col gap-2 rounded-[var(--radius-lg)] bg-background p-3 ring-1 ring-[hsl(var(--border))] shadow-sm">
        {/* KPI tiles row */}
        <div className="grid grid-cols-3 gap-2">
          <MetricCard size="sm" label={copy.deflected} value="84%" icon={<Check />} />
          <MetricCard size="sm" label={copy.avgSolve} value="12s" icon={<Sparkles />} />
          <MetricCard size="sm" label={copy.savedHrs} value="247" icon={<Users />} />
        </div>

        {/* Sample resolved tickets */}
        <ul className="flex flex-col gap-1">
          {TICKETS.map((ticket) => (
            <li
              key={ticket.question}
              className="flex items-center gap-1.5 rounded-[var(--radius-sm)] bg-muted px-1.5 py-1"
            >
              <Check className="h-2.5 w-2.5 shrink-0 text-[var(--green-9)]" />
              <code className="truncate font-mono text-[9px] text-foreground">
                {ticket.question}
              </code>
              <Badge
                variant="green-subtle"
                size="sm"
                className="ml-auto shrink-0 font-mono text-[8px]"
              >
                {ticket.resolution}
              </Badge>
            </li>
          ))}
        </ul>

        {/* Footer */}
        <div className="flex items-center gap-1">
          <Sparkles className="h-2.5 w-2.5 text-[hsl(var(--primary))]" />
          <span className="font-mono text-[9px] text-muted-foreground">{copy.footer}</span>
        </div>
      </div>
    </div>
  );
}
