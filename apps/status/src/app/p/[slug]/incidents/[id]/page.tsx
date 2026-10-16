import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { IncidentView } from "@/components/incident-view";
import { PageShell } from "@/components/page-shell";
import { adoptLangParam, loadSnapshotOr404 } from "@/components/routes";
import { getIncident, getSnapshot } from "@/lib/data";
import type { IncidentProps } from "@/lib/page-params";
import { requestLocale, requestTimeZone } from "@/lib/request-locale";
import type { PageSnapshot, SnapshotIncident } from "@/server/snapshot";

export const dynamic = "force-dynamic";

async function find(snapshot: PageSnapshot, id: string): Promise<SnapshotIncident | null> {
  const inWindow = [
    ...snapshot.recentIncidents,
    ...snapshot.maintenance,
    ...snapshot.activeIncidents,
  ].find((i) => i.id === id);
  return inWindow ?? getIncident(snapshot.page.id, id, snapshot.generatedAt);
}

export async function generateMetadata({ params }: IncidentProps): Promise<Metadata> {
  const { slug, id } = await params;
  const snapshot = await getSnapshot(slug);
  if (!snapshot) return {};
  const incident = await find(snapshot, id);
  return incident ? { title: `${incident.title} · ${snapshot.page.title}` } : {};
}

export default async function IncidentPage({ params, searchParams }: IncidentProps) {
  const { slug, id } = await params;
  const path = `/p/${slug}/incidents/${id}`;
  adoptLangParam(await searchParams, path);
  const snapshot = await loadSnapshotOr404(slug);
  const incident = await find(snapshot, id);
  if (!incident) notFound();
  const [locale, timeZone] = await Promise.all([
    requestLocale(undefined, snapshot.page.locales),
    requestTimeZone(),
  ]);
  return (
    <PageShell locale={locale} page={snapshot.page} path={path}>
      <IncidentView
        incident={incident}
        components={snapshot.components}
        slug={slug}
        now={snapshot.generatedAt}
        locale={locale}
        timeZone={timeZone}
      />
    </PageShell>
  );
}
