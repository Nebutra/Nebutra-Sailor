import { createAccessGate, createPrismaAccessInviteStore } from "@nebutra/access-gate";
import { auditLogger } from "@nebutra/audit";
import { sendInvitationEmail } from "@nebutra/email";
import { logger } from "@nebutra/logger";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import { hasPermission, resolveRole } from "@/lib/permissions";

type LinkAttributionStatus = "canonical" | "dub" | "failed";
type AdminAuth = Awaited<ReturnType<typeof getAuth>> & { userId: string };
type AccessInviteRow = {
  id: string;
  codePrefix: string;
  scope: "PLATFORM" | "TENANT";
  tenantId: string | null;
  issuedByUserId: string;
  issuedToEmail: string | null;
  status: "ACTIVE" | "REDEEMED" | "REVOKED" | "EXPIRED";
  maxRedemptions: number;
  redemptionCount: number;
  expiresAt: Date | null;
  revokedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};
type AccessInviteAdminDb = {
  accessInviteCode: {
    findMany(args: { orderBy: { createdAt: "desc" }; take: number }): Promise<AccessInviteRow[]>;
    updateMany(args: {
      where: { id: string; status: "ACTIVE" };
      data: { status: "REVOKED"; revokedAt: Date };
    }): Promise<{ count: number }>;
  };
};

const issueSchema = z.object({
  count: z.coerce.number().int().min(1).max(25).default(1),
  scope: z.enum(["platform", "tenant"]).default("platform"),
  tenantId: z.string().trim().min(1).optional(),
  issuedToEmail: z.string().trim().email().optional(),
  expiresAt: z.string().datetime().optional(),
});

const revokeSchema = z.object({
  id: z.string().trim().min(1),
  action: z.literal("revoke"),
});

async function requireAdmin(request: Request): Promise<AdminAuth | Response> {
  const auth = await getAuth(request);
  if (!auth.isSignedIn || !auth.userId) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  const role = resolveRole(auth.sessionClaims?.org_role as string | undefined);
  if (!hasPermission(role, "admin:manage_users")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return auth as AdminAuth;
}

function issuerQuota(): number {
  const raw = Number.parseInt(process.env.ACCESS_INVITE_ISSUER_QUOTA ?? "25", 10);
  return Number.isFinite(raw) && raw > 0 ? raw : 25;
}

function createGate() {
  return createAccessGate({
    store: createPrismaAccessInviteStore(
      db as unknown as Parameters<typeof createPrismaAccessInviteStore>[0],
    ),
    issuerQuota: issuerQuota(),
  });
}

function buildCanonicalInviteUrl(request: Request, input: { code: string; tenantId?: string }) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin;
  const url = new URL("/sign-up", baseUrl);
  url.searchParams.set("invite", input.code);
  if (input.tenantId) url.searchParams.set("tenantId", input.tenantId);
  return url.toString();
}

function dubConfig():
  | {
      apiKey: string;
      defaultDomain?: string;
      workspaceId?: string;
    }
  | undefined {
  const apiKey = process.env.DUB_API_KEY;
  if (!apiKey) return undefined;

  return {
    apiKey,
    ...(process.env.DUB_DEFAULT_DOMAIN ? { defaultDomain: process.env.DUB_DEFAULT_DOMAIN } : {}),
    ...(process.env.DUB_WORKSPACE_ID ? { workspaceId: process.env.DUB_WORKSPACE_ID } : {}),
  };
}

async function createAttributedInviteLink(input: {
  canonicalInviteUrl: string;
  invite: {
    codePrefix: string;
    expiresAt?: Date | null;
    id: string;
    tenantId?: string | null;
  };
}): Promise<{
  attributionLinkId: string | null;
  attributionStatus: LinkAttributionStatus;
  canonicalInviteUrl: string;
  inviteUrl: string;
}> {
  const config = dubConfig();
  if (!config) {
    return {
      attributionLinkId: null,
      attributionStatus: "canonical",
      canonicalInviteUrl: input.canonicalInviteUrl,
      inviteUrl: input.canonicalInviteUrl,
    };
  }

  try {
    const { createAnalyticsClient } = await import("@nebutra/analytics");
    const link = await createAnalyticsClient(config).links.create({
      url: input.canonicalInviteUrl,
      key: `invite-${input.invite.codePrefix}`,
      externalId: input.invite.id,
      tenantId: input.invite.tenantId ?? undefined,
      expiresAt: input.invite.expiresAt ?? undefined,
      tags: ["access-gate", "invite"],
    });

    return {
      attributionLinkId: link.id,
      attributionStatus: "dub",
      canonicalInviteUrl: input.canonicalInviteUrl,
      inviteUrl: link.shortLink,
    };
  } catch (error) {
    logger.error("[admin.access-invites] Failed to create invite attribution link", {
      inviteId: input.invite.id,
      error: error instanceof Error ? error.message : String(error),
    });
    return {
      attributionLinkId: null,
      attributionStatus: "failed",
      canonicalInviteUrl: input.canonicalInviteUrl,
      inviteUrl: input.canonicalInviteUrl,
    };
  }
}

async function sendInviteEmailIfRequested(input: {
  to?: string;
  inviteUrl: string;
  expiresAt?: Date;
}): Promise<"sent" | "skipped" | "failed"> {
  if (!input.to) return "skipped";

  try {
    await sendInvitationEmail({
      to: input.to,
      inviterName: "Nebutra Admin",
      organizationName: "Nebutra",
      role: "Early access",
      acceptUrl: input.inviteUrl,
      expiresAt: input.expiresAt?.toISOString() ?? "No expiry",
      brandName: "Nebutra",
    });
    return "sent";
  } catch (error) {
    logger.error("[admin.access-invites] Failed to send access invite email", {
      to: input.to,
      error: error instanceof Error ? error.message : String(error),
    });
    return "failed";
  }
}

export async function POST(request: Request) {
  const auth = await requireAdmin(request);
  if (auth instanceof Response) return auth;

  const parsed = issueSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid invite issue payload." }, { status: 400 });
  }

  if (parsed.data.scope === "tenant" && !parsed.data.tenantId) {
    return NextResponse.json(
      { error: "tenantId is required for tenant invites." },
      { status: 400 },
    );
  }

  try {
    const issued = await createGate().issueBatch({
      count: parsed.data.count,
      issuedByUserId: auth.userId,
      scope: parsed.data.scope,
      ...(parsed.data.tenantId ? { tenantId: parsed.data.tenantId } : {}),
      ...(parsed.data.issuedToEmail ? { issuedToEmail: parsed.data.issuedToEmail } : {}),
      ...(parsed.data.expiresAt ? { expiresAt: new Date(parsed.data.expiresAt) } : {}),
      metadata: { source: "admin-api" },
    });

    await auditLogger(request, {
      actor: { id: auth.userId, type: "user" },
      tenantId: auth.orgId ?? "system",
    }).log({
      action: "admin.access_invite.issued",
      outcome: "success",
      resource: { type: "access_invite", id: parsed.data.scope },
      severity: "warning",
      metadata: {
        count: issued.length,
        scope: parsed.data.scope,
        tenantId: parsed.data.tenantId ?? null,
        issuedToEmail: parsed.data.issuedToEmail ?? null,
      },
    });

    const invites = await Promise.all(
      issued.map(async ({ plaintextCode, invite }) => {
        const attributedLink = await createAttributedInviteLink({
          canonicalInviteUrl: buildCanonicalInviteUrl(request, {
            code: plaintextCode,
            tenantId: invite.tenantId ?? undefined,
          }),
          invite,
        });
        const emailStatus = await sendInviteEmailIfRequested({
          to: parsed.data.issuedToEmail,
          inviteUrl: attributedLink.inviteUrl,
          expiresAt: invite.expiresAt,
        });

        return {
          attributionLinkId: attributedLink.attributionLinkId,
          attributionStatus: attributedLink.attributionStatus,
          canonicalInviteUrl: attributedLink.canonicalInviteUrl,
          code: plaintextCode,
          emailStatus,
          inviteUrl: attributedLink.inviteUrl,
          id: invite.id,
          prefix: invite.codePrefix,
          scope: invite.scope,
          tenantId: invite.tenantId ?? null,
          expiresAt: invite.expiresAt?.toISOString() ?? null,
        };
      }),
    );

    return NextResponse.json({ invites });
  } catch (error) {
    logger.error("[admin.access-invites] Failed to issue access invites", {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({ error: "Failed to issue access invites." }, { status: 500 });
  }
}

function projectInvite(row: AccessInviteRow) {
  const isExpired = row.status === "ACTIVE" && row.expiresAt !== null && row.expiresAt < new Date();

  return {
    id: row.id,
    prefix: row.codePrefix,
    scope: row.scope.toLowerCase(),
    tenantId: row.tenantId,
    issuedByUserId: row.issuedByUserId,
    issuedToEmail: row.issuedToEmail,
    status: isExpired ? "expired" : row.status.toLowerCase(),
    maxRedemptions: row.maxRedemptions,
    redemptionCount: row.redemptionCount,
    expiresAt: row.expiresAt?.toISOString() ?? null,
    revokedAt: row.revokedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function GET(request: Request) {
  const auth = await requireAdmin(request);
  if (auth instanceof Response) return auth;

  try {
    const rows = await (db as unknown as AccessInviteAdminDb).accessInviteCode.findMany({
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    return NextResponse.json({ invites: rows.map(projectInvite) });
  } catch (error) {
    logger.error("[admin.access-invites] Failed to list access invites", {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({ error: "Failed to list access invites." }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const auth = await requireAdmin(request);
  if (auth instanceof Response) return auth;

  const parsed = revokeSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid invite update payload." }, { status: 400 });
  }

  try {
    const revokedAt = new Date();
    const result = await (db as unknown as AccessInviteAdminDb).accessInviteCode.updateMany({
      where: { id: parsed.data.id, status: "ACTIVE" },
      data: { status: "REVOKED", revokedAt },
    });

    if (result.count === 0) {
      return NextResponse.json(
        { error: "Invite is not active or does not exist." },
        { status: 409 },
      );
    }

    await auditLogger(request, {
      actor: { id: auth.userId, type: "user" },
      tenantId: auth.orgId ?? "system",
    }).log({
      action: "admin.access_invite.revoked",
      outcome: "success",
      resource: { type: "access_invite", id: parsed.data.id },
      severity: "warning",
    });

    return NextResponse.json({
      id: parsed.data.id,
      status: "revoked",
      revokedAt: revokedAt.toISOString(),
    });
  } catch (error) {
    logger.error("[admin.access-invites] Failed to revoke access invite", {
      inviteId: parsed.data.id,
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({ error: "Failed to revoke access invite." }, { status: 500 });
  }
}
