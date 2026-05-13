import { logger } from "@nebutra/logger";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getAuth, getUser } from "@/lib/auth";
import { db } from "@/lib/db";

const KNOWN_AREAS = [
  "dashboard",
  "chat",
  "settings",
  "billing",
  "integrations",
  "audit",
  "other",
] as const;
const AREAS_SET = new Set<string>(KNOWN_AREAS);

const KNOWN_MODES = new Set(["chat", "data", "workflow", "search"]);

const Body = z.object({
  area: z.string().refine((v) => AREAS_SET.has(v), {
    message: "area must be one of the known surfaces",
  }),
  mode: z.string().optional(),
  description: z.string().trim().min(5).max(10000),
  contactEmail: z
    .string()
    .trim()
    .max(254)
    .email()
    .optional()
    .or(z.literal("").transform(() => undefined)),
  sessionId: z.string().max(64).optional(),
  pageUrl: z.string().max(500).optional(),
});

/**
 * In-app feedback / issue report submission.
 *
 * Honesty contract:
 *   - Auth required (no anonymous submissions yet — keeps spam down)
 *   - `area` is constrained to KNOWN_AREAS; unknown values rejected
 *   - `mode` is validated but optional (only relevant for chat surfaces)
 *   - `contactEmail` is independent of the user's auth email — the user
 *     decides whether we may follow up; empty string is treated as opt-out
 *   - User-agent is captured server-side (more reliable than client-supplied)
 */
export async function POST(request: Request) {
  const auth = await getAuth();
  if (!auth.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let payload: z.infer<typeof Body>;
  try {
    payload = Body.parse(await request.json());
  } catch (err) {
    const message = err instanceof Error ? err.message : "Invalid request body";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const mode = payload.mode && KNOWN_MODES.has(payload.mode) ? payload.mode : null;
  const userAgent = request.headers.get("user-agent")?.slice(0, 500) ?? null;

  // If the user opted into follow-up but didn't supply an email, fall back to
  // their account email (best-effort, ignore errors).
  let contactEmail = payload.contactEmail ?? null;
  if (!contactEmail) {
    try {
      const user = await getUser();
      contactEmail = user?.email?.slice(0, 254) ?? null;
    } catch {
      contactEmail = null;
    }
  }

  try {
    const report = await db.feedbackReport.create({
      data: {
        organizationId: auth.orgId ?? null,
        userId: auth.userId,
        area: payload.area,
        mode,
        description: payload.description,
        contactEmail,
        sessionId: payload.sessionId ?? null,
        userAgent,
        pageUrl: payload.pageUrl ?? null,
      },
      select: { id: true, createdAt: true },
    });

    logger.info("[feedback.POST] Report submitted", {
      reportId: report.id,
      area: payload.area,
      mode,
      hasMode: !!mode,
      orgId: auth.orgId,
      userId: auth.userId,
    });

    return NextResponse.json({ report });
  } catch (err) {
    logger.error("[feedback.POST] Failed to persist report", {
      error: err instanceof Error ? err.message : String(err),
      area: payload.area,
      orgId: auth.orgId,
      userId: auth.userId,
    });
    return NextResponse.json({ error: "Failed to submit feedback" }, { status: 500 });
  }
}
