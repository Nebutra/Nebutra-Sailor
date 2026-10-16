import { ArrowLeft } from "@nebutra/icons";
import { cn } from "@nebutra/ui/utils";
import { getTranslations } from "next-intl/server";
import { formatDuration } from "@/lib/format";
import { type AppLocale, pickI18n } from "@/lib/locale";
import { INCIDENT_STEPS, incidentDurationMs, stepTimes } from "@/lib/view";
import type { SnapshotComponent, SnapshotIncident } from "@/server/snapshot";
import { LocalTime } from "./local-time";
import { StateIcon } from "./state-icon";
import { impactFill } from "./state-style";

/**
 * One incident or maintenance: the facts first (when, how long, what it
 * touched), then the lifecycle, then every update as it was published —
 * each in the reader's language when the operator wrote one.
 */
export async function IncidentView({
  incident,
  components,
  slug,
  now,
  locale,
  timeZone,
}: {
  incident: SnapshotIncident;
  components: SnapshotComponent[];
  slug: string;
  now: Date;
  locale: AppLocale;
  timeZone: string | null;
}) {
  const t = await getTranslations({ locale });
  const isMaintenance = incident.kind === "maintenance";
  const done = incident.status === "resolved" || incident.phase === "completed";
  const duration = formatDuration(incidentDurationMs(incident, now), locale);
  const start = incident.scheduledStart ?? incident.createdAt;
  const end = incident.resolvedAt ?? (isMaintenance ? incident.scheduledEnd : null);
  const affected = incident.componentKeys
    .map((k) => components.find((c) => c.key === k))
    .filter((c): c is SnapshotComponent => Boolean(c));
  const updates = [...incident.updates].reverse();
  const reached = stepTimes(incident.updates);
  const lastReached = INCIDENT_STEPS.reduce((acc, s, i) => (reached[s] ? i : acc), -1);

  return (
    <article>
      <a
        href={`/p/${slug}`}
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft aria-hidden className="size-4" />
        {t("incident.back")}
      </a>

      <header className="mt-6">
        <p className="flex flex-wrap items-center gap-2 text-xs font-medium text-muted-foreground">
          <span
            aria-hidden
            className={cn(
              "size-2 rounded-full",
              isMaintenance ? "bg-blue-700" : impactFill[incident.impact],
            )}
          />
          {isMaintenance
            ? t(`maintenance.${incident.phase ?? "scheduled"}`)
            : `${t(`incidentStatus.${incident.status}`)} · ${t(`impact.${incident.impact}`)}`}
        </p>
        <h1 className="mt-2 text-xl font-semibold tracking-tight text-foreground">
          {incident.title}
        </h1>
      </header>

      <dl className="mt-6 grid grid-cols-2 gap-x-6 gap-y-5 rounded-lg border border-border bg-card p-4 sm:grid-cols-3">
        <div>
          <dt className="text-xs text-muted-foreground">{t("incident.started")}</dt>
          <dd className="mt-1 text-sm tabular-nums text-foreground">
            <LocalTime iso={start.toISOString()} locale={locale} timeZone={timeZone} />
          </dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">{t("incident.resolvedAt")}</dt>
          <dd className="mt-1 text-sm tabular-nums text-foreground">
            {end && done ? (
              <LocalTime iso={end.toISOString()} locale={locale} timeZone={timeZone} />
            ) : (
              "—"
            )}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">{t("incident.duration")}</dt>
          <dd className="mt-1 text-sm tabular-nums text-foreground">
            {done ? duration : t("incident.ongoingFor", { duration })}
          </dd>
        </div>
        <div className="col-span-2 sm:col-span-3">
          <dt className="text-xs text-muted-foreground">{t("incident.components")}</dt>
          <dd className="mt-1.5">
            {affected.length > 0 ? (
              <ul className="flex flex-wrap gap-2">
                {affected.map((c) => (
                  <li
                    key={c.key}
                    className="inline-flex items-center gap-1.5 rounded-md border border-border px-2 py-1 text-xs text-foreground"
                  >
                    <StateIcon state={c.verdict.state} className="size-3.5" />
                    {pickI18n(c.name, c.nameI18n, locale)}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">{t("incident.noComponents")}</p>
            )}
          </dd>
        </div>
      </dl>

      {isMaintenance ? null : (
        <section
          aria-labelledby="progress"
          className="mt-6 rounded-lg border border-border bg-card p-4"
        >
          <h2 id="progress" className="text-base font-medium text-foreground">
            {t("incident.progress")}
          </h2>
          <ol className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-0">
            {INCIDENT_STEPS.map((step, index) => {
              const at = reached[step];
              const skipped = !at && index < lastReached;
              return (
                <li
                  key={step}
                  aria-current={index === lastReached ? "step" : undefined}
                  className="relative sm:pr-3"
                >
                  <div
                    aria-hidden
                    className={cn(
                      "h-1 rounded-full",
                      at ? (step === "resolved" ? "bg-green-700" : "bg-foreground") : "bg-border",
                    )}
                  />
                  <p
                    className={cn(
                      "mt-2 text-sm",
                      at ? "font-medium text-foreground" : "text-muted-foreground",
                    )}
                  >
                    {t(`incidentStatus.${step}`)}
                  </p>
                  <p className="mt-0.5 text-xs tabular-nums text-muted-foreground">
                    {at ? (
                      <LocalTime iso={at.toISOString()} locale={locale} timeZone={timeZone} />
                    ) : skipped ? (
                      t("incident.skipped")
                    ) : (
                      t("incident.notReached")
                    )}
                  </p>
                </li>
              );
            })}
          </ol>
        </section>
      )}

      <section
        aria-labelledby="updates"
        className="mt-6 rounded-lg border border-border bg-card p-4"
      >
        <h2 id="updates" className="text-base font-medium text-foreground">
          {t("incident.updates")}
        </h2>
        <ol className="mt-4">
          {updates.map((u, index) => (
            <li
              key={`${u.createdAt.toISOString()}-${index}`}
              className="relative grid grid-cols-[1rem_1fr] gap-x-3 pb-8 last:pb-0"
            >
              <span aria-hidden className="relative flex justify-center">
                <span
                  className={cn(
                    "mt-1.5 size-2 rounded-full",
                    index === 0 ? "bg-foreground" : "bg-[hsl(var(--muted-foreground)/0.5)]",
                  )}
                />
                {index < updates.length - 1 ? (
                  <span className="absolute inset-y-0 top-4 w-px bg-border" />
                ) : null}
              </span>
              <div className="min-w-0">
                <p className="flex flex-wrap items-baseline gap-x-2 text-sm">
                  <span className="font-medium text-foreground">
                    {(INCIDENT_STEPS as string[]).includes(u.status)
                      ? t(`incidentStatus.${u.status}`)
                      : u.status}
                  </span>
                  <LocalTime
                    iso={u.createdAt.toISOString()}
                    locale={locale}
                    timeZone={timeZone}
                    className="text-xs tabular-nums text-muted-foreground"
                  />
                </p>
                <p className="mt-1.5 whitespace-pre-line text-sm leading-6 text-foreground/90">
                  {pickI18n(u.message, u.messageI18n, locale)}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </section>
    </article>
  );
}
