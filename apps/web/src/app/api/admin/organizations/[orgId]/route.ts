import { auditLogger } from "@nebutra/audit";
import { logger } from "@nebutra/logger";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import { hasPermission, resolveRole } from "@/lib/permissions";

/**
 * Admin write operations on individual organizations.
 *
 * Distinct from `apps/web/src/app/api/organizations/[orgId]/route.ts` (which
 * is gated to org owners/members). This admin variant lets a super-admin act
 * on ANY organization regardless of membership, gated by the
 * `admin:manage_orgs` scope. Every mutation is audited (SOC 2).
 *
 * SCHEMA GAP (TODO): the current `Organization` model has no `status` or
 * `deletedAt` columns. PATCH covers the fields actually present (`name`,
 * `plan`, `logo`). DELETE performs a HARD delete — `OrganizationMember` has
 * `onDelete: Cascade` so memberships are cleaned up. When soft-delete columns
 * exist, swap to `update({ data: { deletedAt: new Date() } })`.
 */

type RouteContext = {
  params: Promise<{ orgId: string }>;
};

const PlanEnum = z.enum(["FREE", "PRO", "ENTERPRISE"]);

const PatchBodySchema = z
  .object({
    name: z.string().trim().min(2).max(100).optional(),
    plan: PlanEnum.optional(),
    logo: z.string().url().max(2048).nullable().optional(),
  })
  .strict()
  .refine((v) => Object.keys(v).length > 0, {
    message: "At least one field must be provided.",
  });

type Patchable = z.infer<typeof PatchBodySchema>;

const SELECT_SHAPE = {
  id: true,
  name: true,
  slug: true,
  plan: true,
  logo: true,
  updatedAt: true,
} as const;

function diffChanges(
  before: Record<string, unknown>,
  after: Record<string, unknown>,
  keys: ReadonlyArray<string>,
) {
  const beforeOut: Record<string, unknown> = {};
  const afterOut: Record<string, unknown> = {};
  for (const key of keys) {
    if (before[key] !== after[key]) {
      beforeOut[key] = before[key];
      afterOut[key] = after[key];
    }
  }
  return { before: beforeOut, after: afterOut };
}

export async function PATCH(request: Request, context: RouteContext) {
  const { orgId } = await context.params;
  const auth = await getAuth();

  if (!auth.isSignedIn || !auth.userId) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  const role = resolveRole(auth.sessionClaims?.org_role as string | undefined);
  if (!hasPermission(role, "admin:manage_orgs")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const parsed = PatchBodySchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  try {
    const existing = await db.organization.findUnique({
      where: { id: orgId },
      select: SELECT_SHAPE,
    });
    if (!existing) {
      return NextResponse.json({ error: "Organization not found." }, { status: 404 });
    }

    const data: Patchable = parsed.data;
    const updated = await db.organization.update({
      where: { id: orgId },
      data,
      select: SELECT_SHAPE,
    });

    const changes = diffChanges(
      existing as unknown as Record<string, unknown>,
      updated as unknown as Record<string, unknown>,
      Object.keys(data),
    );

    await auditLogger(request, {
      actor: { id: auth.userId, type: "user" },
      tenantId: orgId,
    }).log({
      action: "admin.org.updated",
      outcome: "success",
      resource: { type: "organization", id: orgId, name: updated.name },
      severity: "warning",
      changes,
      metadata: { adminUserId: auth.userId },
    });

    return NextResponse.json({
      organization: {
        id: updated.id,
        name: updated.name,
        slug: updated.slug,
        plan: updated.plan,
        logo: updated.logo,
        updatedAt: updated.updatedAt.toISOString(),
      },
    });
  } catch (error) {
    logger.error("[admin.organizations.patch] Failed to update organization", {
      orgId,
      error: error instanceof Error ? error.message : "Unknown error",
    });
    return NextResponse.json({ error: "Failed to update organization." }, { status: 500 });
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  const { orgId } = await context.params;
  const auth = await getAuth();

  if (!auth.isSignedIn || !auth.userId) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  const role = resolveRole(auth.sessionClaims?.org_role as string | undefined);
  if (!hasPermission(role, "admin:manage_orgs")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const existing = await db.organization.findUnique({
      where: { id: orgId },
      select: { id: true, name: true },
    });
    if (!existing) {
      return NextResponse.json({ error: "Organization not found." }, { status: 404 });
    }

    // SCHEMA GAP: no soft-delete column on Organization. See header comment.
    await db.organization.delete({ where: { id: orgId } });

    await auditLogger(request, {
      actor: { id: auth.userId, type: "user" },
      tenantId: orgId,
    }).log({
      action: "admin.org.deleted",
      outcome: "success",
      resource: { type: "organization", id: orgId, name: existing.name },
      severity: "critical",
      metadata: { adminUserId: auth.userId, hardDelete: true },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    logger.error("[admin.organizations.delete] Failed to delete organization", {
      orgId,
      error: error instanceof Error ? error.message : "Unknown error",
    });
    return NextResponse.json({ error: "Failed to delete organization." }, { status: 500 });
  }
}
