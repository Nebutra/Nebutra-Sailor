"use client";

/**
 * The 90-day strip. One cell per UTC day; a day with no readings is muted and
 * named as such — history is never invented.
 *
 * The day card is a portaled, collision-aware floating card (Base UI's
 * tooltip positioner — the layer @nebutra/ui is built on — with no focus
 * management of its own, so it cannot fight the strip's roving focus),
 * anchored to the day it describes: it flips below
 * when there is no room above, shifts to stay inside the viewport, and points
 * at its day with an arrow. It never sits in the page flow, so the rows after
 * it cannot paint over it.
 *
 * - Pointer: hover or focus opens; leaving the strip and the card closes.
 * - Touch: tap opens, tap elsewhere, Escape or scrolling closes.
 * - One card is open on the whole page at a time.
 * - Keyboard: Tab enters on today, arrows move, Home/End jump, Escape closes;
 *   Tab from a day with incidents moves into the card's links, and leaving
 *   the card returns focus to the day.
 * - Every cell is a button with its own accessible name.
 * - Below 640px the strip shows the last 30 days so each cell stays tappable.
 */
import { Tooltip } from "@base-ui/react/tooltip";
import { cn } from "@nebutra/ui/utils";
import { useTranslations } from "next-intl";
import { type KeyboardEvent, useCallback, useEffect, useId, useRef, useState } from "react";
import { formatDayKey, formatLatency, formatUptime } from "@/lib/format";
import type { AppLocale } from "@/lib/locale";
import type { BarDay } from "@/lib/view";
import { impactFill, stateFill } from "./state-style";

const MOBILE_DAYS = 30;
const HOVER_CLOSE_MS = 120;

type OpenedBy = "hover" | "focus" | "tap";

/** The page-wide "one card open" rule: opening a card closes the previous one. */
let closeOpenCard: (() => void) | null = null;

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
  const openedBy = useRef<OpenedBy | null>(null);
  /** Focus coming back from a closed card must not reopen it. */
  const returningFocus = useRef(false);
  const lastPointer = useRef<string>("mouse");
  /** Between pointerdown and click: the click decides, focus must not. */
  const pressing = useRef(false);
  /** When a non-mouse pointer last arrived on a cell: focus right after it is a tap. */
  const touchedAt = useRef(0);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cells = useRef<Array<HTMLButtonElement | null>>([]);
  const popup = useRef<HTMLDivElement | null>(null);
  const strip = useRef<HTMLFieldSetElement | null>(null);
  const mobileStart = Math.max(0, days.length - MOBILE_DAYS);

  const cancelClose = useCallback(() => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    closeTimer.current = null;
  }, []);

  const close = useCallback(() => {
    cancelClose();
    openedBy.current = null;
    setActive(null);
  }, [cancelClose]);

  const open = useCallback(
    (index: number, by: OpenedBy) => {
      cancelClose();
      if (closeOpenCard && closeOpenCard !== close) closeOpenCard();
      closeOpenCard = close;
      openedBy.current = by;
      setActive(index);
    },
    [close, cancelClose],
  );

  useEffect(
    () => () => {
      cancelClose();
      if (closeOpenCard === close) closeOpenCard = null;
    },
    [close, cancelClose],
  );

  // A card opened by touch closes when the page scrolls under it.
  useEffect(() => {
    if (active === null || openedBy.current !== "tap") return;
    const onScroll = () => close();
    window.addEventListener("scroll", onScroll, { passive: true, capture: true });
    return () => window.removeEventListener("scroll", onScroll, { capture: true });
  }, [active, close]);

  // A tap anywhere outside the strip and its card closes a tapped card.
  useEffect(() => {
    if (active === null || openedBy.current !== "tap") return;
    const onDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (strip.current?.contains(target) || popup.current?.contains(target)) return;
      close();
    };
    document.addEventListener("pointerdown", onDown, true);
    return () => document.removeEventListener("pointerdown", onDown, true);
  }, [active, close]);

  const scheduleClose = () => {
    if (openedBy.current !== "hover") return;
    cancelClose();
    closeTimer.current = setTimeout(close, HOVER_CLOSE_MS);
  };

  const focusCell = useCallback(
    (index: number) => {
      const wide = typeof window !== "undefined" && window.matchMedia("(min-width: 640px)").matches;
      const min = wide ? 0 : mobileStart;
      const next = Math.max(min, Math.min(days.length - 1, index));
      cells.current[next]?.focus();
      open(next, "focus");
    },
    [days.length, mobileStart, open],
  );

  const firstLink = () => popup.current?.querySelector<HTMLAnchorElement>("a[href]") ?? null;

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
      close();
    } else if (event.key === "Tab" && !event.shiftKey && active === index) {
      const link = firstLink();
      if (link) {
        event.preventDefault();
        link.focus();
      }
    }
  };

  // Tabbing out of the card, either end, hands focus back to its day.
  const onPopupKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (active === null) return;
    if (event.key === "Escape") {
      event.preventDefault();
      const cell = cells.current[active];
      close();
      returningFocus.current = true;
      cell?.focus();
      return;
    }
    if (event.key !== "Tab") return;
    const links = Array.from(popup.current?.querySelectorAll<HTMLAnchorElement>("a[href]") ?? []);
    const edge = event.shiftKey ? links[0] : links.at(-1);
    if (document.activeElement === edge) {
      event.preventDefault();
      const cell = cells.current[active];
      close();
      returningFocus.current = true;
      cell?.focus();
    }
  };

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
  const anchor = active === null ? null : (cells.current[active] ?? null);

  return (
    <Tooltip.Root
      open={current !== null}
      // Opening and closing are this component's own decisions (hover, focus,
      // tap, Escape, outside press, scroll); the primitive only positions.
      onOpenChange={(next, details) => {
        if (!next && details.reason === "escape-key") close();
      }}
    >
      <fieldset ref={strip} className="m-0 min-w-0 border-0 p-0" onPointerLeave={scheduleClose}>
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
              onPointerDown={(event) => {
                lastPointer.current = event.pointerType;
                pressing.current = true;
              }}
              onPointerUp={() => {
                // The click (if any) runs first; a press that never clicks is forgotten.
                setTimeout(() => {
                  pressing.current = false;
                }, 0);
              }}
              onPointerCancel={() => {
                pressing.current = false;
              }}
              onPointerEnter={(event) => {
                lastPointer.current = event.pointerType;
                if (event.pointerType === "mouse") open(index, "hover");
                else touchedAt.current = Date.now();
              }}
              onFocus={() => {
                if (returningFocus.current) {
                  returningFocus.current = false;
                  return;
                }
                if (pressing.current) return;
                // A touch focuses the cell just before its click; the click decides.
                if (Date.now() - touchedAt.current < 600) return;
                if (active !== index) open(index, "focus");
              }}
              onBlur={(event) => {
                const to = event.relatedTarget as Node | null;
                if (openedBy.current === "focus" && !popup.current?.contains(to)) close();
              }}
              onClick={() => {
                pressing.current = false;
                if (lastPointer.current === "mouse") return;
                if (active === index && openedBy.current === "tap") close();
                else open(index, "tap");
              }}
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
      {current && anchor ? (
        <Tooltip.Portal>
          <Tooltip.Positioner
            anchor={anchor}
            side="top"
            align="center"
            sideOffset={8}
            collisionPadding={12}
            className="z-50"
          >
            <Tooltip.Popup
              ref={popup}
              id={`${id}-card`}
              onPointerEnter={cancelClose}
              onPointerLeave={scheduleClose}
              onKeyDown={onPopupKeyDown}
              className="w-64 max-w-[calc(100vw-1.5rem)] rounded-lg border border-border bg-popover p-3 text-left text-popover-foreground shadow-ambient-lg outline-none motion-safe:transition-opacity motion-safe:duration-100 data-[ending-style]:opacity-0 data-[starting-style]:opacity-0"
            >
              <Tooltip.Arrow className="size-2.5 rotate-45 border-border bg-popover data-[side=bottom]:-top-[5px] data-[side=bottom]:border-l data-[side=bottom]:border-t data-[side=top]:-bottom-[5px] data-[side=top]:border-b data-[side=top]:border-r" />
              <DayCardBody day={current} locale={locale} incidentHref={incidentHref} />
            </Tooltip.Popup>
          </Tooltip.Positioner>
        </Tooltip.Portal>
      ) : null}
    </Tooltip.Root>
  );
}

function DayCardBody({
  day,
  locale,
  incidentHref,
}: {
  day: BarDay;
  locale: AppLocale;
  incidentHref: string;
}) {
  const t = useTranslations("bar");
  const ts = useTranslations("state");
  return (
    <>
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
    </>
  );
}
