import { auditLogger } from "@nebutra/audit";
import { sendInvitationEmail } from "@nebutra/email";
import { logger } from "@nebutra/logger";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getAuth, getUser } from "@/lib/auth";
import { db } from "@/lib/db";

type RouteContext = {
  params: Promise<{ orgId: string }>;
};

const adminRoles = new Set(["ADMIN", "OWNER"]);

const inviteSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  role: z.enum(["admin", "member", "viewer"]),
});

const INVITE_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

function toClientRole(role: string) {
  return role.toLowerCase();
}

async function getCurrentMembership(orgId: string, userId: string) {
  return db.organizationMember.findUnique({
    where: {
      organizationId_userId: {
        organizationId: orgId,
        userId,
      },
    },
    select: {
      id: true,
      role: true,
    },
  });
}

export async function GET(_request: Request, context: RouteContext) {
  const { orgId } = await context.params;

  try {
    const authState = await getAuth();
    if (!authState.userId) {
      return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    }

    if (authState.orgId !== orgId) {
      return NextResponse.json({ error: "Organization mismatch." }, { status: 403 });
    }

    const currentMembership = await getCurrentMembership(orgId, authState.userId);
    if (!currentMembership) {
      return NextResponse.json({ error: "Organization membership required." }, { status: 403 });
    }

    const isAdmin = adminRoles.has(currentMembership.role);
    const members = await db.organizationMember.findMany({
      where: { organizationId: orgId },
      orderBy: [{ role: "asc" }, { createdAt: "asc" }],
      select: {
        id: true,
        userId: true,
        role: true,
        createdAt: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            avatarUrl: true,
          },
        },
      },
    });

    return NextResponse.json({
      currentUserId: authState.userId,
      canManageRoles: isAdmin,
      canRemoveMembers: isAdmin,
      members: members.map((member) => ({
        id: member.id,
        userId: member.userId,
        role: toClientRole(member.role),
        joinedAt: member.createdAt.toISOString(),
        user: {
          id: member.user.id,
          name: member.user.name,
          email: member.user.email,
          image: member.user.avatarUrl,
        },
      })),
    });
  } catch (error) {
    logger.error("[organizations] Failed to list team members", {
      orgId,
      error: error instanceof Error ? error.message : "Unknown error",
    });

    return NextResponse.json({ error: "Failed to load members." }, { status: 500 });
  }
}

/**
 * POST /api/organizations/[orgId]/members
 *
 * Invite a user (by email) to join the organization. Creates a pending
 * `OrganizationInvitation` row, attempts to send an invitation email, and
 * emits an `org.member.added` audit event. Authorization mirrors the existing
 * member-mutation pattern in `[memberId]/route.ts`: caller must be authed,
 * scoped to this org, and hold ADMIN or OWNER role.
 */
export async function POST(request: Request, context: RouteContext) {
  const { orgId } = await context.params;

  try {
    const parsed = inviteSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid invitation payload." }, { status: 400 });
    }

    const authState = await getAuth(request);
    if (!authState.userId) {
      return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    }

    if (authState.orgId !== orgId) {
      return NextResponse.json({ error: "Organization mismatch." }, { status: 403 });
    }

    const currentMembership = await getCurrentMembership(orgId, authState.userId);
    if (!currentMembership) {
      return NextResponse.json({ error: "Organization membership required." }, { status: 403 });
    }

    if (!adminRoles.has(currentMembership.role)) {
      return NextResponse.json(
        { error: "You don't have permission to invite members." },
        { status: 403 },
      );
    }

    const { email, role } = parsed.data;

    // Reject if a user with this email is already a member of the org.
    const existingUser = await db.user.findUnique({
      where: { email },
      select: { id: true },
    });

    if (existingUser) {
      const existingMembership = await db.organizationMember.findUnique({
        where: {
          organizationId_userId: {
            organizationId: orgId,
            userId: existingUser.id,
          },
        },
        select: { id: true },
      });
      if (existingMembership) {
        return NextResponse.json({ error: "already_member" }, { status: 409 });
      }
    }

    // Reject duplicate pending invitations for the same (org, email) pair.
    const pendingInvite = await db.organizationInvitation.findFirst({
      where: { organizationId: orgId, email, status: "pending" },
      select: { id: true },
    });
    if (pendingInvite) {
      return NextResponse.json({ error: "already_member" }, { status: 409 });
    }

    const expiresAt = new Date(Date.now() + INVITE_EXPIRY_MS);
    const token = crypto.randomUUID();

    const invitation = await db.organizationInvitation.create({
      data: {
        email,
        organizationId: orgId,
        role,
        inviterId: authState.userId,
        token,
        expiresAt,
      },
      select: {
        id: true,
        email: true,
        role: true,
        status: true,
        expiresAt: true,
        createdAt: true,
      },
    });

    // Best-effort invitation email. The route still succeeds if the mailer is
    // not configured — the invitation row is the source of truth.
    try {
      const inviter = await getUser().catch(() => null);
      const organization = await db.organization
        .findUnique({ where: { id: orgId }, select: { name: true } })
        .catch(() => null);

      const appUrl =
        process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || "http://localhost:3000";

      await sendInvitationEmail({
        to: email,
        inviterName: inviter?.name || inviter?.email || "A teammate",
        organizationName: organization?.name || "your workspace",
        role,
        acceptUrl: `${appUrl.replace(/\/$/, "")}/invitations/${invitation.id}/accept`,
        expiresAt: expiresAt.toISOString(),
        brandName: "Nebutra",
      });
    } catch (emailError) {
      logger.error("[organizations] Failed to send invitation email", {
        orgId,
        invitationId: invitation.id,
        error: emailError instanceof Error ? emailError.message : "Unknown error",
      });
      // Do not fail the request — the invitation row exists and can be resent.
    }

    try {
      await auditLogger(request, {
        actor: { id: authState.userId, type: "user" },
        tenantId: orgId,
      }).log({
        action: "org.member.added",
        outcome: "success",
        resource: { type: "user", id: email },
        severity: "warning",
        metadata: {
          invitationId: invitation.id,
          role,
          invitedBy: authState.userId,
        },
      });
    } catch (auditError) {
      logger.error("[organizations] Failed to record org.member.added audit", {
        orgId,
        invitationId: invitation.id,
        error: auditError instanceof Error ? auditError.message : "Unknown error",
      });
    }

    return NextResponse.json(
      {
        invitation: {
          id: invitation.id,
          email: invitation.email,
          role: invitation.role,
          status: invitation.status,
          expiresAt: invitation.expiresAt.toISOString(),
          createdAt: invitation.createdAt.toISOString(),
        },
      },
      { status: 201 },
    );
  } catch (error) {
    logger.error("[organizations] Failed to invite team member", {
      orgId,
      error: error instanceof Error ? error.message : "Unknown error",
    });
    return NextResponse.json({ error: "Failed to invite member." }, { status: 500 });
  }
}
