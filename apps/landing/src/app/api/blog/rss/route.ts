import { brand } from "@nebutra/brand/metadata";
import { getBrandOrigin } from "@nebutra/brand/metadata-helpers";
import { getAllPosts } from "@/lib/blog";

// Cache lifetime is the Cache-Control header below, not a route segment
// config: `revalidate` is rejected outright under cacheComponents, and this
// handler already states the same thing in the response it returns.

/**
 * Blog RSS 2.0 feed (visibility G51).
 * Changelog already has /api/changelog/rss — this is the post index feed.
 */
export async function GET() {
  const base = getBrandOrigin("landing").replace(/\/$/, "");
  const posts = await getAllPosts("en");
  const items = posts
    .slice(0, 50)
    .map((post) => {
      const link = `${base}/en/blog/${post.slug}`;
      const title = escapeXml(post.title ?? post.slug);
      const desc = escapeXml(post.excerpt ?? post.description ?? "");
      // BlogPostBase exposes `date` (published) and `updatedAt`; `publishedAt`
      // and `_updatedAt` are raw Sanity document fields, renamed on mapping.
      const pub = post.date ?? post.updatedAt;
      const pubDate = pub ? new Date(pub).toUTCString() : new Date().toUTCString();
      return `    <item>
      <title>${title}</title>
      <link>${link}</link>
      <guid isPermaLink="true">${link}</guid>
      <pubDate>${pubDate}</pubDate>
      <description>${desc}</description>
    </item>`;
    })
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${brand.name} Blog</title>
    <link>${base}/en/blog</link>
    <description>Engineering and product writing from ${brand.name}</description>
    <language>en</language>
    <atom:link href="${base}/api/blog/rss" rel="self" type="application/rss+xml"/>
${items}
  </channel>
</rss>`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
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
