import { getSystemDb, getTenantDb } from "@nebutra/db";
import { logger } from "@nebutra/logger";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getAuth } from "@/lib/auth";
import { hasPermission, resolveRole } from "@/lib/permissions";

const inviteSchema = z.object({
  emails: z.array(z.string().email()).min(1).max(5),
  role: z
    .enum(["admin", "member", "viewer", "org:admin", "org:member", "org:viewer"])
    .default("org:member"),
});

type InviteRole = z.infer<typeof inviteSchema>["role"];

function getConfiguredAuthProvider() {
  return process.env.AUTH_PROVIDER || process.env.NEXT_PUBLIC_AUTH_PROVIDER || "better-auth";
}

function normalizeClerkRole(role: InviteRole): "org:admin" | "org:member" | "org:viewer" {
  switch (role) {
    case "admin":
    case "org:admin":
      return "org:admin";
    case "viewer":
    case "org:viewer":
      return "org:viewer";
    case "member":
    case "org:member":
      return "org:member";
  }
}

function normalizeDbRole(role: InviteRole): "ADMIN" | "MEMBER" | "VIEWER" {
  return role.replace("org:", "").toUpperCase() as "ADMIN" | "MEMBER" | "VIEWER";
}

async function createClerkInvitations(input: {
  emails: string[];
  organizationId: string;
  role: InviteRole;
  inviterUserId: string;
}) {
  const { clerkClient } = await import("@clerk/nextjs/server");
  const client = await clerkClient();
  const role = normalizeClerkRole(input.role);

  await client.organizations.createOrganizationInvitationBulk(
    input.organizationId,
    input.emails.map((email) => ({
      emailAddress: email,
      role,
      inviterUserId: input.inviterUserId,
    })),
  );

  return { invited: input.emails.length, skipped: [] as Array<{ email: string; reason: string }> };
}

async function createDatabaseMembershipInvites(input: {
  emails: string[];
  organizationId: string;
  role: InviteRole;
}) {
  const systemDb = getSystemDb();
  const tenantDb = getTenantDb(input.organizationId);
  const role = normalizeDbRole(input.role);
  const skipped: Array<{ email: string; reason: string }> = [];
  let invited = 0;

  for (const email of input.emails) {
    const user = await systemDb.user.findUnique({ where: { email } });
    if (!user) {
      skipped.push({ email, reason: "user_not_found" });
      continue;
    }

    const existingMembership = await tenantDb.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId: input.organizationId,
          userId: user.id,
        },
      },
    });

    if (existingMembership) {
      skipped.push({ email, reason: "already_member" });
      continue;
    }

    await tenantDb.organizationMember.create({
      data: {
        organizationId: input.organizationId,
        role,
        userId: user.id,
      },
    });
    invited += 1;
  }

  return { invited, skipped };
}

export async function POST(request: Request) {
  try {
    const parsed = inviteSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid invitation details." }, { status: 400 });
    }

    const authState = await getAuth(request);
    if (!authState.userId) {
      return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    }

    if (!authState.orgId) {
      return NextResponse.json({ error: "Organization required." }, { status: 403 });
    }

    const currentRole = resolveRole(authState.sessionClaims?.org_role as string | undefined);
    if (!hasPermission(currentRole, "team:invite")) {
      return NextResponse.json({ error: "Insufficient permissions." }, { status: 403 });
    }

    const result =
      getConfiguredAuthProvider() === "clerk"
        ? await createClerkInvitations({
            emails: parsed.data.emails,
            organizationId: authState.orgId,
            role: parsed.data.role,
            inviterUserId: authState.userId,
          })
        : await createDatabaseMembershipInvites({
            emails: parsed.data.emails,
            organizationId: authState.orgId,
            role: parsed.data.role,
          });

    return NextResponse.json(result);
  } catch (error) {
    logger.error("[onboarding] Failed to invite members", {
      error: error instanceof Error ? error.message : "Unknown error",
    });
    return NextResponse.json({ error: "Failed to send invitations." }, { status: 500 });
  }
}
