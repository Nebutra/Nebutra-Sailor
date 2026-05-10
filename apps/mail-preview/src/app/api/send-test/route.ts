/**
 * POST /api/send-test  — DEV ONLY
 *
 * Body: { templateId: string, props: Record<string, unknown>, to: string }
 *
 * Renders the requested template and dispatches it through the project's
 * @nebutra/email provider. Gated behind `NODE_ENV !== "production"` so the
 * route is a 404 in prod builds.
 */

import { getEmailProvider } from "@nebutra/email";
import { NextResponse } from "next/server";
import { renderTemplate } from "@/lib/render";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface SendTestBody {
  templateId: string;
  props: Record<string, unknown>;
  to: string;
}

function isSendTestBody(value: unknown): value is SendTestBody {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.templateId === "string" &&
    typeof v.to === "string" &&
    typeof v.props === "object" &&
    v.props !== null
  );
}

export async function POST(request: Request) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not Found" }, { status: 404 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!isSendTestBody(body)) {
    return NextResponse.json(
      { error: "Body must match { templateId, props, to }" },
      { status: 400 },
    );
  }

  try {
    const rendered = renderTemplate(body.templateId, body.props);
    const provider = getEmailProvider();
    const result = await provider.send({
      from: process.env.EMAIL_FROM ?? "Nebutra <noreply@nebutra.ai>",
      to: body.to,
      subject: rendered.subject,
      html: rendered.html,
      tags: [
        { name: "type", value: "mail_preview_test" },
        { name: "template", value: body.templateId },
      ],
    });
    return NextResponse.json({ ok: true, result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown send error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
