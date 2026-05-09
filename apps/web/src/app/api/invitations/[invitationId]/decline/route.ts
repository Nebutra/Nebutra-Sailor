import { getSystemDb } from "@nebutra/db";
import { logger } from "@nebutra/logger";
import { NextResponse } from "next/server";
import { getAuth } from "@/lib/auth";

type RouteContext = { params: Promise<{ invitationId: string }> };

/**
 * POST /api/invitations/[invitationId]/decline
 *
 * Mark a pending OrganizationInvitation as declined. We do NOT require the
 * invitee's email to match the signed-in user — declining is non-destructive
 * and the only allowed transition is `pending -> declined`.
 */
export async function POST(request: Request, context: RouteContext) {
  try {
    const { invitationId } = await context.params;

    const authState = await getAuth(request);
    if (!authState.userId) {
      return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    }

    const db = getSystemDb();
    const invitation = await db.organizationInvitation.findUnique({
      where: { id: invitationId },
    });

    if (!invitation) {
      return NextResponse.json({ error: "Invitation not found." }, { status: 404 });
    }

    if (invitation.status !== "pending") {
      return NextResponse.json({ error: "Invitation is no longer pending." }, { status: 410 });
    }

    await db.organizationInvitation.update({
      where: { id: invitation.id },
      data: { status: "declined", declinedAt: new Date() },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    logger.error("[invitations] Failed to decline invitation", {
      error: error instanceof Error ? error.message : "Unknown error",
    });
    return NextResponse.json({ error: "Failed to decline invitation." }, { status: 500 });
  }
}
