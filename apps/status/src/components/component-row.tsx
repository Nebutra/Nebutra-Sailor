import { cn } from "@nebutra/ui/utils";
import { getTranslations } from "next-intl/server";
import { formatRelative, formatUptime } from "@/lib/format";
import { type AppLocale, pickI18n } from "@/lib/locale";
import { componentBar, evidenceLine } from "@/lib/view";
import type { EvidenceCoverage } from "@/server/evaluate";
import type { SnapshotComponent, SnapshotIncident } from "@/server/snapshot";
import { ComponentDescription } from "./component-description";
import { CoverageLabel } from "./coverage-label";
import { StateIcon } from "./state-icon";
import { stateInk } from "./state-style";
import { UptimeBar } from "./uptime-bar";

/**
 * One component: name, a state word only when something is off, the
 * coverage label, uptime, and the 90-day strip. Quiet by default — a healthy
 * row is just a name, a number and a green strip.
 */
export async function ComponentRow({
  component,
  incidents,
  now,
  locale,
  incidentHref,
  nested = false,
}: {
  component: SnapshotComponent;
  incidents: SnapshotIncident[];
  now: Date;
  locale: AppLocale;
  incidentHref: string;
  nested?: boolean;
}) {
  const t = await getTranslations({ locale });
  const name = pickI18n(component.name, component.nameI18n, locale);
  const { verdict } = component;
  const line = evidenceLine(verdict, now);
  const silent = verdict.state === "unknown";
  const stateWord =
    verdict.state === "operational"
      ? null
      : silent
        ? verdict.evidence.length === 0
          ? t("state.no_source")
          : t("state.unknown")
        : t(`state.${verdict.state}`);

  const coverage = line.kind === "none" || line.kind === "stale" ? null : line.kind;
  const sourceLines = verdict.evidence.map((e) => {
    const status = e.stale
      ? t("coverage.quiet")
      : e.effectiveState === "operational"
        ? t("coverage.ok")
        : t("coverage.failing");
    return `${t(`coverage.${e.coverage as EvidenceCoverage}`)} · ${status} · ${formatRelative(e.checkedAt, now, locale)}`;
  });

  return (
    <li className={cn("py-4", nested ? "pl-4" : "")}>
      <div className="flex items-center gap-2">
        <StateIcon state={verdict.state} className="size-4" />
        <h3
          className={cn(
            "min-w-0 truncate text-sm text-foreground",
            nested ? "font-normal" : "font-medium",
          )}
        >
          {name}
        </h3>
        {component.description ? (
          <ComponentDescription name={name} text={component.description} />
        ) : null}
        {coverage ? (
          <CoverageLabel
            label={t(`coverage.${coverage}`)}
            tone={line.passing ? (line.staleMinutes === null ? "ok" : "quiet") : "bad"}
            heading={t("coverage.explain")}
            lines={sourceLines}
          />
        ) : null}
        <span className="ml-auto flex shrink-0 items-center gap-3 text-sm">
          {stateWord ? (
            <span className={cn("max-sm:hidden", stateInk[verdict.state])}>{stateWord}</span>
          ) : null}
          <span className="tabular-nums text-muted-foreground">
            {component.uptime90 === null
              ? t("uptime.unmeasured")
              : t("uptime.value", { value: formatUptime(component.uptime90) })}
          </span>
        </span>
      </div>
      {stateWord ? (
        <p className={cn("mt-1 text-xs sm:hidden", stateInk[verdict.state])}>{stateWord}</p>
      ) : null}
      <div className="mt-2.5">
        <UptimeBar
          days={componentBar(component, incidents, now)}
          locale={locale}
          incidentHref={incidentHref}
          label={name}
        />
      </div>
    </li>
  );
}
