/**
 * Atom 1.0 and RSS 2.0 feeds of a page's incidents and maintenance. One entry
 * per incident, its content the timeline so far, newest update first.
 */
import type { PageSnapshot, SnapshotIncident } from "./snapshot";

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/** Every incident the snapshot knows, once each, most recently updated first. */
export function feedIncidents(snapshot: PageSnapshot): SnapshotIncident[] {
  const byId = new Map<string, SnapshotIncident>();
  for (const i of [
    ...snapshot.activeIncidents,
    ...snapshot.maintenance,
    ...snapshot.recentIncidents,
  ]) {
    byId.set(i.id, i);
  }
  return [...byId.values()]
    .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
    .slice(0, 50);
}

function entryTitle(i: SnapshotIncident): string {
  const prefix = i.kind === "maintenance" ? "[Maintenance] " : "";
  return `${prefix}${i.title}`;
}

function entryHtml(i: SnapshotIncident): string {
  const lines: string[] = [];
  if (i.kind === "maintenance" && i.scheduledStart && i.scheduledEnd) {
    lines.push(
      `<p><strong>Scheduled</strong> ${i.scheduledStart.toISOString()} – ${i.scheduledEnd.toISOString()}</p>`,
    );
  }
  if (i.componentKeys.length > 0) {
    lines.push(`<p><strong>Affects</strong> ${escapeXml(i.componentKeys.join(", "))}</p>`);
  }
  for (const u of [...i.updates].reverse()) {
    lines.push(
      `<p><small>${u.createdAt.toISOString()}</small><br><strong>${escapeXml(u.status)}</strong> — ${escapeXml(u.message)}</p>`,
    );
  }
  return lines.join("\n");
}

function feedUpdated(snapshot: PageSnapshot, entries: SnapshotIncident[]): Date {
  return entries[0]?.updatedAt ?? snapshot.generatedAt;
}

export function atomFeed(snapshot: PageSnapshot, pageUrl: string, selfUrl: string): string {
  const entries = feedIncidents(snapshot);
  const items = entries
    .map(
      (i) => `  <entry>
    <id>${escapeXml(`${pageUrl}#incident-${i.id}`)}</id>
    <title>${escapeXml(entryTitle(i))}</title>
    <link rel="alternate" type="text/html" href="${escapeXml(`${pageUrl}#incident-${i.id}`)}"/>
    <published>${i.createdAt.toISOString()}</published>
    <updated>${i.updatedAt.toISOString()}</updated>
    <category term="${i.kind}"/>
    <content type="html">${escapeXml(entryHtml(i))}</content>
  </entry>`,
    )
    .join("\n");
  return `<?xml version="1.0" encoding="utf-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <id>${escapeXml(pageUrl)}</id>
  <title>${escapeXml(snapshot.page.title)}</title>
  ${snapshot.page.description ? `<subtitle>${escapeXml(snapshot.page.description)}</subtitle>\n  ` : ""}<link rel="alternate" type="text/html" href="${escapeXml(pageUrl)}"/>
  <link rel="self" type="application/atom+xml" href="${escapeXml(selfUrl)}"/>
  <updated>${feedUpdated(snapshot, entries).toISOString()}</updated>
  <author><name>${escapeXml(snapshot.page.title)}</name></author>
  <generator>Nebutra Status</generator>
${items}${items ? "\n" : ""}</feed>
`;
}

export function rssFeed(snapshot: PageSnapshot, pageUrl: string, selfUrl: string): string {
  const entries = feedIncidents(snapshot);
  const items = entries
    .map(
      (i) => `    <item>
      <guid isPermaLink="false">${escapeXml(`${snapshot.page.slug}:incident:${i.id}`)}</guid>
      <title>${escapeXml(entryTitle(i))}</title>
      <link>${escapeXml(`${pageUrl}#incident-${i.id}`)}</link>
      <pubDate>${i.createdAt.toUTCString()}</pubDate>
      <category>${i.kind}</category>
      <description>${escapeXml(entryHtml(i))}</description>
    </item>`,
    )
    .join("\n");
  return `<?xml version="1.0" encoding="utf-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escapeXml(snapshot.page.title)}</title>
    <link>${escapeXml(pageUrl)}</link>
    <description>${escapeXml(snapshot.page.description ?? `${snapshot.page.title} incidents and maintenance`)}</description>
    <atom:link href="${escapeXml(selfUrl)}" rel="self" type="application/rss+xml"/>
    <lastBuildDate>${feedUpdated(snapshot, entries).toUTCString()}</lastBuildDate>
    <generator>Nebutra Status</generator>
${items}${items ? "\n" : ""}  </channel>
</rss>
`;
}
