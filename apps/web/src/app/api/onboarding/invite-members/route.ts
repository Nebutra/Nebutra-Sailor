import { getConfiguredAuthProvider } from "@nebutra/auth";
import { getSystemDb } from "@nebutra/db";
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

const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

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

function normalizeInvitationRole(role: InviteRole): "admin" | "member" | "viewer" {
  return role.replace("org:", "") as "admin" | "member" | "viewer";
}

function generateToken(): string {
  // crypto.randomUUID is available in modern Node and the edge runtime.
  return globalThis.crypto.randomUUID();
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

async function createDatabaseInvitations(input: {
  emails: string[];
  organizationId: string;
  role: InviteRole;
  inviterUserId: string;
}) {
  const systemDb = getSystemDb();
  const role = normalizeInvitationRole(input.role);
  const skipped: Array<{ email: string; reason: string }> = [];
  let invited = 0;
  const expiresAt = new Date(Date.now() + INVITE_TTL_MS);

  for (const email of input.emails) {
    // Skip if there is already a pending invitation for the same email/org pair.
    const existingPending = await systemDb.organizationInvitation.findFirst({
      where: {
        email,
        organizationId: input.organizationId,
        status: "pending",
      },
    });

    if (existingPending) {
      skipped.push({ email, reason: "already_invited" });
      continue;
    }

    await systemDb.organizationInvitation.create({
      data: {
        email,
        organizationId: input.organizationId,
        role,
        inviterId: input.inviterUserId,
        token: generateToken(),
        expiresAt,
        status: "pending",
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
        : await createDatabaseInvitations({
            emails: parsed.data.emails,
            organizationId: authState.orgId,
            role: parsed.data.role,
            inviterUserId: authState.userId,
          });

    return NextResponse.json(result);
  } catch (error) {
    logger.error("[onboarding] Failed to invite members", {
      error: error instanceof Error ? error.message : "Unknown error",
    });
    return NextResponse.json({ error: "Failed to send invitations." }, { status: 500 });
  }
}
