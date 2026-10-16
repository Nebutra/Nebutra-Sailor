import { getTranslations } from "next-intl/server";
import { type AppLocale, pickI18n } from "@/lib/locale";
import { groupBar, groupComponents, newestReading } from "@/lib/view";
import type { PageSnapshot } from "@/server/snapshot";
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

const RECENT_LIMIT = 5;

/**
 * The public page, top to bottom: one-sentence verdict → what is broken now →
 * planned work → every component with its proof and 90 days → what happened
 * recently. Order follows what a reader arriving mid-outage needs first.
 */
export async function StatusView({
  snapshot,
  locale,
}: {
  snapshot: PageSnapshot;
  locale: AppLocale;
}) {
  const t = await getTranslations({ locale });
  const now = snapshot.generatedAt;
  const slug = snapshot.page.slug;
  const incidentHref = `/p/${slug}/incidents/`;
  const groups = groupComponents(snapshot.groups, snapshot.components);
  const latest = newestReading(snapshot.components);

  const failing = snapshot.components.filter(
    (c) =>
      c.verdict.state === "outage" ||
      c.verdict.state === "degraded" ||
      c.verdict.state === "unknown",
  );
  const inMaintenance = snapshot.components.filter((c) => c.verdict.state === "maintenance");
  const recent = snapshot.recentIncidents
    .filter((i) => i.status === "resolved" || i.phase === "completed")
    .slice(0, RECENT_LIMIT);

  return (
    <>
      <section aria-labelledby="verdict" className="pb-2">
        <div className="flex items-start gap-3">
          <StateIcon state={snapshot.overall} className="mt-1 size-6 shrink-0" />
          <div className="min-w-0">
            <h1
              id="verdict"
              className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl"
            >
              {t(`verdict.${snapshot.overall}`)}
            </h1>
            {failing.length > 0 ? (
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                {t("verdict.affected", {
                  names: componentNames(
                    failing.map((c) => c.key),
                    snapshot.components,
                    locale,
                  ),
                })}
              </p>
            ) : null}
            {inMaintenance.length > 0 ? (
              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                {t("verdict.maintenanceNote", {
                  names: componentNames(
                    inMaintenance.map((c) => c.key),
                    snapshot.components,
                    locale,
                  ),
                })}
              </p>
            ) : null}
            <p className="mt-2 text-xs text-muted-foreground">
              {latest
                ? t.rich("verdict.latestReading", {
                    time: () => (
                      <LocalTime
                        iso={latest.toISOString()}
                        serverNow={now.toISOString()}
                        locale={locale}
                        mode="relative"
                      />
                    ),
                  })
                : t("verdict.waiting")}
            </p>
          </div>
        </div>
      </section>

      {snapshot.activeIncidents.length > 0 ? (
        <section aria-labelledby="active" className="mt-10">
          <h2 id="active" className="mb-3 text-sm font-medium text-foreground">
            {t("sections.active")}
          </h2>
          <div className="space-y-3">
            {snapshot.activeIncidents.map((incident) => (
              <ActiveIncidentCard
                key={incident.id}
                incident={incident}
                components={snapshot.components}
                href={`${incidentHref}${incident.id}`}
                now={now}
                locale={locale}
              />
            ))}
          </div>
        </section>
      ) : null}

      {snapshot.maintenance.length > 0 ? (
        <section aria-labelledby="maintenance" className="mt-10">
          <h2 id="maintenance" className="mb-3 text-sm font-medium text-foreground">
            {t("sections.maintenance")}
          </h2>
          <div className="space-y-3">
            {snapshot.maintenance.map((item) => (
              <MaintenanceCard
                key={item.id}
                item={item}
                components={snapshot.components}
                href={`${incidentHref}${item.id}`}
                locale={locale}
              />
            ))}
          </div>
        </section>
      ) : null}

      <section aria-labelledby="components" className="mt-10">
        <h2 id="components" className="mb-3 text-sm font-medium text-foreground">
          {t("sections.components")}
        </h2>
        <div className="divide-y divide-border rounded-lg border border-border bg-background">
          {groups.map((group) =>
            group.key === null ? (
              <ul key="__loose" className="divide-y divide-border px-4 sm:px-5">
                {group.components.map((c) => (
                  <ComponentRow
                    key={c.id}
                    component={c}
                    incidents={snapshot.recentIncidents}
                    now={now}
                    locale={locale}
                    incidentHref={incidentHref}
                  />
                ))}
              </ul>
            ) : (
              <ComponentGroup
                key={group.key}
                name={pickI18n(group.name ?? group.key, group.nameI18n, locale)}
                count={group.components.length}
                state={group.state}
                uptime90={group.uptime90}
                days={groupBar(group, snapshot.recentIncidents, now)}
                locale={locale}
                incidentHref={incidentHref}
                defaultOpen={group.state !== "operational"}
              >
                {group.components.map((c) => (
                  <ComponentRow
                    key={c.id}
                    component={c}
                    incidents={snapshot.recentIncidents}
                    now={now}
                    locale={locale}
                    incidentHref={incidentHref}
                  />
                ))}
              </ComponentGroup>
            ),
          )}
        </div>
      </section>

      <section aria-labelledby="recent" className="mt-10">
        <div className="mb-3 flex items-baseline justify-between gap-3">
          <h2 id="recent" className="text-sm font-medium text-foreground">
            {t("sections.recent")}
          </h2>
          <a
            href={`/p/${slug}/history`}
            className="text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            {t("history.viewHistory")}
          </a>
        </div>
        {recent.length > 0 ? (
          <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border">
            {recent.map((incident) => (
              <IncidentListItem
                key={incident.id}
                incident={incident}
                href={`${incidentHref}${incident.id}`}
                now={now}
                locale={locale}
              />
            ))}
          </ul>
        ) : (
          <p className="rounded-lg border border-dashed border-border px-4 py-4 text-sm text-muted-foreground sm:px-5">
            {t("history.quietWindow")}
          </p>
        )}
      </section>
    </>
  );
}
