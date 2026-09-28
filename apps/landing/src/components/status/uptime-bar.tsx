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
import { Link } from "@/i18n/navigation";
import {
  componentStatusLabel,
  type DayCellStatus,
  formatUptime,
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
  const incidents = day.incidents.length
    ? `, ${day.incidents.length} incident${day.incidents.length === 1 ? "" : "s"}`
    : "";
  return `${when}: ${status}${day.isToday ? " (live check)" : ""}${incidents}`;
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

  const known = days.filter((d) => d.status !== "no_data").length;
  const summary = `${UPTIME_WINDOW_DAYS}-day uptime history. ${known} day${known === 1 ? "" : "s"} with recorded status.`;

  return (
    <figure className={cn("m-0 w-full", className)}>
      <figcaption id={`${chartId}-summary`} className="sr-only">
        {summary}
      </figcaption>
      <div
        className="relative flex h-6 w-full items-stretch gap-[3px]"
        onMouseLeave={() => setActive(null)}
      >
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
                "relative min-w-0 flex-1 rounded-[2px]",
                // z-10 stays: the global focus outline sits 2px outside the
                // segment, and these segments touch, so the focused one has to
                // rise above its neighbours for the ring to be drawn whole.
                // The ring itself is the global rule's job.
                "focus-visible:z-10",
                "motion-safe:transition-[filter] motion-safe:duration-150",
                isActive && "z-10",
              )}
              onFocus={() => setActive(index)}
              onBlur={() => setActive((current) => (current === index ? null : current))}
              onMouseEnter={() => setActive(index)}
              onKeyDown={(event) => onKeyDown(event, index)}
            >
              <span
                aria-hidden="true"
                className={cn(
                  "block h-full w-full rounded-[2px] motion-safe:transition-opacity",
                  active !== null && !isActive && "opacity-60",
                  stateFillClass[day.status as DayCellStatus],
                  day.isToday && "ring-1 ring-inset ring-foreground/20",
                )}
              />
            </button>
          );
        })}
        {active !== null && days[active] ? (
          <DayCard
            day={days[active] as UptimeDay}
            index={active}
            count={days.length}
            id={`${chartId}-tip`}
          />
        ) : null}
      </div>
    </figure>
  );
}

const INCIDENT_DOT: Record<string, string> = {
  none: "bg-muted-foreground",
  minor: "bg-warning",
  major: "bg-warning",
  critical: "bg-destructive",
};

/** incident.io-style day card: date, the day's uptime, and what happened. */
function DayCard({
  day,
  index,
  count,
  id,
}: {
  day: UptimeDay;
  index: number;
  count: number;
  id: string;
}) {
  const position = ((index + 0.5) / count) * 100;
  const align =
    position < 18
      ? "translate-x-[-12%]"
      : position > 82
        ? "translate-x-[-88%]"
        : "-translate-x-1/2";
  return (
    <div
      id={id}
      role="tooltip"
      className={cn(
        "absolute bottom-full z-20 mb-2 w-64 rounded-xl border border-border bg-background p-3 text-left shadow-ambient-lg",
        align,
      )}
      style={{ left: `${position}%` }}
    >
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-xs font-semibold text-foreground">{formatUtcDay(day.date)}</p>
        {day.uptime != null ? (
          <p className="text-xs tabular-nums text-muted-foreground">{formatUptime(day.uptime)}</p>
        ) : null}
      </div>
      {day.status === "no_data" ? (
        <p className="mt-1.5 text-xs text-muted-foreground">No data recorded for this day.</p>
      ) : day.incidents.length === 0 ? (
        <p className="mt-1.5 flex items-center gap-1.5 text-xs text-muted-foreground">
          <span
            aria-hidden
            className={cn("h-1.5 w-1.5 rounded-full", stateFillClass[day.status as DayCellStatus])}
          />
          {day.status === "operational"
            ? "No incidents"
            : `${componentStatusLabel[day.status as keyof typeof componentStatusLabel]} detected by checks`}
        </p>
      ) : (
        <ul className="mt-1.5 space-y-1">
          {day.incidents.map((incident) => (
            <li key={incident.id}>
              <Link
                href={`/status/incidents/${incident.id}`}
                className="flex items-start gap-1.5 text-xs text-foreground hover:underline"
              >
                <span
                  aria-hidden
                  className={cn(
                    "mt-1 h-1.5 w-1.5 shrink-0 rounded-full",
                    INCIDENT_DOT[incident.impact],
                  )}
                />
                <span className="line-clamp-2">{incident.title}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
