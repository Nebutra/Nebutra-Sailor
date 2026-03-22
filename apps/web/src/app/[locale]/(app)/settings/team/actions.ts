"use server";

import { auth, clerkClient } from "@clerk/nextjs/server";
import { z } from "zod";
import { hasPermission, resolveRole } from "@/lib/permissions";

export type InviteState =
  | { status: "idle" }
  | { status: "success" }
  | { status: "error"; message: string };

const inviteSchema = z.object({
  email: z.string().email(),
  orgId: z.string().min(1),
  role: z.enum(["org:admin", "org:member"]).default("org:member"),
});

export async function inviteTeamMember(
  _prev: InviteState,
  formData: FormData,
): Promise<InviteState> {
  const { orgId: sessionOrgId, sessionClaims } = await auth();

  if (!sessionOrgId) {
    return { status: "error", message: "You must be in an organization to invite members." };
  }

  const role = resolveRole(sessionClaims?.org_role as string | undefined);
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
  if (orgId !== sessionOrgId) {
    return { status: "error", message: "Organization mismatch." };
  }

  try {
    const client = await clerkClient();
    await client.organizations.createOrganizationInvitation({
      organizationId: orgId,
      emailAddress: email,
      role: inviteeRole,
      redirectUrl: `${process.env.NEXT_PUBLIC_APP_URL}/accept-invite`,
    });

    return { status: "success" };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to send invitation.";
    return { status: "error", message };
  }
}
