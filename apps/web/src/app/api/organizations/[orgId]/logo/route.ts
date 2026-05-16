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

function isManagedLogoKey(value: string | null | undefined): value is string {
  return typeof value === "string" && value.startsWith("org-logos/");
}

async function deleteManagedLogoKey(key: string | null | undefined) {
  if (!isManagedLogoKey(key)) return;
  try {
    const { getUploadProvider } = await import("@nebutra/uploads");
    const provider = await getUploadProvider();
    await provider.deleteFile("org-logos", key);
  } catch (error) {
    logger.error("[organizations] Failed to delete logo object", {
      key,
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
}

type LogoAuthorizationResult =
  | { ok: true }
  | {
      ok: false;
      response: NextResponse;
    };

async function authorizeLogoMutation(orgId: string): Promise<LogoAuthorizationResult> {
  const authState = await getAuth();
  if (!authState.userId) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Authentication required." }, { status: 401 }),
    };
  }
  if (authState.orgId !== orgId) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Organization mismatch." }, { status: 403 }),
    };
  }

  const membership = await getCurrentMembership(orgId, authState.userId);
  if (!membership) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Organization membership required." }, { status: 403 }),
    };
  }
  if (!adminRoles.has(membership.role)) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "You don't have permission to update the organization logo." },
        { status: 403 },
      ),
    };
  }

  return { ok: true };
}

export async function POST(request: Request, context: RouteContext) {
  const { orgId } = await context.params;

  try {
    const auth = await authorizeLogoMutation(orgId);
    if (!auth.ok) return auth.response;

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

    const previous = await db.organization.findUnique({
      where: { id: orgId },
      select: { logo: true } as unknown as { logo: true },
    });

    const updated = await db.organization.update({
      where: { id: orgId },
      data: updateData,
      select: { id: true, name: true, slug: true },
    });

    const previousLogo = (previous as { logo?: string | null } | null)?.logo;
    if (previousLogo !== parsed.data.key) {
      await deleteManagedLogoKey(previousLogo);
    }

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

export async function DELETE(_request: Request, context: RouteContext) {
  const { orgId } = await context.params;

  try {
    const auth = await authorizeLogoMutation(orgId);
    if (!auth.ok) return auth.response;

    const previous = await db.organization.findUnique({
      where: { id: orgId },
      select: { logo: true } as unknown as { logo: true },
    });

    const updateData = { logo: null } as unknown as Record<string, unknown>;
    const updated = await db.organization.update({
      where: { id: orgId },
      data: updateData,
      select: { id: true, name: true, slug: true },
    });

    await deleteManagedLogoKey((previous as { logo?: string | null } | null)?.logo);

    return NextResponse.json({
      organization: {
        id: updated.id,
        name: updated.name,
        slug: updated.slug,
        logo: null,
        logoUrl: null,
      },
    });
  } catch (error) {
    logger.error("[organizations] Failed to delete logo", {
      orgId,
      error: error instanceof Error ? error.message : "Unknown error",
    });
    return NextResponse.json({ error: "Failed to delete organization logo." }, { status: 500 });
  }
}
