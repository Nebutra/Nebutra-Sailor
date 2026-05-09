import { logger } from "@nebutra/logger";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getAuth } from "@/lib/auth";
import { db } from "@/lib/db";

type RouteContext = {
  params: Promise<{ orgId: string }>;
};

const adminRoles = new Set(["ADMIN", "OWNER"]);

const requestSchema = z.object({
  key: z
    .string()
    .min(1)
    .refine((value) => value.startsWith("org-logos/"), {
      message: "Invalid logo key.",
    }),
});

async function getCurrentMembership(orgId: string, userId: string) {
  return db.organizationMember.findUnique({
    where: { organizationId_userId: { organizationId: orgId, userId } },
    select: { id: true, role: true },
  });
}

/**
 * Resolve a public CDN-style URL from a storage key.
 * If `UPLOADS_PUBLIC_BASE_URL` is configured, the key is prefixed with it; otherwise the
 * key itself is returned (the consumer can resolve it through `/api/uploads/[key]`).
 */
function resolveLogoUrl(key: string): string {
  const baseUrl = process.env.UPLOADS_PUBLIC_BASE_URL?.replace(/\/+$/, "");
  if (baseUrl) return `${baseUrl}/${key}`;
  return `/api/uploads/${encodeURIComponent(key)}`;
}

export async function POST(request: Request, context: RouteContext) {
  const { orgId } = await context.params;

  try {
    const authState = await getAuth();
    if (!authState.userId) {
      return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    }
    if (authState.orgId !== orgId) {
      return NextResponse.json({ error: "Organization mismatch." }, { status: 403 });
    }

    const membership = await getCurrentMembership(orgId, authState.userId);
    if (!membership) {
      return NextResponse.json({ error: "Organization membership required." }, { status: 403 });
    }
    if (!adminRoles.has(membership.role)) {
      return NextResponse.json(
        { error: "You don't have permission to update the organization logo." },
        { status: 403 },
      );
    }

    const parsed = requestSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid request body." },
        { status: 400 },
      );
    }

    if (!parsed.data.key.startsWith(`org-logos/${orgId}/`)) {
      return NextResponse.json(
        { error: "Logo key does not match this organization." },
        {
          status: 400,
        },
      );
    }

    // TODO(schema): once `Organization.logo` is added to Prisma schema, swap the cast for
    // typed `data: { logo: parsed.data.key }`. The migration intentionally lives outside
    // this subagent's allowed paths.
    const updateData = { logo: parsed.data.key } as unknown as Record<string, unknown>;

    const updated = await db.organization.update({
      where: { id: orgId },
      data: updateData,
      select: { id: true, name: true, slug: true },
    });

    return NextResponse.json({
      organization: {
        id: updated.id,
        name: updated.name,
        slug: updated.slug,
        logo: parsed.data.key,
        logoUrl: resolveLogoUrl(parsed.data.key),
      },
    });
  } catch (error) {
    logger.error("[organizations] Failed to finalize logo upload", {
      orgId,
      error: error instanceof Error ? error.message : "Unknown error",
    });
    return NextResponse.json({ error: "Failed to update organization logo." }, { status: 500 });
  }
}
