import { getArticles } from "@/lib/articles";
import { projects } from "@/lib/projects";
// One origin literal for the whole app — see src/lib/seo/alternates.ts.
import { BASE_URL } from "@/lib/seo/alternates";

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export function GET() {
  try {
    const articles = getArticles();
    const buildDate = new Date().toUTCString();

    const articleItems = articles.map(
      (a) => `
    <item>
      <title>${escapeXml(a.title)}</title>
      <link>${BASE_URL}/thinking/${a.slug}</link>
      <description>${escapeXml(a.excerpt)}</description>
      <pubDate>${new Date(a.date).toUTCString()}</pubDate>
      <guid isPermaLink="true">${BASE_URL}/thinking/${a.slug}</guid>
      <author>tseka@tsekaluk.dev (Tseka Luk)</author>
      ${a.tags.map((tag) => `<category>${escapeXml(tag)}</category>`).join("\n      ")}
    </item>`,
    );

    const projectItems = projects.slice(0, 5).map(
      (p) => `
    <item>
      <title>${escapeXml(p.name)} — ${escapeXml(p.tagline)}</title>
      <link>${BASE_URL}/work/${p.slug}</link>
      <description>${escapeXml(p.description)}</description>
      <pubDate>${buildDate}</pubDate>
      <guid isPermaLink="true">${BASE_URL}/work/${p.slug}</guid>
    </item>`,
    );

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Tseka Luk — AI-Native Builder</title>
    <link>${BASE_URL}</link>
    <description>Essays, projects, and updates from Tseka Luk.</description>
    <language>en</language>
    <atom:link href="${BASE_URL}/rss.xml" rel="self" type="application/rss+xml"/>
    <lastBuildDate>${buildDate}</lastBuildDate>
    ${articleItems.join("")}
    ${projectItems.join("")}
  </channel>
</rss>`;

    return new Response(xml, {
      headers: {
        "Content-Type": "application/rss+xml; charset=utf-8",
        "Cache-Control": "s-maxage=3600, stale-while-revalidate",
      },
    });
  } catch (_err) {
    return new Response("Internal server error", { status: 500 });
  }
}
