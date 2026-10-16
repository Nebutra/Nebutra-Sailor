/**
 * `GET /api/v1/status` — the root path a compat profile takes over. With
 * STATUS_COMPAT_ROOT=xiaoya-v1 this serves STATUS_DEFAULT_PAGE in 小芽's
 * shape, so a reverse proxy can point the old path here unchanged.
 */
import { xiaoyaResponse } from "@/server/compat/xiaoya-v1";
import { getDb } from "@/server/db";
import { problem, publicPageUrl } from "@/server/http";
import { buildPageSnapshot } from "@/server/snapshot";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const profile = process.env.STATUS_COMPAT_ROOT?.trim();
  const slug = process.env.STATUS_DEFAULT_PAGE?.trim();
  if (profile !== "xiaoya-v1" || !slug) return problem(404, "not_found");
  const snapshot = await buildPageSnapshot(getDb(), { slug });
  if (!snapshot) return problem(404, "page_not_found");
  return xiaoyaResponse(snapshot, publicPageUrl(request, slug));
}
