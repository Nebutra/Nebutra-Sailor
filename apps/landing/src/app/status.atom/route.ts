import { brand } from "@nebutra/brand/metadata";
import { incidentUrl, listIncidents } from "@nebutra/status";
import { statusOrigin } from "@/lib/status-checks";

/** Atom feed of incidents and maintenance — one entry per incident, latest update as content. */

function escape(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export async function GET() {
  const incidents = (await listIncidents()).slice(0, 50);
  const origin = statusOrigin();
  const updated = incidents[0]?.updatedAt ?? new Date(0).toISOString();

  const entries = incidents
    .map((incident) => {
      const url = incidentUrl(incident, origin);
      const body = [...incident.updates]
        .reverse()
        .map(
          (u) =>
            `<p><strong>${escape(u.status)}</strong> — ${escape(u.at)}<br/>${escape(u.message)}</p>`,
        )
        .join("");
      return `  <entry>
    <id>${escape(url)}</id>
    <title>${escape(incident.title)}</title>
    <link href="${escape(url)}"/>
    <published>${incident.createdAt}</published>
    <updated>${incident.updatedAt}</updated>
    <content type="html">${escape(body)}</content>
  </entry>`;
    })
    .join("\n");

  const xml = `<?xml version="1.0" encoding="utf-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <id>${origin}/</id>
  <title>${escape(brand.name)} Status</title>
  <link href="${origin}/"/>
  <link rel="self" href="${origin}/status.atom"/>
  <updated>${updated}</updated>
${entries}
</feed>
`;
  return new Response(xml, {
    headers: {
      "content-type": "application/atom+xml; charset=utf-8",
      "cache-control": "public, max-age=60",
    },
  });
}
