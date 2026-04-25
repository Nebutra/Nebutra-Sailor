import { logger } from "@nebutra/logger";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getAuth } from "@/lib/auth";
import { db } from "@/lib/db";

type RouteContext = {
  params: Promise<{ orgId: string; memberId: string }>;
};

const adminRoles = new Set(["ADMIN", "OWNER"]);
const protectedRoles = new Set(["ADMIN", "OWNER"]);
const roleSchema = z.object({
  role: z.enum(["admin", "member", "viewer"]),
});

function toClientRole(role: string) {
  return role.toLowerCase();
}

function toDbRole(role: z.infer<typeof roleSchema>["role"]) {
  return role.toUpperCase() as "ADMIN" | "MEMBER" | "VIEWER";
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

async function getTargetMembership(memberId: string) {
  return db.organizationMember.findUnique({
    where: { id: memberId },
    select: {
      id: true,
      organizationId: true,
      role: true,
      userId: true,
    },
  });
}

async function isLastPrivilegedMember(orgId: string, targetRole: string) {
  if (!protectedRoles.has(targetRole)) return false;

  const privilegedMemberCount = await db.organizationMember.count({
    where: {
      organizationId: orgId,
      role: { in: ["ADMIN", "OWNER"] },
    },
  });

  return privilegedMemberCount <= 1;
}

async function authorizeMemberMutation(orgId: string) {
  const authState = await getAuth();
  if (!authState.userId) {
    return {
      error: NextResponse.json({ error: "Authentication required." }, { status: 401 }),
      authState,
      currentMembership: null,
    };
  }

  if (authState.orgId !== orgId) {
    return {
      error: NextResponse.json({ error: "Organization mismatch." }, { status: 403 }),
      authState,
      currentMembership: null,
    };
  }

  const currentMembership = await getCurrentMembership(orgId, authState.userId);
  if (!currentMembership) {
    return {
      error: NextResponse.json({ error: "Organization membership required." }, { status: 403 }),
      authState,
      currentMembership: null,
    };
  }

  return { error: null, authState, currentMembership };
}

export async function PATCH(request: Request, context: RouteContext) {
  const { orgId, memberId } = await context.params;

  try {
    const parsed = roleSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid member role." }, { status: 400 });
    }

    const authorization = await authorizeMemberMutation(orgId);
    if (authorization.error) return authorization.error;

    if (!adminRoles.has(authorization.currentMembership.role)) {
      return NextResponse.json(
        { error: "You don't have permission to manage member roles." },
        { status: 403 },
      );
    }

    const targetMembership = await getTargetMembership(memberId);
    if (!targetMembership || targetMembership.organizationId !== orgId) {
      return NextResponse.json({ error: "Member not found." }, { status: 404 });
    }

    if (targetMembership.role === "OWNER") {
      return NextResponse.json({ error: "Owner roles cannot be changed here." }, { status: 400 });
    }

    const nextRole = toDbRole(parsed.data.role);
    if (nextRole !== "ADMIN" && (await isLastPrivilegedMember(orgId, targetMembership.role))) {
      return NextResponse.json(
        { error: "Assign another admin before changing this member's role." },
        { status: 400 },
      );
    }

    const member = await db.organizationMember.update({
      where: { id: memberId },
      data: { role: nextRole },
      select: { id: true, role: true },
    });

    return NextResponse.json({
      member: {
        id: member.id,
        role: toClientRole(member.role),
      },
    });
  } catch (error) {
    logger.error("[organizations] Failed to update team member role", {
      orgId,
      memberId,
      error: error instanceof Error ? error.message : "Unknown error",
    });

    return NextResponse.json({ error: "Failed to update member role." }, { status: 500 });
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  const { orgId, memberId } = await context.params;

  try {
    const authorization = await authorizeMemberMutation(orgId);
    if (authorization.error) return authorization.error;

    const targetMembership = await getTargetMembership(memberId);
    if (!targetMembership || targetMembership.organizationId !== orgId) {
      return NextResponse.json({ error: "Member not found." }, { status: 404 });
    }

    const isSelf = targetMembership.userId === authorization.authState.userId;
    if (!isSelf && !adminRoles.has(authorization.currentMembership.role)) {
      return NextResponse.json(
        { error: "You don't have permission to remove members." },
        { status: 403 },
      );
    }

    if (targetMembership.role === "OWNER") {
      return NextResponse.json(
        { error: "Owner memberships cannot be removed here." },
        { status: 400 },
      );
    }

    if (await isLastPrivilegedMember(orgId, targetMembership.role)) {
      return NextResponse.json(
        { error: "Assign another admin before removing this member." },
        { status: 400 },
      );
    }

    await db.organizationMember.delete({ where: { id: memberId } });

    return NextResponse.json({ ok: true, action: isSelf ? "left" : "removed" });
  } catch (error) {
    logger.error("[organizations] Failed to remove team member", {
      orgId,
      memberId,
      error: error instanceof Error ? error.message : "Unknown error",
    });

    return NextResponse.json({ error: "Failed to remove member." }, { status: 500 });
  }
}
