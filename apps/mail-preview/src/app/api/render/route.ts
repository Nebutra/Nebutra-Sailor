/**
 * POST /api/render
 *
 * Body: { templateId: string, props: Record<string, unknown> }
 * Returns: { subject, html, plainText } | { error }
 *
 * Used by the live preview UI to re-render templates as the user edits props.
 * Server-only — keeps email package internals out of the client bundle.
 */

import { NextResponse } from "next/server";
import { renderTemplate } from "@/lib/render";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface RenderRequestBody {
  templateId: string;
  props: Record<string, unknown>;
}

function isRenderRequestBody(value: unknown): value is RenderRequestBody {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  return typeof v.templateId === "string" && typeof v.props === "object" && v.props !== null;
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!isRenderRequestBody(body)) {
    return NextResponse.json(
      { error: "Body must match { templateId: string, props: object }" },
      { status: 400 },
    );
  }

  try {
    const rendered = renderTemplate(body.templateId, body.props);
    return NextResponse.json(rendered);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown render error";
    return NextResponse.json({ error: message }, { status: 422 });
  }
}
