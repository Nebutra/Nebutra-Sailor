"use client";

import { Database, Lightning } from "@nebutra/icons";
import { Badge, Gauge } from "@nebutra/ui/primitives";

import type { SubpackageGlyphProps } from "./types";

type CacheEvent = {
  key: string;
  outcome: "HIT" | "MISS";
  latency: string;
};

const RECENT_EVENTS: readonly CacheEvent[] = [
  { key: "user:abc123", outcome: "HIT", latency: "1.2ms" },
  { key: "org:xyz890", outcome: "MISS", latency: "18ms" },
  { key: "session:f02", outcome: "HIT", latency: "0.8ms" },
] as const;

const HIT_RATE_VALUE = 94.7;

const COPY = {
  en: { headerLabel: "hit rate", footerLabel: "Redis · Upstash · memory" },
  zh: { headerLabel: "命中率", footerLabel: "Redis · Upstash · 内存" },
} as const;

/**
 * CacheGlyph — bespoke thumbnail for the `cache` sub-package.
 *
 * Renders a half-circle hit-rate gauge on the left and a tiny mono event log
 * on the right so the card communicates "KV cache, HIT/MISS, latency" at a
 * glance — replacing the generic icon + slug identity row.
 */
export function CacheGlyph({ locale }: SubpackageGlyphProps) {
  const copy = COPY[locale];

  return (
    <div
      className="flex w-full flex-col gap-2 rounded-[var(--radius-md)] bg-muted p-3"
      style={{ height: 160 }}
    >
      <header className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
        <Lightning className="h-3 w-3 text-[hsl(var(--primary))]" />
        <span className="tabular-nums text-foreground">{HIT_RATE_VALUE.toFixed(1)}%</span>
        <span>{copy.headerLabel}</span>
      </header>

      <div className="flex flex-1 items-center gap-3">
        <div className="relative shrink-0">
          <Gauge
            value={HIT_RATE_VALUE}
            size={88}
            arcPriority="equal"
            colors={{ primary: "hsl(var(--primary))", secondary: "hsl(var(--muted))" }}
            aria-label={`${HIT_RATE_VALUE} percent ${copy.headerLabel}`}
          >
            <span className="flex flex-col items-center justify-center leading-tight">
              <span className="text-sm font-semibold tabular-nums text-foreground">
                {Math.round(HIT_RATE_VALUE)}%
              </span>
              <span className="text-[9px] uppercase tracking-wide text-muted-foreground">
                {copy.headerLabel}
              </span>
            </span>
          </Gauge>
        </div>

        <ul className="flex min-w-0 flex-1 flex-col gap-1 font-mono text-[10px] leading-tight">
          {RECENT_EVENTS.map((event) => {
            const isMiss = event.outcome === "MISS";
            return (
              <li
                key={event.key}
                className={
                  isMiss
                    ? "flex items-center gap-1.5 text-muted-foreground"
                    : "flex items-center gap-1.5 text-foreground"
                }
              >
                <span className="min-w-0 flex-1 truncate">{event.key}</span>
                <Badge
                  variant={isMiss ? "gray-subtle" : "green-subtle"}
                  size="sm"
                  className="px-1.5 py-0 text-[9px] font-medium"
                >
                  {event.outcome}
                </Badge>
                <span className="w-10 shrink-0 text-right tabular-nums text-muted-foreground">
                  {event.latency}
                </span>
              </li>
            );
          })}
        </ul>
      </div>

      <footer className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
        <Database className="h-3 w-3" />
        <span className="truncate">{copy.footerLabel}</span>
      </footer>
    </div>
  );
}
