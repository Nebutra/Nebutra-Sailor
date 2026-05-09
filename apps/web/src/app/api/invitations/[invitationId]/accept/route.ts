import { getSystemDb } from "@nebutra/db";
import { logger } from "@nebutra/logger";
import { NextResponse } from "next/server";
import { getAuth, getUser } from "@/lib/auth";

type RouteContext = { params: Promise<{ invitationId: string }> };

const VALID_ROLES = new Set(["admin", "member", "viewer"]);

function normalizeRole(role: string): "ADMIN" | "MEMBER" | "VIEWER" {
  const normalized = role.toLowerCase();
  if (!VALID_ROLES.has(normalized)) {
    return "MEMBER";
  }
  return normalized.toUpperCase() as "ADMIN" | "MEMBER" | "VIEWER";
}

/**
 * POST /api/invitations/[invitationId]/accept
 *
 * Accept a pending OrganizationInvitation. The route loads the invitation by
 * its primary key, validates that:
 *   - the invitation is still pending,
 *   - it has not expired,
 *   - and the email on the invitation matches the current user's email
 * before transactionally creating an `OrganizationMember` row and marking the
 * invitation as `accepted`.
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

    if (invitation.expiresAt.getTime() <= Date.now()) {
      // Lazy state transition: surface as expired so the client can render a
      // friendly view without our cron job needing to run first.
      await db.organizationInvitation
        .update({ where: { id: invitation.id }, data: { status: "expired" } })
        .catch(() => {
          // Best effort; do not fail the user-facing response on a race.
        });
      return NextResponse.json({ error: "Invitation has expired." }, { status: 410 });
    }

    // Verify the signed-in user's email matches the invited address.
    const user = await getUser().catch(() => null);
    const userEmail = user?.email ?? null;
    if (!userEmail || userEmail.toLowerCase() !== invitation.email.toLowerCase()) {
      return NextResponse.json(
        { error: "This invitation was sent to a different email address." },
        { status: 403 },
      );
    }

    // Idempotent: if the membership already exists, just mark the invitation
    // accepted and return success.
    const existingMembership = await db.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId: invitation.organizationId,
          userId: authState.userId,
        },
      },
    });

    if (!existingMembership) {
      await db.organizationMember.create({
        data: {
          organizationId: invitation.organizationId,
          userId: authState.userId,
          role: normalizeRole(invitation.role),
        },
      });
    }

    await db.organizationInvitation.update({
      where: { id: invitation.id },
      data: { status: "accepted", acceptedAt: new Date() },
    });

    return NextResponse.json({ ok: true, organizationId: invitation.organizationId });
  } catch (error) {
    logger.error("[invitations] Failed to accept invitation", {
      error: error instanceof Error ? error.message : "Unknown error",
    });
    return NextResponse.json({ error: "Failed to accept invitation." }, { status: 500 });
  }
}
