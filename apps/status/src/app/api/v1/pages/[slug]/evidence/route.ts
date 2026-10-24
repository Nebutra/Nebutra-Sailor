/**
 * Push evidence: one reading, or `{ readings: [...] }` of up to 100. Needs an
 * API key with `evidence:write` for the page's workspace.
 */
import { z } from "zod";
import { getDb } from "@/server/db";
import { evidenceInputSchema, pushEvidence } from "@/server/evidence";
import { authorize, findPage, json, problem, type RouteContext, readJson } from "@/server/http";

export const runtime = "nodejs";

const MAX_READINGS = 100;
const batchSchema = z.object({ readings: z.array(z.unknown()).min(1).max(MAX_READINGS) });

export async function POST(request: Request, context: RouteContext<{ slug: string }>) {
  const { slug } = await context.params;
  const db = getDb();
  const page = await findPage(db, slug);
  if (!page) return problem(404, "page_not_found");
  // Machines only: a browser session cannot push evidence.
  if (!request.headers.get("authorization")) return problem(401, "unauthorized");
  const caller = await authorize(db, request, page.workspaceId, ["evidence:write"]);
  if (caller instanceof Response) return caller;

  const parsed = await readJson(request);
  if (!parsed.ok) return problem(400, "invalid_json");
  const body = parsed.body;
  const isBatch = typeof body === "object" && body !== null && "readings" in body;
  let raw: unknown[];
  if (isBatch) {
    const batch = batchSchema.safeParse(body);
    if (!batch.success) {
      return problem(422, "invalid_evidence", { issues: batch.error.issues });
    }
    raw = batch.data.readings;
  } else {
    raw = [body];
  }

  const readings = [];
  const issues = [];
  for (const [index, reading] of raw.entries()) {
    const result = evidenceInputSchema.safeParse(reading);
    if (result.success) readings.push(result.data);
    else issues.push({ index, issues: result.error.issues });
  }
  if (issues.length > 0) return problem(422, "invalid_evidence", { readings: issues });

  const results = [];
  for (const [index, reading] of readings.entries()) {
    const outcome = await pushEvidence(db, page.id, reading);
    if ("error" in outcome) {
      results.push({ index, component: reading.component, status: 404, error: outcome.error });
    } else {
      results.push({
        index,
        component: reading.component,
        status: 202,
        changed: outcome.change !== null,
        ...(outcome.change ? { from: outcome.change.from, to: outcome.change.to } : {}),
      });
    }
  }
  const accepted = results.filter((r) => r.status === 202).length;
  const status = accepted === results.length ? 202 : accepted === 0 ? 404 : 207;
  return json({ accepted, rejected: results.length - accepted, results }, { status });
}
