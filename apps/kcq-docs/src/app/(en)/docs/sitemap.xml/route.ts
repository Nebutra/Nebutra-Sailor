import { sitemapXml } from "@/lib/sitemap";

export const dynamic = "force-static";
export function GET() {
  return new Response(sitemapXml(), {
    headers: { "Content-Type": "application/xml; charset=utf-8" },
  });
}
