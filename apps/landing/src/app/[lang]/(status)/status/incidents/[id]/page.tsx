import { ChevronLeft } from "@nebutra/icons";
import { getIncident, maintenancePhase } from "@nebutra/status";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { setRequestLocale } from "next-intl/server";
import { Suspense } from "react";
import {
  formatDuration,
  impactLabel,
  incidentStatusLabel,
  StatusPageSkeleton,
  StatusShell,
  serviceNames,
} from "@/components/status/status-page-view";
import { formatUtcMedium } from "@/components/status/status-vocabulary";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { getServiceTargets } from "@/lib/status-checks";

type Params = Promise<{ lang: string; id: string }>;

/**
 * Incident ids are unbounded, so the route shell renders on demand (blocking)
 * instead of prerendering a fallback shell; the site nav reads the pathname,
 * which a fallback shell cannot provide outside <Suspense>. The incident itself
 * still streams behind the boundary below.
 */
export const instant = false;

export const metadata: Metadata = {
  title: "Incident",
  robots: { index: false },
};

export default async function IncidentPage({ params }: { params: Params }) {
  const { lang } = await params;
  setRequestLocale(lang as Locale);
  return (
    <Suspense fallback={<StatusPageSkeleton />}>
      <IncidentContent params={params} />
    </Suspense>
  );
}

const PHASE_LABEL = {
  scheduled: "Scheduled",
  in_progress: "In progress",
  completed: "Completed",
} as const;

async function IncidentContent({ params }: { params: Params }) {
  await connection();
  const { id } = await params;
  const incident = await getIncident(id);
  if (!incident) notFound();

  const isMaintenance = incident.kind === "maintenance";
  const state = isMaintenance
    ? PHASE_LABEL[maintenancePhase(incident)]
    : incidentStatusLabel[incident.status];
  const affected = serviceNames(incident.affectedServiceIds, getServiceTargets());
  const updates = [...incident.updates].reverse();

  return (
    <StatusShell>
      <Link
        href="/status"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft aria-hidden className="h-4 w-4" />
        Back to status
      </Link>

      <header className="mt-6">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
          {incident.title}
        </h1>
        <dl className="mt-5 grid grid-cols-2 gap-4 rounded-xl border border-border px-5 py-4 text-sm sm:grid-cols-4">
          <Meta term="Status" value={state} />
          <Meta
            term={isMaintenance ? "Type" : "Impact"}
            value={isMaintenance ? "Maintenance" : impactLabel[incident.impact]}
          />
          <Meta
            term="Started"
            value={formatUtcMedium(incident.scheduledStart ?? incident.createdAt)}
          />
          <Meta term="Duration" value={formatDuration(incident)} />
        </dl>
        {affected ? (
          <p className="mt-3 text-sm text-muted-foreground">Affected: {affected}</p>
        ) : null}
      </header>

      <section className="mt-10" aria-labelledby="incident-updates">
        <h2 id="incident-updates" className="text-lg font-medium tracking-tight">
          Updates
        </h2>
        <ol className="relative mt-5 border-l border-border pl-6">
          {updates.map((update) => (
            <li key={`${update.at}-${update.status}`} className="relative pb-8 last:pb-0">
              <span
                aria-hidden
                className="absolute -left-[29px] top-1.5 h-2.5 w-2.5 rounded-full border-2 border-background bg-foreground/70"
              />
              <p className="text-sm font-medium text-foreground">
                {incidentStatusLabel[update.status] ?? update.status}
              </p>
              <time dateTime={update.at} className="text-xs tabular-nums text-muted-foreground">
                {formatUtcMedium(update.at)}
              </time>
              <p className="mt-2 whitespace-pre-line text-base leading-7 text-foreground">
                {update.message}
              </p>
            </li>
          ))}
        </ol>
      </section>
    </StatusShell>
  );
}

function Meta({ term, value }: { term: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-muted-foreground">{term}</dt>
      <dd className="mt-0.5 truncate font-medium text-foreground">{value}</dd>
    </div>
  );
}
