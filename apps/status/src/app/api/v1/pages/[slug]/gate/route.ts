/**
 * Deploy gate for CI: `?components=a,b&since=<RFC3339>&coverage=synthetic`.
 * 200 `{ pass: true }` only when every listed component has fresh,
 * non-failing evidence of that coverage checked at or after `since`;
 * otherwise 412 with the reason per component.
 *
 * Pages are public, so anonymous callers may gate on public components. A
 * `status:read` key of the page's workspace may also gate on internal ones.
 */
import { authenticateApiKey } from "@/server/auth";
import { getDb } from "@/server/db";
import type { EvidenceCoverage } from "@/server/evaluate";
import { findPage, json, problem, type RouteContext } from "@/server/http";
import { evaluateGate } from "@/server/public-api";
import { buildPageSnapshot } from "@/server/snapshot";

export const runtime = "nodejs";

const COVERAGES: EvidenceCoverage[] = ["dependency", "synthetic", "device", "upstream", "manual"];

export async function GET(request: Request, context: RouteContext<{ slug: string }>) {
  const { slug } = await context.params;
  const url = new URL(request.url);
  const keys = (url.searchParams.get("components") ?? "")
    .split(",")
    .map((k) => k.trim())
    .filter(Boolean);
  if (keys.length === 0 || keys.length > 100) {
    return problem(400, "invalid_components", "List 1–100 component keys in ?components=a,b");
  }
  const coverage = (url.searchParams.get("coverage") ?? "synthetic") as EvidenceCoverage;
  if (!COVERAGES.includes(coverage)) return problem(400, "invalid_coverage");
  const sinceRaw = url.searchParams.get("since");
  const since = sinceRaw ? new Date(sinceRaw) : null;
  if (sinceRaw && (!/^\d{4}-\d{2}-\d{2}T/.test(sinceRaw) || Number.isNaN(since?.getTime()))) {
    return problem(400, "invalid_since", "since must be an RFC 3339 timestamp");
  }

  const db = getDb();
  const page = await findPage(db, slug);
  if (!page) return problem(404, "page_not_found");
  let includeInternal = false;
  const authorization = request.headers.get("authorization");
  if (authorization) {
    const key = await authenticateApiKey(db, authorization, "status:read");
    if (!key) return problem(401, "unauthorized");
    if (key.workspaceId !== page.workspaceId) return problem(403, "forbidden");
    includeInternal = true;
  }
  const snapshot = await buildPageSnapshot(db, { id: page.id }, { includeInternal });
  if (!snapshot) return problem(404, "page_not_found");
  const result = evaluateGate(snapshot, keys, coverage, since);
  return json(result, { status: result.pass ? 200 : 412 });
}
