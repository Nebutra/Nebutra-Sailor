"use client";

import { ChartActivity, Clock, Lightning } from "@nebutra/icons";
import { Badge } from "@nebutra/ui/primitives";
import type { SubpackageGlyphProps } from "./types";

const COPY = {
  en: {
    header: "trace · 4 spans · 248ms total",
    footer: "OTLP · sampled 10%",
  },
  zh: {
    header: "trace · 4 spans · 248ms",
    footer: "OTLP · 采样 10%",
  },
} as const;

type Span = {
  label: string;
  indent: number;
  widthPct: number;
  ms: string;
  color: string;
  offsetPct: number;
};

const SPANS: readonly Span[] = [
  {
    label: "GET /api/orders",
    indent: 0,
    widthPct: 100,
    ms: "248ms",
    color: "hsl(var(--primary))",
    offsetPct: 0,
  },
  {
    label: "→ db.query",
    indent: 1,
    widthPct: 50,
    ms: "124ms",
    color: "hsl(var(--muted-foreground))",
    offsetPct: 4,
  },
  {
    label: "→ ai.generate",
    indent: 1,
    widthPct: 25,
    ms: "62ms",
    color: "var(--amber-9)",
    offsetPct: 56,
  },
  {
    label: "→ webhook.dispatch",
    indent: 1,
    widthPct: 15,
    ms: "37ms",
    color: "var(--green-9)",
    offsetPct: 82,
  },
] as const;

export function TraceStoreGlyph({ locale }: SubpackageGlyphProps) {
  const copy = COPY[locale];

  return (
    <div aria-hidden className="flex w-full flex-col justify-center" style={{ height: 160 }}>
      <div className="mx-auto flex w-full max-w-[340px] flex-col gap-2 rounded-[var(--radius-lg)] bg-background p-3 ring-1 ring-[hsl(var(--border))] shadow-sm">
        {/* Header */}
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1 font-mono text-[9px] text-muted-foreground">
            <ChartActivity className="h-2.5 w-2.5" />
            {copy.header}
          </span>
          <Badge variant="gray-subtle" size="sm" className="gap-0.5">
            <Clock className="h-2.5 w-2.5" />
            <span className="text-[9px]">248ms</span>
          </Badge>
        </div>

        {/* Waterfall */}
        <div className="flex flex-col gap-1.5">
          {SPANS.map((span) => (
            <div key={span.label} className="flex items-center gap-2">
              <span
                className="flex-shrink-0 truncate font-mono text-[9px] text-muted-foreground"
                style={{ width: 90, paddingLeft: span.indent * 6 }}
              >
                {span.label}
              </span>
              <div className="relative h-2 flex-1 rounded-[var(--radius-sm)] bg-muted">
                <div
                  className="absolute top-0 h-full rounded-[var(--radius-sm)]"
                  style={{
                    width: `${span.widthPct}%`,
                    left: `${span.offsetPct}%`,
                    background: span.color,
                    opacity: 0.85,
                  }}
                />
              </div>
              <span
                className="flex-shrink-0 font-mono text-[9px] text-muted-foreground"
                style={{ width: 32, textAlign: "right" }}
              >
                {span.ms}
              </span>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1 font-mono text-[9px] text-muted-foreground">
            <Lightning className="h-2.5 w-2.5" />
            {copy.footer}
          </span>
          <span className="h-1.5 w-1.5 rounded-full bg-[var(--green-9)]" />
        </div>
      </div>
    </div>
  );
}
