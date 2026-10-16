/** Public status of a page, as the native versioned JSON document. */
import { getDb } from "@/server/db";
import { json, problem, publicPageUrl, type RouteContext } from "@/server/http";
import { statusJson } from "@/server/public-api";
import { buildPageSnapshot } from "@/server/snapshot";

export const runtime = "nodejs";

export async function GET(request: Request, context: RouteContext<{ slug: string }>) {
  const { slug } = await context.params;
  const snapshot = await buildPageSnapshot(getDb(), { slug });
  if (!snapshot) return problem(404, "page_not_found");
  return json(statusJson(snapshot, publicPageUrl(request, slug)), {
    headers: { "cache-control": "public, s-maxage=15, stale-while-revalidate=60" },
  });
}
