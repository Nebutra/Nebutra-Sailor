import { logger } from "@nebutra/logger";
import { getUploadProvider } from "@nebutra/uploads";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getAuth } from "@/lib/auth";
import { db } from "@/lib/db";

type RouteContext = {
  params: Promise<{ orgId: string }>;
};

const adminRoles = new Set(["ADMIN", "OWNER"]);
const allowedTypes = new Set(["image/png", "image/jpeg", "image/webp"]);
const MAX_LOGO_SIZE_BYTES = 2 * 1024 * 1024;

const requestSchema = z.object({
  contentType: z.string().refine((value) => allowedTypes.has(value), {
    message: "Unsupported content type.",
  }),
  contentLength: z
    .number()
    .int()
    .positive()
    .max(MAX_LOGO_SIZE_BYTES, "File exceeds the 2MB limit.")
    .optional(),
});

function extensionFor(contentType: string): string {
  switch (contentType) {
    case "image/png":
      return "png";
    case "image/jpeg":
      return "jpg";
    case "image/webp":
      return "webp";
    default:
      return "bin";
  }
}

async function getCurrentMembership(orgId: string, userId: string) {
  return db.organizationMember.findUnique({
    where: { organizationId_userId: { organizationId: orgId, userId } },
    select: { id: true, role: true },
  });
}

/**
 * Generate a presigned upload URL for a logo using @nebutra/uploads.
 * Auto-detects provider: Vercel Blob (zero-config), S3, R2, or local.
 */
async function buildPresignedUpload(key: string, contentType: string, orgId: string) {
  const provider = await getUploadProvider();
  const presigned = await provider.createPresignedUpload({
    bucket: "org-logos",
    key,
    contentType,
    tenantId: orgId,
    acl: "public-read",
  });
  return {
    url: presigned.url,
    method: presigned.method,
    headers: presigned.headers,
    key,
  };
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
        { error: "You don't have permission to upload an organization logo." },
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

    const ext = extensionFor(parsed.data.contentType);
    const key = `org-logos/${orgId}/${Date.now()}.${ext}`;
    const upload = await buildPresignedUpload(key, parsed.data.contentType, orgId);

    return NextResponse.json(upload);
  } catch (error) {
    logger.error("[organizations] Failed to create logo upload URL", {
      orgId,
      error: error instanceof Error ? error.message : "Unknown error",
    });
    return NextResponse.json({ error: "Failed to create upload URL." }, { status: 500 });
  }
}
