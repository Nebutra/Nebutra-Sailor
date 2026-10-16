import { cn } from "@nebutra/ui/utils";
import { getTranslations } from "next-intl/server";
import { formatUptime } from "@/lib/format";
import { type AppLocale, pickI18n } from "@/lib/locale";
import { componentBar, evidenceLine } from "@/lib/view";
import type { SnapshotComponent, SnapshotIncident } from "@/server/snapshot";
import { LocalTime } from "./local-time";
import { StateIcon } from "./state-icon";
import { stateInk } from "./state-style";
import { UptimeBar } from "./uptime-bar";

/**
 * One component: name and state, what its colour rests on, uptime, and the
 * 90-day strip. The evidence line is what no other status page shows: whether
 * a user journey was proven or only a dependency answered, and how long ago.
 */
export async function ComponentRow({
  component,
  incidents,
  now,
  locale,
  incidentHref,
  as: Tag = "li",
}: {
  component: SnapshotComponent;
  incidents: SnapshotIncident[];
  now: Date;
  locale: AppLocale;
  incidentHref: string;
  as?: "li" | "div";
}) {
  const t = await getTranslations({ locale });
  const name = pickI18n(component.name, component.nameI18n, locale);
  const state = component.verdict.state;
  return (
    <Tag className="py-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex min-w-0 items-center gap-2">
            <StateIcon state={state} className="size-4 shrink-0" />
            <h3 className="truncate text-sm font-medium text-foreground">{name}</h3>
            {state !== "operational" ? (
              <span className={cn("shrink-0 text-xs", stateInk[state])}>{t(`state.${state}`)}</span>
            ) : null}
          </div>
          <EvidenceText component={component} now={now} locale={locale} />
        </div>
        <span className="shrink-0 pt-0.5 text-xs tabular-nums text-muted-foreground">
          {component.uptime90 === null
            ? t("uptime.unmeasured")
            : t("uptime.value", { value: formatUptime(component.uptime90) })}
        </span>
      </div>
      <div className="mt-3">
        <UptimeBar
          days={componentBar(component, incidents, now)}
          locale={locale}
          incidentHref={incidentHref}
          label={name}
        />
      </div>
    </Tag>
  );
}

async function EvidenceText({
  component,
  now,
  locale,
}: {
  component: SnapshotComponent;
  now: Date;
  locale: AppLocale;
}) {
  const t = await getTranslations({ locale, namespace: "evidence" });
  const line = evidenceLine(component.verdict, now);
  const quiet = (minutes: number, short: boolean) =>
    minutes >= 120
      ? t(short ? "staleAlsoHours" : "staleHours", { hours: Math.floor(minutes / 60) })
      : t(short ? "staleAlso" : "stale", { minutes });

  let label: string;
  let tone: "ok" | "bad" | "muted";
  if (line.kind === "none") {
    label = t("none");
    tone = "muted";
  } else if (line.kind === "stale") {
    label = quiet(line.staleMinutes ?? 1, false);
    tone = "bad";
  } else {
    label = t(line.passing ? line.kind : `${line.kind}_failing`);
    tone = line.passing ? "ok" : "bad";
  }

  return (
    <p className="mt-1 flex flex-wrap items-center gap-x-1.5 pl-6 text-xs text-muted-foreground">
      <span
        aria-hidden
        className={cn(
          "size-1.5 shrink-0 rounded-full",
          tone === "ok" && "bg-success",
          tone === "bad" && "bg-warning",
          tone === "muted" && "bg-[hsl(var(--muted-foreground)/0.45)]",
        )}
      />
      <span className={tone === "bad" ? "text-warning-strong" : undefined}>{label}</span>
      {line.at && line.kind !== "stale" ? (
        <>
          <span aria-hidden>·</span>
          <LocalTime
            iso={line.at.toISOString()}
            serverNow={now.toISOString()}
            locale={locale}
            mode="relative"
          />
        </>
      ) : null}
      {line.kind !== "stale" && line.staleMinutes !== null ? (
        <>
          <span aria-hidden>·</span>
          <span className="text-warning-strong">{quiet(line.staleMinutes, true)}</span>
        </>
      ) : null}
    </p>
  );
}
