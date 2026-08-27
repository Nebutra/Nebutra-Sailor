import type { Plan } from "@nebutra/db";
import { logger } from "@nebutra/logger";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import { hasPermission, resolveRole } from "@/lib/permissions";

type RouteContext = {
  params: Promise<{ orgId: string }>;
};

const PLAN_VALUES = ["FREE", "PRO", "ENTERPRISE"] as const satisfies readonly Plan[];

const updateOrganizationSchema = z.object({
  name: z.string().trim().min(2).max(100).optional(),
  slug: z
    .string()
    .trim()
    .min(2)
    .max(80)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
    .optional(),
  plan: z
    .preprocess(
      (value) => (typeof value === "string" ? value.trim().toUpperCase() : value),
      z.enum(PLAN_VALUES),
    )
    .optional(),
});

async function authorizeAdmin(scope: "admin:manage_orgs") {
  const auth = await getAuth();
  if (!auth.isSignedIn || !auth.userId) {
    return { response: NextResponse.json({ error: "Authentication required." }, { status: 401 }) };
  }

  const role = resolveRole(auth.sessionClaims?.org_role as string | undefined);
  if (!hasPermission(role, scope)) {
    return { response: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }

  return { response: null };
}

export async function PATCH(request: Request, context: RouteContext) {
  const { orgId } = await context.params;

  try {
    const auth = await authorizeAdmin("admin:manage_orgs");
    if (auth.response) return auth.response;

    const parsed = updateOrganizationSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success || Object.keys(parsed.data).length === 0) {
      return NextResponse.json({ error: "Invalid organization update payload." }, { status: 400 });
    }

    const updated = await db.organization.update({
      where: { id: orgId },
      data: parsed.data,
      select: {
        id: true,
        name: true,
        slug: true,
        plan: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({
      organization: {
        ...updated,
        updatedAt: updated.updatedAt.toISOString(),
      },
    });
  } catch (error) {
    logger.error("[admin.organizations] Failed to update organization", {
      orgId,
      error: error instanceof Error ? error.message : "Unknown error",
    });
    return NextResponse.json({ error: "Failed to update organization." }, { status: 500 });
  }
}
