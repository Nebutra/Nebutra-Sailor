import { useId } from "react";
import { cn } from "../utils/cn";

/**
 * Ghost previews — the shape of the content a surface will hold, drawn in
 * hairlines and faint fills, for empty states that show what is coming rather
 * than a generic icon (Vercel Observability, Linear, PlanetScale Insights).
 * Decorative only: always rendered aria-hidden by EmptyState.
 */
export type GhostPreviewKind = "chart" | "table" | "list" | "metrics";

const AREA =
  "M0 70 C 40 66, 60 52, 100 56 S 170 40, 210 44 S 280 22, 320 30 S 390 14, 440 18 L 440 100 L 0 100 Z";
const LINE = "M0 70 C 40 66, 60 52, 100 56 S 170 40, 210 44 S 280 22, 320 30 S 390 14, 440 18";

function GhostChart() {
  const gradientId = useId();
  return (
    <div className="flex h-full w-full flex-col justify-end gap-3 p-5">
      <div className="flex items-baseline gap-3">
        <span className="h-2 w-16 rounded-full bg-foreground/[0.10]" />
        <span className="h-2 w-10 rounded-full bg-foreground/[0.08]" />
      </div>
      <div className="relative">
        <svg
          aria-hidden="true"
          viewBox="0 0 440 100"
          preserveAspectRatio="none"
          className="h-44 w-full"
        >
          <defs>
            <linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="currentColor" stopOpacity="0.09" />
              <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
            </linearGradient>
          </defs>
          {[25, 50, 75].map((y) => (
            <line
              key={y}
              x1="0"
              x2="440"
              y1={y}
              y2={y}
              className="stroke-foreground/[0.09]"
              strokeDasharray="2 4"
              vectorEffect="non-scaling-stroke"
            />
          ))}
          <path d={AREA} fill={`url(#${gradientId})`} />
          <path
            d={LINE}
            className="fill-none stroke-foreground/[0.28]"
            strokeWidth="1.5"
            vectorEffect="non-scaling-stroke"
          />
          {/* Crosshair at the hovered point — the chart's interaction, at rest. */}
          <line
            x1="320"
            x2="320"
            y1="0"
            y2="100"
            className="stroke-foreground/[0.16]"
            strokeDasharray="3 3"
            vectorEffect="non-scaling-stroke"
          />
        </svg>
        <span className="absolute top-[30%] left-[72.7%] size-2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-card bg-foreground/30" />
        {/* The tooltip card the crosshair would open. */}
        <span className="absolute top-1 start-[74.5%] hidden w-28 flex-col gap-1.5 rounded-[var(--radius-lg)] border border-border bg-card/80 p-2.5 shadow-xs sm:flex">
          <span className="h-1.5 w-12 rounded-full bg-foreground/[0.12]" />
          <span className="h-2 w-16 rounded-full bg-foreground/[0.09]" />
        </span>
      </div>
      <div className="flex justify-between">
        {["", "", "", "", ""].map((_, i) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: static decorative ticks
          <span key={i} className="h-1.5 w-8 rounded-full bg-foreground/[0.08]" />
        ))}
      </div>
    </div>
  );
}

/** Rows fade as they descend, so the ghost reads as a list running off. */
const ROW_TONES = [
  "bg-foreground/[0.10]",
  "bg-foreground/[0.085]",
  "bg-foreground/[0.07]",
  "bg-foreground/[0.055]",
  "bg-foreground/[0.04]",
] as const;

function GhostRows({ columns }: { columns: number }) {
  const widths = ["w-2/5", "w-1/4", "w-1/5", "w-1/6"];
  return (
    <div className="w-full">
      <div className="flex gap-6 border-b border-border px-5 py-3">
        {Array.from({ length: columns }, (_, c) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: static decorative columns
          <span key={c} className={cn("h-2 rounded-full bg-foreground/[0.10]", widths[c])} />
        ))}
      </div>
      {ROW_TONES.map((tone, r) => (
        <div
          // biome-ignore lint/suspicious/noArrayIndexKey: static decorative rows
          key={r}
          className="flex items-center gap-6 border-b border-border px-5 py-3.5 last:border-0"
        >
          {Array.from({ length: columns }, (_, c) => (
            <span
              // biome-ignore lint/suspicious/noArrayIndexKey: static decorative cells
              key={c}
              className={cn("h-2 rounded-full", tone, widths[c])}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

function GhostMetrics() {
  return (
    <div className="grid w-full grid-cols-3 divide-x divide-foreground/[0.09]">
      {[0, 1, 2].map((i) => (
        <div key={i} className="flex flex-col gap-3 p-5">
          <span className="h-2 w-20 rounded-full bg-foreground/[0.10]" />
          <span className="h-5 w-24 rounded-md bg-foreground/[0.09]" />
          <span className="h-1.5 w-full rounded-full bg-foreground/[0.06]" />
        </div>
      ))}
    </div>
  );
}

export function GhostPreview({ kind, className }: { kind: GhostPreviewKind; className?: string }) {
  return (
    <div aria-hidden="true" className={cn("pointer-events-none text-foreground", className)}>
      {kind === "chart" ? <GhostChart /> : null}
      {kind === "table" ? <GhostRows columns={4} /> : null}
      {kind === "list" ? <GhostRows columns={2} /> : null}
      {kind === "metrics" ? <GhostMetrics /> : null}
    </div>
  );
}
