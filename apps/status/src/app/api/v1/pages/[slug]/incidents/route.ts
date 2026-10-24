/**
 * Incidents and maintenance of a page. An API key with `incidents:write`, or
 * a signed-in editor (or above) of the page's workspace.
 */
import { ZodError } from "zod";
import { getDb } from "@/server/db";
import { authorize, findPage, json, problem, type RouteContext, readJson } from "@/server/http";
import { createIncident, IncidentError } from "@/server/incidents";
import { incidentJson } from "@/server/public-api";
import { toSnapshotIncident } from "@/server/snapshot";

export const runtime = "nodejs";

const include = {
  updates: { orderBy: { createdAt: "asc" as const } },
  components: { include: { component: { select: { key: true } } } },
};

export async function GET(request: Request, context: RouteContext<{ slug: string }>) {
  const { slug } = await context.params;
  const db = getDb();
  const page = await findPage(db, slug);
  if (!page) return problem(404, "page_not_found");
  const caller = await authorize(db, request, page.workspaceId, ["incidents:write", "status:read"]);
  if (caller instanceof Response) return caller;

  const url = new URL(request.url);
  const open = url.searchParams.get("status") === "open";
  const limit = Math.min(200, Math.max(1, Number(url.searchParams.get("limit")) || 50));
  const rows = await db.incident.findMany({
    where: { pageId: page.id, ...(open ? { status: { not: "resolved" } } : {}) },
    orderBy: { createdAt: "desc" },
    take: limit,
    include,
  });
  const now = new Date();
  return json({ incidents: rows.map((row) => incidentJson(toSnapshotIncident(row, now))) });
}

export async function POST(request: Request, context: RouteContext<{ slug: string }>) {
  const { slug } = await context.params;
  const db = getDb();
  const page = await findPage(db, slug);
  if (!page) return problem(404, "page_not_found");
  const caller = await authorize(db, request, page.workspaceId, ["incidents:write"]);
  if (caller instanceof Response) return caller;

  const parsed = await readJson(request);
  if (!parsed.ok) return problem(400, "invalid_json");
  try {
    const created = await createIncident(db, page, parsed.body as never);
    const row = await db.incident.findUniqueOrThrow({ where: { id: created.id }, include });
    return json({ incident: incidentJson(toSnapshotIncident(row, new Date())) }, { status: 201 });
  } catch (error) {
    if (error instanceof ZodError)
      return problem(422, "invalid_incident", { issues: error.issues });
    if (error instanceof IncidentError) return problem(422, "invalid_incident", error.message);
    throw error;
  }
}
