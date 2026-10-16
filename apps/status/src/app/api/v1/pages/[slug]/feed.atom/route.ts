/** Atom 1.0 feed of the page's incidents and maintenance. */
import { getDb } from "@/server/db";
import { atomFeed } from "@/server/feeds";
import { problem, publicPageUrl, type RouteContext } from "@/server/http";
import { buildPageSnapshot } from "@/server/snapshot";

export const runtime = "nodejs";

export async function GET(request: Request, context: RouteContext<{ slug: string }>) {
  const { slug } = await context.params;
  const snapshot = await buildPageSnapshot(getDb(), { slug });
  if (!snapshot) return problem(404, "page_not_found");
  const body = atomFeed(snapshot, publicPageUrl(request, slug), request.url);
  return new Response(body, {
    headers: {
      "content-type": "application/atom+xml; charset=utf-8",
      "cache-control": "public, s-maxage=60, stale-while-revalidate=300",
    },
  });
}
