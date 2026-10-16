import { cn } from "@nebutra/ui/utils";
import { getTranslations } from "next-intl/server";
import { formatAge, formatUptime } from "@/lib/format";
import { type AppLocale, pickI18n } from "@/lib/locale";
import { componentBar, componentEvidence, type EvidenceLine } from "@/lib/view";
import type { SnapshotComponent, SnapshotIncident } from "@/server/snapshot";
import { ComponentDescription } from "./component-description";
import { LocalTime } from "./local-time";
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
  const line = componentEvidence(component, now);
  const silent = verdict.state === "unknown";
  const stateWord =
    verdict.state === "operational"
      ? null
      : silent
        ? // The evidence line already says "awaiting fresh data" and names the source.
          verdict.evidence.length === 0
          ? t("state.no_source")
          : null
        : t(`state.${verdict.state}`);

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
      {stateWord && line.kind === "none" ? (
        <p className={cn("mt-1 text-xs sm:hidden", stateInk[verdict.state])}>{stateWord}</p>
      ) : null}
      <EvidenceCaption line={line} now={now} locale={locale} />
      <div className="mt-2.5">
        <UptimeBar
          days={componentBar(component, incidents, now, locale)}
          locale={locale}
          incidentHref={incidentHref}
          label={name}
        />
      </div>
    </li>
  );
}

/**
 * Our differentiator, in one muted line: what the colour rests on and how
 * fresh it is — "用户旅程已验证 · 2 分钟前", "依赖探测 · 30 秒前". Amber only
 * when a fresh source is failing; a quiet source is named, never painted red.
 */
async function EvidenceCaption({
  line,
  now,
  locale,
}: {
  line: EvidenceLine;
  now: Date;
  locale: AppLocale;
}) {
  if (line.kind === "none") return null;
  const t = await getTranslations({ locale, namespace: "evidence" });
  const silent = line.quiet
    ? t("silentFor", { source: line.quiet.source, age: formatAge(line.quiet.ageSeconds, locale) })
    : null;
  const failing = line.kind !== "stale" && !line.passing;
  return (
    <p className="mt-1 text-xs text-muted-foreground">
      {line.kind === "stale" ? (
        <>
          {t("awaiting")}
          {silent ? <> · {silent}</> : null}
        </>
      ) : (
        <>
          <span className={failing ? "text-amber-900" : undefined}>
            {t(failing ? `${line.kind}_failing` : line.kind)}
          </span>
          {line.at ? (
            <>
              {" · "}
              <LocalTime
                iso={line.at.toISOString()}
                nowIso={now.toISOString()}
                locale={locale}
                timeZone={null}
                mode="relative"
              />
            </>
          ) : null}
          {silent ? <> · {silent}</> : null}
        </>
      )}
    </p>
  );
}
