"use client";

import { forwardRef, type ReactNode, useEffect, useState } from "react";
import { cn } from "../utils/cn";
import { ContextCard, type ContextCardSide } from "./context-card";

/* -------------------------------------------------------------------------- *\
 *  RelativeTimeCard — short relative-time label + hover popover with absolute
 *  UTC + local time.
 *
 *  Surface usage:
 *    Table cells, entity rows, deploy lists, activity feeds. For static dates
 *    older than ~7 days in body prose, render the absolute date directly.
 *
 *  Trigger label:
 *    By default the component renders a `<time dateTime>` short-form label
 *    that matches Geist conventions:
 *        `just now`  `2m`  `5h`  `Yesterday`  `3d`  `Mar 14`  `Mar 14, 2024`
 *    Pass `children` only as an override for non-time states ("Just now",
 *    "Pending", "Queued"). Do not append "ago" to the component — the
 *    formatter is the canonical form.
 *
 *  SSR / hydration:
 *    The first paint is deterministic (absolute UTC date string) so SSR
 *    output matches the client's initial render. After mount, a single
 *    `useEffect` upgrades the label to the relative form and starts an
 *    adaptive interval (1s under a minute, 30s under an hour, 60s under a
 *    day, none beyond). The local-timezone row in the popover is wrapped
 *    in `suppressHydrationWarning` since it depends on the user's locale.
 *
 *  Known debt (do not fix without an ADR):
 *    - Future timestamps clamp to "just now" rather than rendering "in 5m".
 *      Bidirectional rendering would need `Intl.RelativeTimeFormat`; the
 *      current callers only ever pass past timestamps (deploy / activity).
\* -------------------------------------------------------------------------- */

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export type RelativeTimeCardProps = {
  /** Accepts Unix ms, Date, or any ISO/RFC string parseable by the Date constructor. */
  date: number | Date | string;
  /** Side the popover appears on. @default "top" */
  side?: ContextCardSide;
  /** Override the trigger label. Use only for non-time states (e.g. "Pending"). */
  children?: ReactNode;
  className?: string;
};

// ---------------------------------------------------------------------------
// Pure helpers
// ---------------------------------------------------------------------------

const MINUTE_MS = 60 * 1000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;
const WEEK_MS = 7 * DAY_MS;
const YEAR_MS = 365 * DAY_MS;

const SHORT_DATE = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" });
const SHORT_DATE_WITH_YEAR = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
});

function normalizeDate(input: number | Date | string): Date {
  if (input instanceof Date) return input;
  return new Date(input);
}

/** Geist short relative-time formatter. Always past or present, never future. */
export function formatShortRelative(target: Date, now: Date): string {
  const diff = now.getTime() - target.getTime();
  if (diff < MINUTE_MS) return "just now";
  if (diff < HOUR_MS) return `${Math.floor(diff / MINUTE_MS)}m`;
  if (diff < DAY_MS) return `${Math.floor(diff / HOUR_MS)}h`;

  // Calendar-day diff: was it yesterday in the viewer's local timezone?
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);
  const startOfTarget = new Date(target);
  startOfTarget.setHours(0, 0, 0, 0);
  const dayDiff = Math.round((startOfToday.getTime() - startOfTarget.getTime()) / DAY_MS);

  if (dayDiff === 1) return "Yesterday";
  if (diff < WEEK_MS) return `${Math.floor(diff / DAY_MS)}d`;
  if (diff < YEAR_MS) return SHORT_DATE.format(target);
  return SHORT_DATE_WITH_YEAR.format(target);
}

/** Adaptive tick cadence — return null when the label is static (≥1d). */
function nextTickMs(diffMs: number): number | null {
  if (diffMs < MINUTE_MS) return 1000;
  if (diffMs < HOUR_MS) return 30 * 1000;
  if (diffMs < DAY_MS) return 60 * 1000;
  return null;
}

// ---------------------------------------------------------------------------
// Popover content
// ---------------------------------------------------------------------------

const POPOVER_DATE = new Intl.DateTimeFormat("en-US", {
  month: "long",
  day: "numeric",
  year: "numeric",
});
const POPOVER_TIME = new Intl.DateTimeFormat("en-US", {
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hour12: true,
});

function formatTimezoneOffset(date: Date): string {
  const offsetMinutes = -date.getTimezoneOffset();
  const sign = offsetMinutes >= 0 ? "+" : "-";
  const hours = Math.floor(Math.abs(offsetMinutes) / 60);
  const minutes = Math.abs(offsetMinutes) % 60;
  return minutes === 0
    ? `GMT${sign}${hours}`
    : `GMT${sign}${hours}:${String(minutes).padStart(2, "0")}`;
}

function CardContent({ target, mounted }: { target: Date; mounted: boolean }) {
  const utcParts = new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(target);
  const utcTime = new Intl.DateTimeFormat("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
    timeZone: "UTC",
  }).format(target);

  // Local-time rows depend on the viewer's timezone — render only after mount
  // to avoid hydration mismatches.
  const localDate = mounted ? POPOVER_DATE.format(target) : null;
  const localTime = mounted ? POPOVER_TIME.format(target) : null;
  const tzLabel = mounted ? formatTimezoneOffset(target) : null;

  return (
    <div className="w-80 font-sans text-xs">
      <div className="text-start">
        {mounted ? formatShortRelative(target, new Date()) : utcParts}
      </div>
      <div className="mt-3 flex items-center justify-between">
        <div className="flex gap-2">
          <span className="rounded bg-muted-foreground/50 px-2">UTC</span>
          <span>{utcParts}</span>
        </div>
        <span className="font-mono">{utcTime}</span>
      </div>
      {mounted && (
        <div className="mt-2 flex items-center justify-between" suppressHydrationWarning>
          <div className="flex gap-2">
            <span className="rounded bg-muted-foreground/50 px-2">{tzLabel}</span>
            <span>{localDate}</span>
          </div>
          <span className="font-mono">{localTime}</span>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Hook — adaptive relative-time ticker
// ---------------------------------------------------------------------------

function useRelativeLabel(target: Date): { label: string; mounted: boolean } {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    let cancelled = false;
    let timeout: ReturnType<typeof setTimeout> | null = null;

    function tick() {
      if (cancelled) return;
      const current = new Date();
      setNow(current);
      const ms = nextTickMs(current.getTime() - target.getTime());
      if (ms !== null) {
        timeout = setTimeout(tick, ms);
      }
    }
    tick();
    return () => {
      cancelled = true;
      if (timeout !== null) clearTimeout(timeout);
    };
  }, [target]);

  if (now === null) {
    // SSR / first paint — deterministic absolute fallback (matches popover UTC).
    return { label: SHORT_DATE.format(target), mounted: false };
  }
  return { label: formatShortRelative(target, now), mounted: true };
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const RelativeTimeCard = forwardRef<HTMLTimeElement, RelativeTimeCardProps>(
  function RelativeTimeCard({ date, side = "top", children, className }, ref) {
    const target = normalizeDate(date);
    const { label, mounted } = useRelativeLabel(target);
    const iso = target.toISOString();

    const trigger =
      children !== undefined ? (
        children
      ) : (
        <time
          ref={ref}
          dateTime={iso}
          className={cn(
            "cursor-default tabular-nums underline decoration-dotted decoration-muted-foreground/60 underline-offset-2",
            className,
          )}
        >
          {label}
        </time>
      );

    return (
      <ContextCard.Trigger side={side} content={<CardContent target={target} mounted={mounted} />}>
        {trigger}
      </ContextCard.Trigger>
    );
  },
);
