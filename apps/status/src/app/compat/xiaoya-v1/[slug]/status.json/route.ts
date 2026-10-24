/** Compat profile `xiaoya-v1`: 小芽's PublicStatusResp, for any page. */
import { xiaoyaResponse } from "@/server/compat/xiaoya-v1";
import { getDb } from "@/server/db";
import { problem, publicPageUrl, type RouteContext } from "@/server/http";
import { buildPageSnapshot } from "@/server/snapshot";

export const runtime = "nodejs";

export async function GET(request: Request, context: RouteContext<{ slug: string }>) {
  const { slug } = await context.params;
  const snapshot = await buildPageSnapshot(getDb(), { slug });
  if (!snapshot) return problem(404, "page_not_found");
  return xiaoyaResponse(snapshot, publicPageUrl(request, slug));
}
