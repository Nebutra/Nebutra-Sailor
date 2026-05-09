import { logger } from "@nebutra/logger";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getAuth } from "@/lib/auth";
import { db } from "@/lib/db";

type RouteContext = {
  params: Promise<{ orgId: string }>;
};

const adminRoles = new Set(["ADMIN", "OWNER"]);
const ownerRoles = new Set(["OWNER"]);

const renameSchema = z.object({
  name: z.string().trim().min(2).max(100),
});

const deleteSchema = z.object({
  confirmation: z.string().min(1),
});

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

async function authorize(orgId: string) {
  const authState = await getAuth();
  if (!authState.userId) {
    return {
      response: NextResponse.json({ error: "Authentication required." }, { status: 401 }),
      authState,
      currentMembership: null,
    } as const;
  }

  if (authState.orgId !== orgId) {
    return {
      response: NextResponse.json({ error: "Organization mismatch." }, { status: 403 }),
      authState,
      currentMembership: null,
    } as const;
  }

  const currentMembership = await getCurrentMembership(orgId, authState.userId);
  if (!currentMembership) {
    return {
      response: NextResponse.json({ error: "Organization membership required." }, { status: 403 }),
      authState,
      currentMembership: null,
    } as const;
  }

  return { response: null, authState, currentMembership } as const;
}

export async function PATCH(request: Request, context: RouteContext) {
  const { orgId } = await context.params;

  try {
    const auth = await authorize(orgId);
    if (auth.response) return auth.response;

    if (!adminRoles.has(auth.currentMembership.role)) {
      return NextResponse.json(
        { error: "You don't have permission to update this organization." },
        { status: 403 },
      );
    }

    const parsed = renameSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Name must be between 2 and 100 characters." },
        { status: 400 },
      );
    }

    const existing = await db.organization.findUnique({
      where: { id: orgId },
      select: { id: true },
    });
    if (!existing) {
      return NextResponse.json({ error: "Organization not found." }, { status: 404 });
    }

    const updated = await db.organization.update({
      where: { id: orgId },
      data: { name: parsed.data.name },
      select: { id: true, name: true, slug: true, plan: true, updatedAt: true },
    });

    return NextResponse.json({
      organization: {
        id: updated.id,
        name: updated.name,
        slug: updated.slug,
        plan: updated.plan,
        updatedAt: updated.updatedAt.toISOString(),
      },
    });
  } catch (error) {
    logger.error("[organizations] Failed to rename organization", {
      orgId,
      error: error instanceof Error ? error.message : "Unknown error",
    });
    return NextResponse.json({ error: "Failed to update organization." }, { status: 500 });
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  const { orgId } = await context.params;

  try {
    const auth = await authorize(orgId);
    if (auth.response) return auth.response;

    if (!ownerRoles.has(auth.currentMembership.role)) {
      return NextResponse.json(
        { error: "Only the organization owner can delete this organization." },
        { status: 403 },
      );
    }

    const parsed = deleteSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json({ error: "Confirmation is required." }, { status: 400 });
    }

    const existing = await db.organization.findUnique({
      where: { id: orgId },
      select: { id: true, name: true },
    });
    if (!existing) {
      return NextResponse.json({ error: "Organization not found." }, { status: 404 });
    }

    if (parsed.data.confirmation !== existing.name) {
      return NextResponse.json(
        { error: "Confirmation does not match the organization name." },
        { status: 400 },
      );
    }

    // OrganizationMember has onDelete: Cascade — removing the org cascades.
    await db.organization.delete({ where: { id: orgId } });

    return NextResponse.json({ ok: true });
  } catch (error) {
    logger.error("[organizations] Failed to delete organization", {
      orgId,
      error: error instanceof Error ? error.message : "Unknown error",
    });
    return NextResponse.json({ error: "Failed to delete organization." }, { status: 500 });
  }
}
