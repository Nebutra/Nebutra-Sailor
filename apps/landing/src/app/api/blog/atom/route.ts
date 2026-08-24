import { brand } from "@nebutra/brand/metadata";
import { getBrandOrigin } from "@nebutra/brand/metadata-helpers";
import { getAllPosts } from "@/lib/blog";

// Cache lifetime is the Cache-Control header below, not a route segment
// config: `revalidate` is rejected outright under cacheComponents, and this
// handler already states the same thing in the response it returns.

/** Blog Atom feed (G51/G52 discovery). */
export async function GET() {
  const base = getBrandOrigin("landing").replace(/\/$/, "");
  const posts = await getAllPosts("en");
  const entries = posts
    .slice(0, 50)
    .map((post) => {
      // English is the unprefixed default under `localePrefix: "as-needed"`;
      // `/en/blog/...` is a 308 away from the canonical the sitemap publishes.
      const link = `${base}/blog/${post.slug}`;
      const title = escapeXml(post.title ?? post.slug);
      const summary = escapeXml(post.excerpt ?? post.description ?? "");
      const updated = post.updatedAt ?? post.date ?? new Date().toISOString();
      return `  <entry>
    <title>${title}</title>
    <link href="${link}"/>
    <id>${link}</id>
    <updated>${new Date(updated).toISOString()}</updated>
    <summary>${summary}</summary>
  </entry>`;
    })
    .join("\n");

  const xml = `<?xml version="1.0" encoding="utf-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <title>${brand.name} Blog</title>
  <link href="${base}/blog"/>
  <link rel="self" href="${base}/api/blog/atom"/>
  <id>${base}/blog</id>
  <updated>${new Date().toISOString()}</updated>
${entries}
</feed>`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/atom+xml; charset=utf-8",
      "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
