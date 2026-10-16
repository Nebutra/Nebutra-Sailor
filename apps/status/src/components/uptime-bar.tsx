"use client";

/**
 * The 90-day strip. One cell per UTC day; a day with no readings is muted and
 * named as such — history is never invented.
 *
 * - Every cell is a button with its own accessible name (date, state, uptime).
 * - Roving focus: Tab enters on today, arrows move, Home/End jump, Escape closes.
 * - Hover, focus and tap all open the same day card; its links stay reachable
 *   by Tab because focus moving into the card keeps it open.
 * - Below 640px the strip shows the last 30 days so each cell stays tappable.
 * - Geometry follows incident.io: 16px cells, 2px gaps, no per-row axis captions
 *   (the range is stated once, in the card header).
 */
import { cn } from "@nebutra/ui/utils";
import { useTranslations } from "next-intl";
import {
  type CSSProperties,
  type KeyboardEvent,
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";
import { formatDayKey, formatLatency, formatUptime } from "@/lib/format";
import type { AppLocale } from "@/lib/locale";
import type { BarDay } from "@/lib/view";
import { impactFill, stateFill } from "./state-style";

const MOBILE_DAYS = 30;

export function UptimeBar({
  days,
  locale,
  incidentHref,
  label,
}: {
  days: BarDay[];
  locale: AppLocale;
  /** Prefix for incident links, e.g. `/p/acme/incidents/`. */
  incidentHref: string;
  /** Whose history this is, for screen readers. */
  label: string;
}) {
  const t = useTranslations("bar");
  const ts = useTranslations("state");
  const id = useId();
  const [active, setActive] = useState<number | null>(null);
  const cells = useRef<Array<HTMLButtonElement | null>>([]);
  const wrapper = useRef<HTMLDivElement | null>(null);
  const mobileStart = Math.max(0, days.length - MOBILE_DAYS);

  const focusCell = useCallback(
    (index: number) => {
      const wide = typeof window !== "undefined" && window.matchMedia("(min-width: 640px)").matches;
      const min = wide ? 0 : mobileStart;
      const next = Math.max(min, Math.min(days.length - 1, index));
      cells.current[next]?.focus();
      setActive(next);
    },
    [days.length, mobileStart],
  );

  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const moves: Record<string, number> = {
      ArrowRight: index + 1,
      ArrowDown: index + 1,
      ArrowLeft: index - 1,
      ArrowUp: index - 1,
      Home: 0,
      End: days.length - 1,
    };
    if (event.key in moves) {
      event.preventDefault();
      focusCell(moves[event.key] as number);
    } else if (event.key === "Escape") {
      setActive(null);
    }
  };

  // Leaving the strip and its card — by pointer or by focus — closes the card.
  useEffect(() => {
    const el = wrapper.current;
    if (!el) return;
    const leave = () => setActive(null);
    const blur = (event: FocusEvent) => {
      if (!el.contains(event.relatedTarget as Node | null)) setActive(null);
    };
    el.addEventListener("mouseleave", leave);
    el.addEventListener("focusout", blur);
    return () => {
      el.removeEventListener("mouseleave", leave);
      el.removeEventListener("focusout", blur);
    };
  }, []);

  const cellLabel = (day: BarDay) => {
    const date = formatDayKey(day.date, locale);
    const state = day.state === "no_data" ? t("noReadings") : ts(day.state);
    const base =
      day.uptime === null
        ? t("dayLabel", { date, state })
        : t("dayLabelUptime", { date, state, uptime: formatUptime(day.uptime) });
    return day.incidents.length > 0
      ? `${base}, ${t("dayIncidents", { count: day.incidents.length })}`
      : base;
  };

  const known = days.filter((d) => d.state !== "no_data").length;
  const current = active === null ? null : (days[active] ?? null);

  return (
    <div ref={wrapper} className="relative">
      <fieldset className="m-0 min-w-0 border-0 p-0">
        <legend className="sr-only">
          {label}. {t("summary", { days: days.length, known })}
        </legend>
        <div className="flex h-4 w-full items-stretch gap-px sm:gap-[2px]">
          {days.map((day, index) => (
            <button
              key={day.date}
              type="button"
              ref={(el) => {
                cells.current[index] = el;
              }}
              tabIndex={index === days.length - 1 ? 0 : -1}
              aria-label={cellLabel(day)}
              aria-describedby={active === index ? `${id}-card` : undefined}
              aria-expanded={active === index}
              className={cn(
                "relative min-w-0 flex-1 rounded-[1px] focus-visible:z-10",
                index < mobileStart && "max-sm:hidden",
              )}
              onMouseEnter={() => setActive(index)}
              onFocus={() => setActive(index)}
              onClick={() => setActive((a) => (a === index ? null : index))}
              onKeyDown={(event) => onKeyDown(event, index)}
            >
              <span
                aria-hidden
                className={cn(
                  "block h-full w-full rounded-[1px] motion-safe:transition-opacity motion-safe:duration-100",
                  stateFill[day.state],
                  active !== null && active !== index && "opacity-50",
                )}
              />
            </button>
          ))}
        </div>
      </fieldset>
      {current && active !== null ? (
        <DayCard
          id={`${id}-card`}
          day={current}
          index={active}
          count={days.length}
          mobileStart={mobileStart}
          locale={locale}
          incidentHref={incidentHref}
        />
      ) : null}
    </div>
  );
}

function DayCard({
  id,
  day,
  index,
  count,
  mobileStart,
  locale,
  incidentHref,
}: {
  id: string;
  day: BarDay;
  index: number;
  count: number;
  mobileStart: number;
  locale: AppLocale;
  incidentHref: string;
}) {
  const t = useTranslations("bar");
  const ts = useTranslations("state");
  const wide = ((index + 0.5) / count) * 100;
  const narrow = ((index - mobileStart + 0.5) / (count - mobileStart)) * 100;
  return (
    <div
      id={id}
      role="tooltip"
      style={
        {
          "--card-x": `${wide}%`,
          "--card-x-sm": `${Math.max(0, narrow)}%`,
        } as CSSProperties
      }
      className={cn(
        "absolute bottom-full z-20 mb-2 w-64 max-w-[calc(100vw-2rem)] rounded-lg border border-border bg-background p-3 text-left shadow-ambient-lg",
        "left-[clamp(0%,calc(var(--card-x-sm)-8rem),calc(100%-16rem))]",
        "sm:left-[clamp(0%,calc(var(--card-x)-8rem),calc(100%-16rem))]",
      )}
    >
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-xs font-medium text-foreground">{formatDayKey(day.date, locale)}</p>
        {day.uptime !== null ? (
          <p className="text-xs tabular-nums text-foreground">{formatUptime(day.uptime)}</p>
        ) : null}
      </div>
      {day.state === "no_data" ? (
        <p className="mt-1.5 text-xs text-muted-foreground">{t("noReadings")}</p>
      ) : (
        <>
          <p className="mt-1 text-xs tabular-nums text-muted-foreground">
            {t("readings", { count: day.total })}
            {day.avgLatencyMs !== null
              ? ` · ${t("avgLatency", { value: formatLatency(day.avgLatencyMs, locale) })}`
              : null}
          </p>
          {day.incidents.length === 0 ? (
            <p className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
              <span aria-hidden className={cn("size-1.5 rounded-full", stateFill[day.state])} />
              {day.state === "operational"
                ? t("noIncidents")
                : t("stateDetected", { state: ts(day.state) })}
            </p>
          ) : (
            <ul className="mt-2 space-y-1.5 border-t border-border pt-2">
              {day.incidents.map((incident) => (
                <li key={incident.id}>
                  <a
                    href={`${incidentHref}${incident.id}`}
                    className="flex items-start gap-1.5 text-xs text-foreground hover:underline"
                  >
                    <span
                      aria-hidden
                      className={cn(
                        "mt-1 size-1.5 shrink-0 rounded-full",
                        impactFill[incident.impact],
                      )}
                    />
                    <span className="line-clamp-2">{incident.title}</span>
                  </a>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}
