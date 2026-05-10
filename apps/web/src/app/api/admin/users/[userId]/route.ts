import { auditLogger } from "@nebutra/audit";
import { logger } from "@nebutra/logger";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import { hasPermission, resolveRole } from "@/lib/permissions";

/**
 * Admin write operations on individual users.
 *
 * SOC 2: every mutation here is logged via @nebutra/audit. Permission gate is
 * the same `admin:manage_users` scope already declared in `@/lib/permissions`.
 *
 * SCHEMA GAP (TODO): the current `User` model has no `status`, `deletedAt`, or
 * `role` columns (see `packages/platform/db/prisma/schema.prisma`). Until that
 * lands:
 *   - PATCH only accepts the fields actually present on the model (`name`,
 *     `avatarUrl`, `email`).
 *   - DELETE performs a HARD delete (Prisma cascade rules on
 *     OrganizationMember/Content/Order will follow). When soft-delete columns
 *     exist, swap to `update({ data: { deletedAt: new Date() } })` and emit
 *     the same audit event.
 */

type RouteContext = {
  params: Promise<{ userId: string }>;
};

const PatchBodySchema = z
  .object({
    name: z.string().trim().min(1).max(120).optional(),
    avatarUrl: z.string().url().max(2048).nullable().optional(),
    email: z.string().email().max(254).optional(),
  })
  .strict()
  .refine((v) => Object.keys(v).length > 0, {
    message: "At least one field must be provided.",
  });

type Patchable = z.infer<typeof PatchBodySchema>;

const SELECT_SHAPE = {
  id: true,
  email: true,
  name: true,
  avatarUrl: true,
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
  const { userId } = await context.params;
  const auth = await getAuth();

  if (!auth.isSignedIn || !auth.userId) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  const role = resolveRole(auth.sessionClaims?.org_role as string | undefined);
  if (!hasPermission(role, "admin:manage_users")) {
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
    const existing = await db.user.findUnique({ where: { id: userId }, select: SELECT_SHAPE });
    if (!existing) {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }

    const data: Patchable = parsed.data;
    const updated = await db.user.update({
      where: { id: userId },
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
      tenantId: auth.orgId ?? auth.userId,
    }).log({
      action: "admin.user.updated",
      outcome: "success",
      resource: { type: "user", id: userId, name: updated.name ?? updated.email },
      severity: "warning",
      changes,
      metadata: { adminUserId: auth.userId },
    });

    return NextResponse.json({
      user: {
        id: updated.id,
        email: updated.email,
        name: updated.name,
        avatarUrl: updated.avatarUrl,
        updatedAt: updated.updatedAt.toISOString(),
      },
    });
  } catch (error) {
    logger.error("[admin.users.patch] Failed to update user", {
      userId,
      error: error instanceof Error ? error.message : "Unknown error",
    });
    return NextResponse.json({ error: "Failed to update user." }, { status: 500 });
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  const { userId } = await context.params;
  const auth = await getAuth();

  if (!auth.isSignedIn || !auth.userId) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  const role = resolveRole(auth.sessionClaims?.org_role as string | undefined);
  if (!hasPermission(role, "admin:manage_users")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (userId === auth.userId) {
    return NextResponse.json({ error: "Cannot delete yourself." }, { status: 400 });
  }

  try {
    const existing = await db.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, name: true },
    });
    if (!existing) {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }

    // SCHEMA GAP: no soft-delete column on User. See header comment.
    await db.user.delete({ where: { id: userId } });

    await auditLogger(request, {
      actor: { id: auth.userId, type: "user" },
      tenantId: auth.orgId ?? auth.userId,
    }).log({
      action: "admin.user.deleted",
      outcome: "success",
      resource: { type: "user", id: userId, name: existing.name ?? existing.email },
      severity: "critical",
      metadata: { adminUserId: auth.userId, hardDelete: true },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    logger.error("[admin.users.delete] Failed to delete user", {
      userId,
      error: error instanceof Error ? error.message : "Unknown error",
    });
    return NextResponse.json({ error: "Failed to delete user." }, { status: 500 });
  }
}
