import { brand } from "@nebutra/brand/metadata";
import { getBrandOrigin } from "@nebutra/brand/metadata-helpers";
import { getAllPosts } from "@/lib/blog";

// Cache lifetime is the Cache-Control header below, not a route segment
// config: `revalidate` is rejected outright under cacheComponents, and this
// handler already states the same thing in the response it returns.

/** JSON Feed 1.1 (G52). */
export async function GET() {
  const base = getBrandOrigin("landing").replace(/\/$/, "");
  const posts = await getAllPosts("en");
  const feed = {
    version: "https://jsonfeed.org/version/1.1",
    title: `${brand.name} Blog`,
    home_page_url: `${base}/en/blog`,
    feed_url: `${base}/api/blog/feed.json`,
    language: "en",
    items: posts.slice(0, 50).map((post) => ({
      id: `${base}/en/blog/${post.slug}`,
      url: `${base}/en/blog/${post.slug}`,
      title: post.title ?? post.slug,
      summary: post.excerpt ?? post.description ?? "",
      date_published: post.date ?? post.updatedAt,
    })),
  };

  return Response.json(feed, {
    headers: {
      "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
