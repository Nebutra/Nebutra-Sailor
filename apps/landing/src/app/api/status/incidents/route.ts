import { NextResponse } from "next/server";
import {
  createIncident,
  createIncidentInputSchema,
  listIncidents,
  updateIncident,
  updateIncidentInputSchema,
} from "@/lib/status-incidents";

/**
 * Minimal incident write surface for self-hosted status.
 *
 * GET  — public list (same data as the status page history feed)
 * POST — create or update; requires STATUS_ADMIN_TOKEN bearer/header
 *
 * Auth deliberately simple (shared secret). This is an ops escape hatch,
 * not a multi-user CMS. Prefer rotating the token via env.
 */

// Note: do not set `export const runtime` — incompatible with nextConfig.cacheComponents.

function unauthorized(): NextResponse {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

function isAuthorized(request: Request): boolean {
  const expected = process.env.STATUS_ADMIN_TOKEN;
  if (!expected) return false;

  const header = request.headers.get("authorization");
  if (header?.startsWith("Bearer ") && header.slice(7) === expected) return true;
  if (request.headers.get("x-status-admin-token") === expected) return true;
  return false;
}

export async function GET() {
  const incidents = await listIncidents();
  return NextResponse.json({ incidents }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request) {
  if (!process.env.STATUS_ADMIN_TOKEN) {
    return NextResponse.json(
      {
        error:
          "STATUS_ADMIN_TOKEN is not configured. Set it in the landing app env to enable writes.",
      },
      { status: 503 },
    );
  }
  if (!isAuthorized(request)) return unauthorized();

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  // Update path when `id` is present
  if (body && typeof body === "object" && "id" in body && (body as { id?: string }).id) {
    const parsed = updateIncidentInputSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 422 },
      );
    }
    const updated = await updateIncident(parsed.data);
    if (!updated) {
      return NextResponse.json({ error: "Incident not found" }, { status: 404 });
    }
    return NextResponse.json({ incident: updated });
  }

  const parsed = createIncidentInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 422 },
    );
  }
  const incident = await createIncident(parsed.data);
  return NextResponse.json({ incident }, { status: 201 });
}
