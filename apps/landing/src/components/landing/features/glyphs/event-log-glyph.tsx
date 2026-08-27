"use client";

import { Clock, Lightning, Sparkles } from "@nebutra/icons";
import { Badge } from "@nebutra/ui/primitives";
import type { SubpackageGlyphProps } from "./types";

const COPY = {
  en: {
    rate: "1,247 events / min",
    footer: "ClickHouse · 90-day retention · replayable",
  },
  zh: {
    rate: "1,247 events / min",
    footer: "ClickHouse · 90 天留存 · 可回放",
  },
} as const;

type Row = {
  time: string;
  event: string;
  tone: "blue-subtle" | "purple-subtle" | "amber-subtle" | "green-subtle";
};

const ROWS: readonly Row[] = [
  { time: "12:42:18", event: "agent.turn.start", tone: "blue-subtle" },
  { time: "12:42:18", event: "model.call", tone: "purple-subtle" },
  { time: "12:42:19", event: "tool.call: search_docs", tone: "amber-subtle" },
  { time: "12:42:19", event: "tool.result", tone: "green-subtle" },
  { time: "12:42:20", event: "agent.turn.end", tone: "blue-subtle" },
] as const;

export function EventLogGlyph({ locale }: SubpackageGlyphProps) {
  const copy = COPY[locale];

  return (
    <div aria-hidden className="flex w-full flex-col justify-center" style={{ height: 160 }}>
      <div className="mx-auto flex w-full max-w-[340px] flex-col gap-1.5 rounded-[var(--radius-lg)] bg-background p-3 ring-1 ring-[hsl(var(--border))] shadow-sm">
        {/* Header */}
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1 font-mono text-[9px] text-muted-foreground">
            <Sparkles className="h-2.5 w-2.5 text-[hsl(var(--primary))]" />
            event.log
          </span>
          <Badge variant="outline" size="sm" className="gap-0.5">
            <Lightning className="h-2.5 w-2.5" />
            <span className="font-mono text-[9px]">{copy.rate}</span>
          </Badge>
        </div>

        {/* Event rows */}
        <div className="flex flex-col gap-0.5">
          {ROWS.map((row) => (
            <div key={`${row.time}-${row.event}`} className="flex items-center gap-2">
              <span className="flex-shrink-0 font-mono text-[9px] text-muted-foreground">
                {row.time}
              </span>
              <span className="text-muted-foreground font-mono text-[9px]">·</span>
              <Badge variant={row.tone} size="sm">
                <span className="font-mono text-[9px]">{row.event}</span>
              </Badge>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="flex items-center gap-1 font-mono text-[9px] text-muted-foreground">
          <Clock className="h-2.5 w-2.5" />
          {copy.footer}
        </div>
      </div>
    </div>
  );
}
