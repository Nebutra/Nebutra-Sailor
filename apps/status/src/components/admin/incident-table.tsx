import { cn } from "@nebutra/ui/utils";
import { getTranslations } from "next-intl/server";
import { LocalTime } from "@/components/local-time";
import { impactFill } from "@/components/state-style";
import type { AppLocale } from "@/lib/locale";
import type { SnapshotIncident } from "@/server/snapshot";

/** Dense incident list: one row each, what it is, where it stands, when it moved. */
export async function IncidentTable({
  incidents,
  page,
  locale,
  timeZone,
}: {
  incidents: SnapshotIncident[];
  page: string;
  locale: AppLocale;
  timeZone: string | null;
}) {
  const t = await getTranslations({ locale });
  return (
    <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border">
      {incidents.map((i) => (
        <li key={i.id}>
          <a
            href={`/admin/incidents/${i.id}?page=${page}`}
            className="grid grid-cols-[auto_1fr_auto] items-center gap-x-3 gap-y-0.5 px-4 py-3 transition-colors hover:bg-muted/40"
          >
            <span
              aria-hidden
              className={cn(
                "size-2 rounded-full",
                i.kind === "maintenance" ? "bg-blue-700" : impactFill[i.impact],
              )}
            />
            <span className="truncate text-sm font-medium text-foreground">{i.title}</span>
            <span className="text-xs tabular-nums text-muted-foreground">
              <LocalTime iso={i.updatedAt.toISOString()} locale={locale} timeZone={timeZone} />
            </span>
            <span />
            <span className="col-span-2 truncate text-xs text-muted-foreground">
              {i.kind === "maintenance"
                ? t(`maintenance.${i.phase ?? "scheduled"}`)
                : `${t(`incidentStatus.${i.status}`)} · ${t(`impact.${i.impact}`)}`}
              {" · "}
              {t("admin.incidents.components", { count: i.componentKeys.length })}
            </span>
          </a>
        </li>
      ))}
    </ul>
  );
}
