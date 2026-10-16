import { ChevronRight, Wrench } from "@nebutra/icons";
import { cn } from "@nebutra/ui/utils";
import { getTranslations } from "next-intl/server";
import { formatDuration } from "@/lib/format";
import { type AppLocale, pickI18n } from "@/lib/locale";
import { incidentDurationMs } from "@/lib/view";
import type { SnapshotComponent, SnapshotIncident } from "@/server/snapshot";
import { LocalTime } from "./local-time";
import { impactFill, impactTint } from "./state-style";

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

/** The incident's title in the reader's language, when the operator wrote one. */
export function incidentTitle(incident: SnapshotIncident, locale: AppLocale): string {
  return pickI18n(incident.title, incident.titleI18n ?? null, locale);
}

export function latestMessage(incident: SnapshotIncident, locale: AppLocale): string | null {
  const last = incident.updates.at(-1);
  return last ? pickI18n(last.message, last.messageI18n, locale) : null;
}

/**
 * An open incident takes the verdict's place, in the same card shape: a
 * tinted header with the title and its status, then the latest update and
 * what it touches.
 */
export async function ActiveIncidentCard({
  incident,
  names,
  href,
  now,
  locale,
  timeZone,
}: {
  incident: SnapshotIncident;
  names: string;
  href: string;
  now: Date;
  locale: AppLocale;
  timeZone: string | null;
}) {
  const t = await getTranslations({ locale });
  const message = latestMessage(incident, locale);
  const last = incident.updates.at(-1);
  return (
    <a
      href={href}
      className="group block overflow-hidden rounded-lg border border-border bg-card transition-colors hover:border-foreground/20"
    >
      <div className={cn("flex items-center gap-2.5 px-4 py-3", impactTint[incident.impact])}>
        <span
          aria-hidden
          className={cn("size-2 shrink-0 rounded-full", impactFill[incident.impact])}
        />
        <h2 className="min-w-0 flex-1 truncate text-base font-medium text-foreground">
          {incidentTitle(incident, locale)}
        </h2>
        <span className="shrink-0 text-sm text-foreground/80">
          {t(`incidentStatus.${incident.status}`)}
        </span>
        <ChevronRight aria-hidden className="size-4 shrink-0 text-muted-foreground" />
      </div>
      <div className="px-4 py-3.5">
        {message ? (
          <p className="line-clamp-3 text-sm leading-6 text-foreground">{message}</p>
        ) : null}
        <p className="mt-2 flex flex-wrap gap-x-2 text-xs text-muted-foreground">
          {last ? (
            <LocalTime
              iso={last.createdAt.toISOString()}
              nowIso={now.toISOString()}
              locale={locale}
              timeZone={timeZone}
              mode="relative"
            />
          ) : null}
          <span aria-hidden>·</span>
          <span className="tabular-nums">
            {t("incident.ongoingFor", {
              duration: formatDuration(incidentDurationMs(incident, now), locale),
            })}
          </span>
          {names ? (
            <>
              <span aria-hidden>·</span>
              <span>{t("incident.affects", { names })}</span>
            </>
          ) : null}
        </p>
      </div>
    </a>
  );
}

export async function MaintenanceCard({
  item,
  names,
  href,
  locale,
  timeZone,
}: {
  item: SnapshotIncident;
  names: string;
  href: string;
  locale: AppLocale;
  timeZone: string | null;
}) {
  const t = await getTranslations({ locale });
  const message = latestMessage(item, locale);
  const phase = item.phase ?? "scheduled";
  return (
    <a
      href={href}
      className="block overflow-hidden rounded-lg border border-border bg-card transition-colors hover:border-foreground/20"
    >
      <div
        className={cn(
          "flex items-center gap-2.5 px-4 py-3",
          phase === "in_progress" ? "bg-blue-3" : "bg-muted",
        )}
      >
        <Wrench aria-hidden className="size-4 shrink-0 text-blue-900" />
        <h2 className="min-w-0 flex-1 truncate text-base font-medium text-foreground">
          {incidentTitle(item, locale)}
        </h2>
        <span className="shrink-0 text-sm text-foreground/80">{t(`maintenance.${phase}`)}</span>
      </div>
      <div className="px-4 py-3.5">
        {item.scheduledStart && item.scheduledEnd ? (
          <p className="text-sm tabular-nums text-foreground">
            <LocalTime
              iso={item.scheduledStart.toISOString()}
              locale={locale}
              timeZone={timeZone}
            />
            {locale === "zh-CN" ? " 至 " : " – "}
            <LocalTime iso={item.scheduledEnd.toISOString()} locale={locale} timeZone={timeZone} />
          </p>
        ) : null}
        {message ? (
          <p className="mt-1 line-clamp-2 text-sm leading-6 text-muted-foreground">{message}</p>
        ) : null}
        {names ? (
          <p className="mt-2 text-xs text-muted-foreground">{t("incident.affects", { names })}</p>
        ) : null}
      </div>
    </a>
  );
}

/** A past incident in a list: title, date, duration, impact. */
export async function IncidentListItem({
  incident,
  href,
  now,
  locale,
  timeZone,
}: {
  incident: SnapshotIncident;
  href: string;
  now: Date;
  locale: AppLocale;
  timeZone: string | null;
}) {
  const t = await getTranslations({ locale });
  const done = incident.status === "resolved" || incident.phase === "completed";
  const duration = formatDuration(incidentDurationMs(incident, now), locale);
  return (
    <li>
      <a
        href={href}
        className="group flex items-start gap-3 px-4 py-3.5 transition-colors hover:bg-muted/50"
      >
        <span
          aria-hidden
          className={cn(
            "mt-1.5 size-2 shrink-0 rounded-full",
            incident.kind === "maintenance" ? "bg-blue-700" : impactFill[incident.impact],
          )}
        />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium text-foreground">
            {incidentTitle(incident, locale)}
          </span>
          <span className="mt-0.5 flex flex-wrap gap-x-1.5 text-xs tabular-nums text-muted-foreground">
            <LocalTime iso={incident.createdAt.toISOString()} locale={locale} timeZone={timeZone} />
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
          </span>
        </span>
        <ChevronRight
          aria-hidden
          className="mt-0.5 size-4 shrink-0 text-muted-foreground motion-safe:transition-transform group-hover:translate-x-0.5"
        />
      </a>
    </li>
  );
}
