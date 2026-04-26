import { logger } from "@nebutra/logger";
import { NextResponse } from "next/server";
import { getAuth } from "@/lib/auth";
import { db } from "@/lib/db";

type RouteContext = {
  params: Promise<{ orgId: string }>;
};

const adminRoles = new Set(["ADMIN", "OWNER"]);

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
