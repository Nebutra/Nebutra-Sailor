import { ChevronLeft, ChevronRight } from "@nebutra/icons";
import { type IncidentImpact, listIncidents, type StatusIncident } from "@nebutra/status";
import { cn } from "@nebutra/ui/utils";
import type { Metadata } from "next";
import { connection } from "next/server";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Suspense } from "react";
import {
  IncidentList,
  StatusPageSkeleton,
  StatusShell,
} from "@/components/status/status-page-view";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { buildPageMetadata } from "@/lib/seo/metadata";
import { unpublishedSet } from "@/lib/seo/site-routes";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const { lang } = await params;
  const t = await getTranslations({ locale: lang, namespace: "statusPages.history" });
  const path = "/status/history";
  return buildPageMetadata({
    title: t("meta.title"),
    description: t("meta.title"),
    path,
    locale: lang,
    publishedIn: unpublishedSet(path),
  });
}

type Search = Promise<{ month?: string }>;

export default async function HistoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ lang: string }>;
  searchParams: Search;
}) {
  const { lang } = await params;
  setRequestLocale(lang as Locale);
  const t = (await getTranslations({
    locale: lang,
    namespace: "statusPages.history",
  })) as unknown as (key: string) => string;
  return (
    <Suspense fallback={<StatusPageSkeleton />}>
      <HistoryContent searchParams={searchParams} t={t} />
    </Suspense>
  );
}

function parseMonth(raw: string | undefined, now: Date): { year: number; month: number } {
  const match = raw ? /^(\d{4})-(\d{2})$/.exec(raw) : null;
  if (match) {
    const month = Number(match[2]) - 1;
    if (month >= 0 && month < 12) return { year: Number(match[1]), month };
  }
  return { year: now.getUTCFullYear(), month: now.getUTCMonth() };
}

function monthKey(year: number, month: number): string {
  const d = new Date(Date.UTC(year, month, 1));
  return d.toISOString().slice(0, 7);
}

const IMPACT_RANK: Record<IncidentImpact, number> = { none: 0, minor: 1, major: 2, critical: 3 };

const RING: Record<IncidentImpact | "maintenance", string> = {
  maintenance: "border-muted-foreground text-foreground",
  none: "border-muted-foreground text-foreground",
  minor: "border-warning text-foreground",
  major: "border-warning text-foreground",
  critical: "border-destructive text-foreground",
};

function worstByDay(incidents: StatusIncident[]): Map<string, IncidentImpact | "maintenance"> {
  const out = new Map<string, IncidentImpact | "maintenance">();
  for (const incident of incidents) {
    const day = (incident.scheduledStart ?? incident.createdAt).slice(0, 10);
    const current = out.get(day);
    if (incident.kind === "maintenance") {
      if (!current) out.set(day, "maintenance");
      continue;
    }
    if (
      !current ||
      current === "maintenance" ||
      IMPACT_RANK[incident.impact] > IMPACT_RANK[current]
    ) {
      out.set(day, incident.impact);
    }
  }
  return out;
}

async function HistoryContent({
  searchParams,
  t,
}: {
  searchParams: Search;
  t: (key: string) => string;
}) {
  await connection();
  const now = new Date();
  const { month: raw } = await searchParams;
  const { year, month } = parseMonth(raw, now);
  const key = monthKey(year, month);
  const all = await listIncidents();
  const inMonth = all.filter((i) => (i.scheduledStart ?? i.createdAt).startsWith(key));
  const marks = worstByDay(inMonth);

  const first = new Date(Date.UTC(year, month, 1));
  const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const lead = (first.getUTCDay() + 6) % 7; // Monday first
  const cells: Array<number | null> = [
    ...Array.from({ length: lead }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const label = new Intl.DateTimeFormat("en", {
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(first);
  const prev = monthKey(year, month - 1);
  const next = monthKey(year, month + 1);
  const hasNext = next <= now.toISOString().slice(0, 7);
  const today = now.toISOString().slice(0, 10);

  return (
    <StatusShell>
      <Link
        href="/status"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft aria-hidden className="h-4 w-4" />
        {t("backToStatus")}
      </Link>

      <section
        className="mt-6 overflow-hidden rounded-xl border border-border"
        aria-label={t("calendar")}
      >
        <div className="flex items-center gap-3 border-b border-border px-5 py-4">
          <h1 className="text-lg font-medium tracking-tight">{t("calendar")}</h1>
          <nav className="flex items-center gap-1 text-sm tabular-nums text-muted-foreground">
            <Link
              href={`/status/history?month=${prev}`}
              aria-label={t("previousMonth")}
              className="rounded p-0.5 hover:text-foreground"
            >
              <ChevronLeft aria-hidden className="h-4 w-4" />
            </Link>
            <span>{label}</span>
            {hasNext ? (
              <Link
                href={`/status/history?month=${next}`}
                aria-label={t("nextMonth")}
                className="rounded p-0.5 hover:text-foreground"
              >
                <ChevronRight aria-hidden className="h-4 w-4" />
              </Link>
            ) : (
              <span className="p-0.5 opacity-40">
                <ChevronRight aria-hidden className="h-4 w-4" />
              </span>
            )}
          </nav>
        </div>
        <div className="grid grid-cols-7 text-center text-sm">
          {[
            t("weekdays.mon"),
            t("weekdays.tue"),
            t("weekdays.wed"),
            t("weekdays.thu"),
            t("weekdays.fri"),
            t("weekdays.sat"),
            t("weekdays.sun"),
          ].map((d, i) => (
            <div
              key={`${d}-${i}`}
              className="border-b border-border py-3 text-xs text-muted-foreground"
            >
              {d}
            </div>
          ))}
          {cells.map((day, i) => {
            const date = day ? `${key}-${String(day).padStart(2, "0")}` : null;
            const mark = date ? marks.get(date) : undefined;
            return (
              <div
                key={date ?? `blank-${i}`}
                className={cn(
                  "flex h-14 items-center justify-center border-border tabular-nums",
                  i % 7 !== 6 && "border-r",
                  i < cells.length - 7 && "border-b",
                )}
              >
                {day ? (
                  <span
                    className={cn(
                      "flex h-8 w-8 items-center justify-center rounded-full",
                      mark ? cn("border-2", RING[mark]) : "text-muted-foreground",
                      date === today && !mark && "font-semibold text-foreground",
                    )}
                    title={
                      mark
                        ? `${date}: ${mark === "maintenance" ? "maintenance" : `${mark} incident`}`
                        : undefined
                    }
                  >
                    {day}
                  </span>
                ) : null}
              </div>
            );
          })}
        </div>
      </section>

      <section className="mt-8" aria-labelledby="month-incidents">
        <h2 id="month-incidents" className="mb-3 text-lg font-medium tracking-tight">
          {label}
        </h2>
        {inMonth.length === 0 ? (
          <p className="rounded-xl border border-border px-5 py-6 text-sm text-muted-foreground">
            {t("nothingToReport")}
          </p>
        ) : (
          <IncidentList incidents={inMonth} />
        )}
      </section>
    </StatusShell>
  );
}
