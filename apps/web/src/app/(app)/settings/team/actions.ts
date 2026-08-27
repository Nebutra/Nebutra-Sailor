"use server";

import { z } from "zod";
import { getAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import { hasPermission, resolveRole } from "@/lib/permissions";

export type InviteState =
  | { status: "idle" }
  | { status: "success" }
  | { status: "error"; message: string };

const inviteSchema = z.object({
  email: z.string().email(),
  orgId: z.string().min(1),
  role: z
    .enum(["admin", "member", "viewer", "org:admin", "org:member", "org:viewer"])
    .default("member"),
});

function normalizeInviteRole(role: z.infer<typeof inviteSchema>["role"]) {
  return role.replace("org:", "").toUpperCase() as "ADMIN" | "MEMBER" | "VIEWER";
}

export async function inviteTeamMember(
  _prev: InviteState,
  formData: FormData,
): Promise<InviteState> {
  const authState = await getAuth();

  if (!authState.orgId) {
    return { status: "error", message: "You must be in an organization to invite members." };
  }

  const role = resolveRole(authState.sessionClaims?.org_role as string | undefined);
  if (!hasPermission(role, "team:invite")) {
    return { status: "error", message: "You don't have permission to invite members." };
  }

  const parsed = inviteSchema.safeParse({
    email: formData.get("email"),
    orgId: formData.get("orgId"),
    role: formData.get("role"),
  });

  if (!parsed.success) {
    return { status: "error", message: "Invalid email address." };
  }

  const { email, orgId, role: inviteeRole } = parsed.data;

  // Verify the orgId matches the session org (prevents cross-org invite)
  if (orgId !== authState.orgId) {
    return { status: "error", message: "Organization mismatch." };
  }

  try {
    // Find user by email
    const user = await db.user.findUnique({ where: { email } });

    if (!user) {
      return {
        status: "error",
        message: "User not found. They may need to create an account first.",
      };
    }

    // Check if user is already a member
    const existingMembership = await db.organizationMember.findUnique({
      where: {
        organizationId_userId: { userId: user.id, organizationId: orgId },
      },
    });

    if (existingMembership) {
      return { status: "error", message: "User is already a member of this organization." };
    }

    // Create membership
    await db.organizationMember.create({
      data: {
        userId: user.id,
        organizationId: orgId,
        role: normalizeInviteRole(inviteeRole),
      },
    });

    return { status: "success" };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to add member to organization.";
    return { status: "error", message };
  }
}
