"use client";

/**
 * 90-day uptime strip — Statuspage / incident.io signature component.
 *
 * Interaction details (GitHub Status + accessible chart patterns):
 * - Color is never the only signal: each cell has an accessible name
 * - Keyboard: arrow keys move focus; Home/End jump ends
 * - Hover + focus-visible share the same status text (not hover-only)
 * - prefers-reduced-motion: transitions gated with motion-safe:
 * - `no_data` days are muted and labeled honestly (we don't invent history)
 */

import { cn } from "@nebutra/ui/utils";
import { type KeyboardEvent, useCallback, useId, useRef, useState } from "react";
import {
  componentStatusLabel,
  type DayCellStatus,
  formatUtcDay,
  stateFillClass,
  UPTIME_WINDOW_DAYS,
  type UptimeDay,
} from "./status-vocabulary";

function dayLabel(day: UptimeDay): string {
  const when = formatUtcDay(day.date);
  if (day.status === "no_data") {
    return `${when}: No historical data yet`;
  }
  const status =
    day.status === "unknown"
      ? "Unknown"
      : componentStatusLabel[day.status as keyof typeof componentStatusLabel];
  return `${when}: ${status}${day.isToday ? " (live check)" : ""}`;
}

export function UptimeBar({ days, className }: { days: UptimeDay[]; className?: string }) {
  const chartId = useId();
  const [active, setActive] = useState<number | null>(null);
  const cellRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const focusIndex = useCallback(
    (index: number) => {
      const clamped = Math.max(0, Math.min(days.length - 1, index));
      cellRefs.current[clamped]?.focus();
      setActive(clamped);
    },
    [days.length],
  );

  const onKeyDown = useCallback(
    (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
      switch (event.key) {
        case "ArrowRight":
        case "ArrowDown":
          event.preventDefault();
          focusIndex(index + 1);
          break;
        case "ArrowLeft":
        case "ArrowUp":
          event.preventDefault();
          focusIndex(index - 1);
          break;
        case "Home":
          event.preventDefault();
          focusIndex(0);
          break;
        case "End":
          event.preventDefault();
          focusIndex(days.length - 1);
          break;
        case "Escape":
          setActive(null);
          (event.target as HTMLButtonElement).blur();
          break;
        default:
          break;
      }
    },
    [days.length, focusIndex],
  );

  const first = days[0]?.date;
  const last = days[days.length - 1]?.date;
  const known = days.filter((d) => d.status !== "no_data").length;
  const summary = `${UPTIME_WINDOW_DAYS}-day uptime history. ${known} day${known === 1 ? "" : "s"} with recorded status.`;

  return (
    <figure className={cn("m-0 w-full", className)}>
      <figcaption id={`${chartId}-summary`} className="sr-only">
        {summary}
      </figcaption>
      <div className="relative flex h-8 w-full items-stretch gap-px">
        {days.map((day, index) => {
          const isActive = active === index;
          return (
            <button
              key={day.date}
              type="button"
              ref={(el) => {
                cellRefs.current[index] = el;
              }}
              tabIndex={index === 0 ? 0 : -1}
              aria-label={dayLabel(day)}
              aria-describedby={isActive ? `${chartId}-tip` : undefined}
              title={dayLabel(day)}
              className={cn(
                "relative min-w-0 flex-1 rounded-[1px] outline-none",
                "focus-visible:z-10 focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring))] focus-visible:ring-offset-1 focus-visible:ring-offset-background",
                "motion-safe:transition-[filter] motion-safe:duration-150",
                isActive && "z-10",
              )}
              onFocus={() => setActive(index)}
              onBlur={() => setActive((current) => (current === index ? null : current))}
              onMouseEnter={() => setActive(index)}
              onMouseLeave={() => setActive((current) => (current === index ? null : current))}
              onKeyDown={(event) => onKeyDown(event, index)}
            >
              <span
                aria-hidden="true"
                className={cn(
                  "block h-full w-full rounded-[1px]",
                  stateFillClass[day.status as DayCellStatus],
                  day.isToday && "ring-1 ring-inset ring-foreground/20",
                )}
              />
            </button>
          );
        })}
      </div>

      <div className="mt-1.5 flex items-center justify-between gap-3 text-[11px] tabular-nums text-muted-foreground">
        <span>{first ? formatUtcDay(first) : null}</span>
        <span
          className="min-w-0 flex-1 truncate text-center"
          id={`${chartId}-tip`}
          aria-live="polite"
        >
          {active !== null && days[active]
            ? dayLabel(days[active] as UptimeDay)
            : `${UPTIME_WINDOW_DAYS} days`}
        </span>
        <span>{last ? formatUtcDay(last) : null}</span>
      </div>
    </figure>
  );
}
