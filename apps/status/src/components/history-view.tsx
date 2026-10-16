import { ArrowLeft } from "@nebutra/icons";
import { cn } from "@nebutra/ui/utils";
import { getTranslations } from "next-intl/server";
import { formatDayKey, formatMonth, formatUptime } from "@/lib/format";
import type { AppLocale } from "@/lib/locale";
import {
  type DayState,
  incidentsByMonth,
  incidentsOnDay,
  mergeDays,
  monthGrid,
  windowMonths,
} from "@/lib/view";
import type { PageSnapshot } from "@/server/snapshot";
import { IncidentListItem } from "./incident-card";
import { stateRing } from "./state-style";

/**
 * History: one calendar per month of the 90-day window, each day the page's
 * worst state that day, then every incident grouped by month. Days outside
 * the window are blank, not green.
 */
export async function HistoryView({
  snapshot,
  locale,
  timeZone,
}: {
  snapshot: PageSnapshot;
  locale: AppLocale;
  timeZone: string | null;
}) {
  const t = await getTranslations({ locale });
  const now = snapshot.generatedAt;
  const slug = snapshot.page.slug;
  const days = mergeDays(snapshot.components.map((c) => c.days));
  const byDate = new Map(days.map((d) => [d.date, d]));
  const window = new Set(days.map((d) => d.date));
  const months = windowMonths(days.map((d) => d.date));
  const grouped = incidentsByMonth(snapshot.recentIncidents);
  const weekdays = Array.from({ length: 7 }, (_, i) =>
    new Intl.DateTimeFormat(locale, { weekday: "narrow", timeZone: "UTC" }).format(
      new Date(Date.UTC(2024, 0, 1 + i)),
    ),
  );
  const legend: DayState[] = ["degraded", "outage", "maintenance"];
  const today = days.at(-1)?.date ?? "";

  return (
    <>
      <a
        href={`/p/${slug}`}
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft aria-hidden className="size-4" />
        {t("incident.back")}
      </a>
      <header className="mt-6">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          {t("history.title")}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">{t("history.subtitle")}</p>
      </header>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        {months.map(([year, month]) => (
          <section
            key={`${year}-${month}`}
            aria-label={formatMonth(year, month, locale)}
            className="rounded-lg border border-border bg-card p-4"
          >
            <h2 className="text-base font-medium text-foreground">
              {formatMonth(year, month, locale)}
            </h2>
            <table className="mt-3 w-full table-fixed border-separate border-spacing-y-1">
              <thead>
                <tr>
                  {weekdays.map((w, i) => (
                    <th
                      key={`wd-${i}-${w}`}
                      scope="col"
                      className="text-center text-[11px] font-normal text-muted-foreground"
                    >
                      {w}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {monthGrid(year, month, window).map((week) => (
                  <tr key={week[0]?.date}>
                    {week.map((cell) => {
                      if (!cell.inMonth) return <td key={cell.date} />;
                      const day = byDate.get(cell.date);
                      const incidents = incidentsOnDay(
                        snapshot.recentIncidents,
                        null,
                        cell.date,
                        now,
                      );
                      const state: DayState = day?.state ?? "no_data";
                      const label = [
                        formatDayKey(cell.date, locale),
                        cell.inWindow
                          ? state === "no_data"
                            ? t("bar.noReadings")
                            : t(`state.${state}`)
                          : cell.date > (days.at(-1)?.date ?? "")
                            ? t("history.future")
                            : t("history.outsideWindow"),
                        day?.uptime != null ? formatUptime(day.uptime) : null,
                        incidents.length > 0
                          ? t("bar.dayIncidents", { count: incidents.length })
                          : null,
                      ]
                        .filter(Boolean)
                        .join(" · ");
                      // Flashduty/incident.io calendar: neutral numbers, a ring only
                      // on days that were not fine. Colour marks trouble, not every day.
                      const ring =
                        cell.inWindow && state !== "operational" && state !== "no_data"
                          ? stateRing[state]
                          : null;
                      const body = (
                        <span
                          className={cn(
                            "mx-auto flex size-8 items-center justify-center rounded-full text-xs tabular-nums",
                            !cell.inWindow && "text-muted-foreground/50",
                            cell.inWindow && state === "no_data" && "text-muted-foreground",
                            cell.inWindow && state !== "no_data" && "text-foreground",
                            ring && cn("ring-2 ring-inset", ring),
                            cell.date === today && !ring && "ring-1 ring-inset ring-border",
                          )}
                        >
                          {Number(cell.date.slice(8))}
                        </span>
                      );
                      return (
                        <td key={cell.date} className="p-0">
                          {incidents[0] ? (
                            <a
                              href={`/p/${slug}/incidents/${incidents[0].id}`}
                              title={label}
                              aria-label={label}
                              className="block"
                            >
                              {body}
                            </a>
                          ) : (
                            <span title={label} role="img" aria-label={label} className="block">
                              {body}
                            </span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        ))}
      </div>

      <ul
        aria-label={t("history.legend")}
        className="mt-6 flex flex-wrap gap-x-4 gap-y-2 text-xs text-muted-foreground"
      >
        {legend.map((s) => (
          <li key={s} className="inline-flex items-center gap-1.5">
            <span
              aria-hidden
              className={cn("size-3 rounded-full ring-2 ring-inset", stateRing[s])}
            />
            {t(`state.${s}`)}
          </li>
        ))}
      </ul>

      <section aria-labelledby="history-incidents" className="mt-12">
        <h2 id="history-incidents" className="sr-only">
          {t("sections.history")}
        </h2>
        {months.map(([year, month]) => {
          const bucket = grouped.find((g) => g.year === year && g.month === month);
          return (
            <div key={`${year}-${month}`} className="mt-8 first:mt-0">
              <h3 className="mb-3 text-sm font-medium text-foreground">
                {formatMonth(year, month, locale)}
              </h3>
              {bucket ? (
                <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-card">
                  {bucket.incidents.map((incident) => (
                    <IncidentListItem
                      key={incident.id}
                      incident={incident}
                      href={`/p/${slug}/incidents/${incident.id}`}
                      now={now}
                      locale={locale}
                      timeZone={timeZone}
                    />
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">{t("history.quietMonth")}</p>
              )}
            </div>
          );
        })}
      </section>
    </>
  );
}
