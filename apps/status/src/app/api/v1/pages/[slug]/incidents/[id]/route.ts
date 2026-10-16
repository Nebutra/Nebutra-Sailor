/** Update an incident: status, message, impact, title or affected components. */
import { ZodError } from "zod";
import { getDb } from "@/server/db";
import { authorize, findPage, json, problem, type RouteContext, readJson } from "@/server/http";
import { IncidentError, updateIncident } from "@/server/incidents";
import { incidentJson } from "@/server/public-api";
import { toSnapshotIncident } from "@/server/snapshot";

export const runtime = "nodejs";

export async function PATCH(request: Request, context: RouteContext<{ slug: string; id: string }>) {
  const { slug, id } = await context.params;
  const db = getDb();
  const page = await findPage(db, slug);
  if (!page) return problem(404, "page_not_found");
  const caller = await authorize(db, request, page.workspaceId, ["incidents:write"]);
  if (caller instanceof Response) return caller;

  const parsed = await readJson(request);
  if (!parsed.ok) return problem(400, "invalid_json");
  try {
    const row = await updateIncident(db, page.id, id, parsed.body as never);
    if (!row) return problem(404, "incident_not_found");
    return json({ incident: incidentJson(toSnapshotIncident(row, new Date())) });
  } catch (error) {
    if (error instanceof ZodError)
      return problem(422, "invalid_incident", { issues: error.issues });
    if (error instanceof IncidentError) return problem(422, "invalid_incident", error.message);
    throw error;
  }
}
