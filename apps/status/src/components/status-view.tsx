import { Calendar } from "@nebutra/icons";
import { cn } from "@nebutra/ui/utils";
import { getTranslations } from "next-intl/server";
import { type AppLocale, pickI18n } from "@/lib/locale";
import { groupBar, groupComponents, groupStartsOpen, newestReading } from "@/lib/view";
import type { PageSnapshot } from "@/server/snapshot";
import { Card, CardHeader } from "./card";
import { ComponentGroup } from "./component-group";
import { ComponentRow } from "./component-row";
import {
  ActiveIncidentCard,
  componentNames,
  IncidentListItem,
  MaintenanceCard,
} from "./incident-card";
import { LocalTime } from "./local-time";
import { StateIcon } from "./state-icon";
import { verdictBorder, verdictTint } from "./state-style";

const RECENT_LIMIT = 5;

/**
 * The public page in incident.io's order: the overall verdict, always first →
 * open incidents → maintenance → system status → recent incidents → history.
 */
export async function StatusView({
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
  const nowIso = now.toISOString();
  const slug = snapshot.page.slug;
  const incidentHref = `/p/${slug}/incidents/`;
  const groups = groupComponents(snapshot.groups, snapshot.components);
  const flat = groups.length === 1 && groups[0]?.key === null;
  const latest = newestReading(snapshot.components);
  const names = (keys: string[]) => componentNames(keys, snapshot.components, locale);
  const failing = snapshot.components.filter(
    (c) => c.verdict.state === "outage" || c.verdict.state === "degraded",
  );
  const inMaintenance = snapshot.components.filter((c) => c.verdict.state === "maintenance");
  const recent = snapshot.recentIncidents
    .filter((i) => i.status === "resolved" || i.phase === "completed")
    .slice(0, RECENT_LIMIT);
  const noFresh =
    snapshot.noFreshData > 0 ? t("verdict.noFresh", { count: snapshot.noFreshData }) : null;
  const overall = snapshot.overall;
  const range = rangeLabel(snapshot.components[0]?.days.map((d) => d.date) ?? [], locale);
  const body =
    overall === "operational"
      ? t("verdict.operationalBody")
      : t(overall === "outage" ? "verdict.outageBody" : "verdict.degradedBody", {
          names: names(failing.map((c) => c.key)),
        });

  return (
    <div className="space-y-6">
      <section
        aria-labelledby="verdict"
        className={cn("overflow-hidden rounded-lg border bg-card", verdictBorder[overall])}
      >
        <div className={cn("flex items-center gap-2.5 px-4 py-3", verdictTint[overall])}>
          <StateIcon state={overall} force className="size-4.5" />
          <h1 id="verdict" className="text-base font-medium text-foreground">
            {t(`verdict.${overall}`)}
          </h1>
          {latest ? (
            <span className="ml-auto hidden text-xs text-muted-foreground sm:inline">
              {t("verdict.latestReading")}{" "}
              <LocalTime
                iso={latest.toISOString()}
                nowIso={nowIso}
                locale={locale}
                timeZone={timeZone}
                mode="relative"
              />
            </span>
          ) : null}
        </div>
        <p className="px-4 py-3.5 text-sm text-foreground">
          {snapshot.activeIncidents.length > 0
            ? t("verdict.handling", { count: snapshot.activeIncidents.length })
            : body}
          {noFresh ? <span className="text-muted-foreground"> {noFresh}</span> : null}
          {inMaintenance.length > 0 ? (
            <span className="text-muted-foreground">
              {" "}
              {t("verdict.maintenanceNote", { names: names(inMaintenance.map((c) => c.key)) })}
            </span>
          ) : null}
        </p>
      </section>
      {snapshot.activeIncidents.length > 0 ? (
        <section aria-label={t("sections.active")} className="space-y-4">
          {snapshot.activeIncidents.map((incident) => (
            <ActiveIncidentCard
              key={incident.id}
              incident={incident}
              names={names(incident.componentKeys)}
              href={`${incidentHref}${incident.id}`}
              now={now}
              locale={locale}
              timeZone={timeZone}
            />
          ))}
        </section>
      ) : null}

      {snapshot.maintenance.length > 0 ? (
        <section aria-label={t("sections.maintenance")} className="space-y-4">
          {snapshot.maintenance.map((item) => (
            <MaintenanceCard
              key={item.id}
              item={item}
              names={names(item.componentKeys)}
              href={`${incidentHref}${item.id}`}
              locale={locale}
              timeZone={timeZone}
            />
          ))}
        </section>
      ) : null}

      <Card labelledBy="system-status">
        <CardHeader
          id="system-status"
          title={t("status.title")}
          aside={<span className="tabular-nums">{range}</span>}
          note={null}
        />
        <div className="divide-y divide-border px-4">
          {groups.map((group) => {
            const rows = group.components.map((c) => (
              <ComponentRow
                key={c.id}
                component={c}
                incidents={snapshot.recentIncidents}
                now={now}
                locale={locale}
                incidentHref={incidentHref}
                nested={!flat}
              />
            ));
            if (flat) {
              return (
                <ul key="flat" className="divide-y divide-border">
                  {rows}
                </ul>
              );
            }
            const name =
              group.key === null
                ? t("status.other")
                : pickI18n(group.name ?? group.key, group.nameI18n, locale);
            return (
              <ComponentGroup
                key={group.key ?? "__other"}
                name={name}
                count={group.components.length}
                state={group.state}
                stateLabel={group.state === "operational" ? null : t(`state.${group.state}`)}
                uptime90={group.uptime90}
                days={groupBar(group, snapshot.recentIncidents, now)}
                locale={locale}
                incidentHref={incidentHref}
                defaultOpen={groupStartsOpen(group.state)}
              >
                {rows}
              </ComponentGroup>
            );
          })}
        </div>
      </Card>

      <Card labelledBy="recent">
        <CardHeader id="recent" title={t("sections.recent")} />
        {recent.length > 0 ? (
          <ul className="divide-y divide-border">
            {recent.map((incident) => (
              <IncidentListItem
                key={incident.id}
                incident={incident}
                href={`${incidentHref}${incident.id}`}
                now={now}
                locale={locale}
                timeZone={timeZone}
              />
            ))}
          </ul>
        ) : (
          <p className="px-4 py-4 text-sm text-muted-foreground">{t("history.quietWindow")}</p>
        )}
      </Card>

      <div className="flex justify-center pt-2">
        <a
          href={`/p/${slug}/history`}
          className="inline-flex items-center gap-2 rounded-md border border-border bg-card px-3 py-1.5 text-sm text-foreground transition-colors hover:bg-muted"
        >
          <Calendar aria-hidden className="size-4 text-muted-foreground" />
          {t("history.viewHistory")}
        </a>
      </div>
    </div>
  );
}

function rangeLabel(dates: string[], locale: AppLocale): string {
  const first = dates[0];
  const last = dates.at(-1);
  if (!first || !last) return "";
  const fmt = new Intl.DateTimeFormat(locale, { year: "numeric", month: "short", timeZone: "UTC" });
  const a = fmt.format(new Date(`${first}T12:00:00Z`));
  const b = fmt.format(new Date(`${last}T12:00:00Z`));
  return a === b ? b : `${a} – ${b}`;
}
