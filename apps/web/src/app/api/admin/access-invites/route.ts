import { createAccessGate, createPrismaAccessInviteStore } from "@nebutra/access-gate";
import { auditLogger } from "@nebutra/audit";
import { sendInvitationEmail } from "@nebutra/email";
import { logger } from "@nebutra/logger";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import { hasPermission, resolveRole } from "@/lib/permissions";

const issueSchema = z.object({
  count: z.coerce.number().int().min(1).max(25).default(1),
  scope: z.enum(["platform", "tenant"]).default("platform"),
  tenantId: z.string().trim().min(1).optional(),
  issuedToEmail: z.string().trim().email().optional(),
  expiresAt: z.string().datetime().optional(),
});

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

function buildInviteUrl(request: Request, code: string): string {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin;
  const url = new URL("/sign-up", baseUrl);
  url.searchParams.set("invite", code);
  return url.toString();
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
  const auth = await getAuth(request);
  if (!auth.isSignedIn || !auth.userId) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  const role = resolveRole(auth.sessionClaims?.org_role as string | undefined);
  if (!hasPermission(role, "admin:manage_users")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

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
        const inviteUrl = buildInviteUrl(request, plaintextCode);
        const emailStatus = await sendInviteEmailIfRequested({
          to: parsed.data.issuedToEmail,
          inviteUrl,
          expiresAt: invite.expiresAt,
        });

        return {
          code: plaintextCode,
          emailStatus,
          inviteUrl,
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
