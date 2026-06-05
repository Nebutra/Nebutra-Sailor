import { getConfiguredAuthProvider } from "@nebutra/auth";
import { createAuth } from "@nebutra/auth/server";
import { getSystemDb } from "@nebutra/db";

/**
 * Provider-aware team provisioning for cofounder form-team. Mirrors the proven
 * patterns in `api/organizations/route.ts` and `api/onboarding/invite-members/route.ts`
 * (kept additive to avoid refactoring those tested routes under concurrent edits;
 * TODO: dedupe into one shared org helper once the sessions settle).
 *
 * Cofounders join the new org as ADMIN — they are equal founders, not regular
 * members.
 */

const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export type CreateTeamOrgResult =
  | { status: "created"; organizationId: string; slug: string }
  | { status: "unsupported" };

/** Resolve the matched cofounder's email from their user id (for the invitation). */
export async function resolveFounderEmail(userId: string): Promise<string | null> {
  const systemDb = getSystemDb();
  const user = await systemDb.user.findUnique({ where: { id: userId }, select: { email: true } });
  return user?.email ?? null;
}

/** Build a valid org slug (^[a-z0-9][a-z0-9-]*[a-z0-9]$, 3-48 chars) from a name. */
export function deriveTeamSlug(name: string, suffix: string): string {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  const safeBase = base.length >= 2 ? base : "team";
  return `${safeBase}-${suffix}`.slice(0, 48);
}

export async function createTeamOrganization(
  request: Request,
  input: { name: string; slug: string; creatorUserId: string },
): Promise<CreateTeamOrgResult> {
  const provider = getConfiguredAuthProvider();

  if (provider === "clerk") {
    const { clerkClient } = await import("@clerk/nextjs/server");
    const client = await clerkClient();
    const org = await client.organizations.createOrganization({
      name: input.name,
      slug: input.slug,
      createdBy: input.creatorUserId,
    });
    return { status: "created", organizationId: org.id, slug: org.slug ?? input.slug };
  }

  const auth = await createAuth({ provider });
  if (!auth.capabilities.organizations) {
    return { status: "unsupported" };
  }
  try {
    const org = await auth.createOrganization({
      name: input.name,
      slug: input.slug,
      createdByUserId: input.creatorUserId,
      request,
    });
    return { status: "created", organizationId: org.id, slug: org.slug };
  } catch {
    // e.g. the dev provider advertises the capability but cannot actually create
    // orgs — treat as unsupported rather than 500.
    return { status: "unsupported" };
  }
}

/** Invite the cofounder (by email) into the new org as admin. */
export async function inviteCofounderToTeam(input: {
  organizationId: string;
  email: string;
  inviterUserId: string;
}): Promise<void> {
  const provider = getConfiguredAuthProvider();

  if (provider === "clerk") {
    const { clerkClient } = await import("@clerk/nextjs/server");
    const client = await clerkClient();
    await client.organizations.createOrganizationInvitationBulk(input.organizationId, [
      { emailAddress: input.email, role: "org:admin", inviterUserId: input.inviterUserId },
    ]);
    return;
  }

  const systemDb = getSystemDb();
  const existing = await systemDb.organizationInvitation.findFirst({
    where: { email: input.email, organizationId: input.organizationId, status: "pending" },
  });
  if (existing) return;
  await systemDb.organizationInvitation.create({
    data: {
      email: input.email,
      organizationId: input.organizationId,
      role: "admin",
      inviterId: input.inviterUserId,
      token: globalThis.crypto.randomUUID(),
      expiresAt: new Date(Date.now() + INVITE_TTL_MS),
      status: "pending",
    },
  });
}
