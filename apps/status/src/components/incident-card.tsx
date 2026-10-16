import { ChevronRight, Wrench } from "@nebutra/icons";
import { cn } from "@nebutra/ui/utils";
import { getTranslations } from "next-intl/server";
import { formatDuration } from "@/lib/format";
import { type AppLocale, pickI18n } from "@/lib/locale";
import { incidentDurationMs } from "@/lib/view";
import type { SnapshotComponent, SnapshotIncident } from "@/server/snapshot";
import { LocalTime } from "./local-time";
import { impactFill } from "./state-style";

export function componentNames(
  keys: string[],
  components: SnapshotComponent[],
  locale: AppLocale,
): string {
  const sep = locale === "zh-CN" ? "、" : ", ";
  return keys
    .map((k) => components.find((c) => c.key === k))
    .filter((c): c is SnapshotComponent => Boolean(c))
    .map((c) => pickI18n(c.name, c.nameI18n, locale))
    .join(sep);
}

export function latestMessage(incident: SnapshotIncident, locale: AppLocale): string | null {
  const last = incident.updates.at(-1);
  return last ? pickI18n(last.message, last.messageI18n, locale) : null;
}

/** An open incident: impact rail, status, title, the latest word, duration and reach. */
export async function ActiveIncidentCard({
  incident,
  components,
  href,
  now,
  locale,
}: {
  incident: SnapshotIncident;
  components: SnapshotComponent[];
  href: string;
  now: Date;
  locale: AppLocale;
}) {
  const t = await getTranslations({ locale });
  const names = componentNames(incident.componentKeys, components, locale);
  const message = latestMessage(incident, locale);
  const last = incident.updates.at(-1);
  return (
    <a
      href={href}
      aria-label={t("incident.openDetails", { title: incident.title })}
      className="group relative block overflow-hidden rounded-lg border border-border bg-background py-4 pl-5 pr-4 shadow-ambient-sm transition-shadow hover:shadow-ambient-md sm:pl-6 sm:pr-5"
    >
      <span
        aria-hidden
        className={cn("absolute inset-y-0 left-0 w-1", impactFill[incident.impact])}
      />
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-medium text-muted-foreground">
          {t(`incidentStatus.${incident.status}`)} · {t(`impact.${incident.impact}`)} ·{" "}
          <span className="tabular-nums">
            {t("incident.ongoingFor", {
              duration: formatDuration(incidentDurationMs(incident, now), locale),
            })}
          </span>
        </p>
        <ChevronRight
          aria-hidden
          className="size-4 shrink-0 text-muted-foreground motion-safe:transition-transform group-hover:translate-x-0.5"
        />
      </div>
      <h3 className="mt-1.5 text-base font-medium tracking-tight text-foreground">
        {incident.title}
      </h3>
      {message ? (
        <p className="mt-1 line-clamp-3 text-sm leading-6 text-muted-foreground">{message}</p>
      ) : null}
      <p className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
        {last ? (
          <LocalTime
            iso={last.createdAt.toISOString()}
            serverNow={now.toISOString()}
            locale={locale}
            mode="relative"
          />
        ) : null}
        {names ? <span>{t("incident.affects", { names })}</span> : null}
      </p>
    </a>
  );
}

export async function MaintenanceCard({
  item,
  components,
  href,
  locale,
}: {
  item: SnapshotIncident;
  components: SnapshotComponent[];
  href: string;
  locale: AppLocale;
}) {
  const t = await getTranslations({ locale });
  const names = componentNames(item.componentKeys, components, locale);
  const message = latestMessage(item, locale);
  const phase = item.phase ?? "scheduled";
  return (
    <a
      href={href}
      className="group relative block overflow-hidden rounded-lg border border-border bg-background py-4 pl-5 pr-4 transition-colors hover:bg-muted/40 sm:pl-6 sm:pr-5"
    >
      <span
        aria-hidden
        className={cn(
          "absolute inset-y-0 left-0 w-1",
          phase === "in_progress" ? "bg-info" : "bg-[hsl(var(--muted-foreground)/0.3)]",
        )}
      />
      <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
        <Wrench aria-hidden className="size-3.5" />
        {t(`maintenance.${phase}`)}
      </p>
      <h3 className="mt-1.5 text-base font-medium tracking-tight text-foreground">{item.title}</h3>
      {item.scheduledStart && item.scheduledEnd ? (
        <p className="mt-1 text-xs tabular-nums text-muted-foreground">
          <LocalTime iso={item.scheduledStart.toISOString()} locale={locale} />
          {locale === "zh-CN" ? " 至 " : " – "}
          <LocalTime iso={item.scheduledEnd.toISOString()} locale={locale} />
        </p>
      ) : null}
      {message ? (
        <p className="mt-1.5 line-clamp-2 text-sm leading-6 text-muted-foreground">{message}</p>
      ) : null}
      {names ? (
        <p className="mt-2 text-xs text-muted-foreground">{t("incident.affects", { names })}</p>
      ) : null}
    </a>
  );
}

/** A compact row for resolved incidents: title, date, duration, impact. */
export async function IncidentListItem({
  incident,
  href,
  now,
  locale,
}: {
  incident: SnapshotIncident;
  href: string;
  now: Date;
  locale: AppLocale;
}) {
  const t = await getTranslations({ locale });
  const done = incident.status === "resolved" || incident.phase === "completed";
  const duration = formatDuration(incidentDurationMs(incident, now), locale);
  return (
    <li>
      <a
        href={href}
        className="group flex items-start justify-between gap-4 px-4 py-4 transition-colors hover:bg-muted/40 sm:px-5"
      >
        <div className="flex min-w-0 items-start gap-2.5">
          <span
            aria-hidden
            className={cn(
              "mt-1.5 size-2 shrink-0 rounded-full",
              incident.kind === "maintenance" ? "bg-info" : impactFill[incident.impact],
            )}
          />
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-foreground">{incident.title}</p>
            <p className="mt-0.5 flex flex-wrap gap-x-1.5 text-xs tabular-nums text-muted-foreground">
              <LocalTime iso={incident.createdAt.toISOString()} locale={locale} />
              <span aria-hidden>·</span>
              <span>
                {done ? t("incident.lasted", { duration }) : t("incident.ongoingFor", { duration })}
              </span>
              <span aria-hidden>·</span>
              <span>
                {incident.kind === "maintenance"
                  ? t("incident.maintenance")
                  : t(`impact.${incident.impact}`)}
              </span>
            </p>
          </div>
        </div>
        <ChevronRight
          aria-hidden
          className="mt-0.5 size-4 shrink-0 text-muted-foreground motion-safe:transition-transform group-hover:translate-x-0.5"
        />
      </a>
    </li>
  );
}
