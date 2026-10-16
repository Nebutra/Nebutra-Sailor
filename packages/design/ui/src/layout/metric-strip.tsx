"use client";

import * as React from "react";
import { cn } from "../utils/cn";

/**
 * Metrics as the heroes of a dashboard page (Resend, Vercel, Linear Insights):
 * a row of numbers in one hairline panel divided into cells, each number in
 * display weight with tabular figures, the unit and the delta quieter, and an
 * optional sparkline drawn in ink with a gradient wash under it.
 *
 * - `MetricStrip` — the panel; cells divide with hairlines, stack on a phone.
 * - `Metric` — one cell.
 * - `Sparkline` — standalone; also used by `Metric`.
 */

// ─── Sparkline ───────────────────────────────────────────────────────────────

export interface SparklineProps {
  /** Values in time order. Fewer than two points draws a flat baseline. */
  data: readonly number[];
  className?: string;
  /** Accessible summary; omitted = decorative. */
  label?: string | undefined;
  /** Mark the last point with a dot. Default true. */
  showLastPoint?: boolean;
}

const W = 120;
const H = 32;

function sparkPath(data: readonly number[]) {
  const values = data.length >= 2 ? data : [0, 0];
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const step = W / (values.length - 1);
  const points = values.map((v, i) => [i * step, H - 2 - ((v - min) / span) * (H - 6)] as const);
  const line = points
    .map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(2)} ${y.toFixed(2)}`)
    .join(" ");
  const area = `${line} L${W} ${H} L0 ${H} Z`;
  const last = points[points.length - 1] ?? ([W, H] as const);
  return { line, area, last };
}

export function Sparkline({ data, className, label, showLastPoint = true }: SparklineProps) {
  const gradientId = React.useId();
  const { line, area, last } = sparkPath(data);
  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="none"
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      className={cn("h-8 w-full overflow-visible text-foreground", className)}
    >
      <defs>
        <linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="currentColor" stopOpacity="0.14" />
          <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${gradientId})`} />
      <path
        d={line}
        fill="none"
        stroke="currentColor"
        strokeOpacity="0.7"
        strokeWidth="1.5"
        strokeLinejoin="round"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      />
      {showLastPoint && data.length >= 2 ? (
        <circle cx={last[0]} cy={last[1]} r="2.25" fill="currentColor" />
      ) : null}
    </svg>
  );
}

// ─── Strip + cell ────────────────────────────────────────────────────────────

export interface MetricStripProps {
  children: React.ReactNode;
  /** Columns from `sm` up. Defaults to the number of children (max 4). */
  columns?: 2 | 3 | 4;
  className?: string;
}

const COLUMNS: Record<2 | 3 | 4, string> = {
  2: "sm:grid-cols-2",
  3: "sm:grid-cols-3",
  4: "sm:grid-cols-2 lg:grid-cols-4",
};

export function MetricStrip({ children, columns, className }: MetricStripProps) {
  const count = React.Children.toArray(children).filter(Boolean).length;
  const cols = columns ?? (Math.min(Math.max(count, 2), 4) as 2 | 3 | 4);
  return (
    <div
      data-slot="metric-strip"
      // The hairlines are the 1px gaps of a grid laid on the border colour, so
      // they stay right at every column count and wrap without per-cell rules.
      className={cn(
        "grid gap-px overflow-hidden rounded-xl border border-border bg-border shadow-xs",
        "[&>*]:bg-card",
        COLUMNS[cols],
        className,
      )}
    >
      {children}
    </div>
  );
}

export type MetricDeltaTone = "positive" | "negative" | "neutral";

export interface MetricProps {
  label: string;
  /** The number, pre-formatted ("12,480", "—"). */
  value: React.ReactNode;
  /** Quiet unit after the value ("credits", "ms"). */
  unit?: string;
  /** A change badge ("+12%") and its reading. */
  delta?: { value: string; tone?: MetricDeltaTone };
  /** Secondary line under the value. */
  footnote?: React.ReactNode;
  /** Trend values for a sparkline under the number. */
  trend?: readonly number[];
  /** Accessible summary of the trend. */
  trendLabel?: string;
  /** Right side of the label row (a status dot, a link). */
  aside?: React.ReactNode;
  /** Extra content under the value (a meter, a warning). */
  children?: React.ReactNode;
  className?: string;
}

const DELTA_TONE: Record<MetricDeltaTone, string> = {
  positive: "text-success-strong bg-success/10",
  negative: "text-destructive-strong bg-destructive/10",
  neutral: "text-neutral-11 bg-neutral-3",
};

export function Metric({
  label,
  value,
  unit,
  delta,
  footnote,
  trend,
  trendLabel,
  aside,
  children,
  className,
}: MetricProps) {
  return (
    <div data-slot="metric" className={cn("flex min-w-0 flex-col p-5 sm:p-6", className)}>
      <div className="flex items-center justify-between gap-3">
        <h3 className="truncate text-sm text-neutral-11">{label}</h3>
        {aside}
      </div>
      <div className="mt-3 flex flex-wrap items-baseline gap-x-2 gap-y-1">
        <span className="text-3xl font-semibold tracking-tight tabular-nums text-neutral-12">
          {value}
        </span>
        {unit ? <span className="text-sm text-muted-foreground">{unit}</span> : null}
        {delta ? (
          <span
            className={cn(
              "rounded-full px-1.5 py-0.5 text-xs font-medium tabular-nums",
              DELTA_TONE[delta.tone ?? "neutral"],
            )}
          >
            {delta.value}
          </span>
        ) : null}
      </div>
      {footnote ? <p className="mt-1.5 text-xs text-muted-foreground">{footnote}</p> : null}
      {trend ? (
        <Sparkline data={trend} label={trendLabel} className="mt-4 text-neutral-12" />
      ) : null}
      {children}
    </div>
  );
}
