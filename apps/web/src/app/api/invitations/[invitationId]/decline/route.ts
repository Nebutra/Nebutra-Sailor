import { getSystemDb } from "@nebutra/db";
import { logger } from "@nebutra/logger";
import { NextResponse } from "next/server";
import { getAuth } from "@/lib/auth";
import { findInvitationById, updateInvitationStatus } from "@/lib/invitations";

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
    // ADR-12 Phase 3b — dual-read: auth.invitation (BA) first, legacy fallback.
    const invitation = await findInvitationById(invitationId, db);

    if (!invitation) {
      return NextResponse.json({ error: "Invitation not found." }, { status: 404 });
    }

    if (invitation.status !== "pending") {
      return NextResponse.json({ error: "Invitation is no longer pending." }, { status: 410 });
    }

    await updateInvitationStatus(invitation, { status: "declined", declinedAt: new Date() }, db);

    return NextResponse.json({ ok: true });
  } catch (error) {
    logger.error("[invitations] Failed to decline invitation", {
      error: error instanceof Error ? error.message : "Unknown error",
    });
    return NextResponse.json({ error: "Failed to decline invitation." }, { status: 500 });
  }
}
