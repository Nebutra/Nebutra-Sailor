import { getConfiguredAuthProvider } from "@nebutra/auth";
import { createAuth } from "@nebutra/auth/server";

/**
 * Reading the organizations a request's user belongs to.
 *
 * Lifted out of app/api/organizations/route.ts, where it was private. Path-
 * scoped tenancy resolves a URL slug against this same list from a Server
 * Component, and a route module cannot export helpers — Next only allows the
 * HTTP verbs. Two copies of "which workspaces is this user in" is exactly the
 * kind of duplication that drifts, so there is one, here.
 *
 * Membership is the whole answer: anything not in this list is not visible to
 * the caller, which is what lets a slug lookup 404 without revealing whether
 * the workspace exists.
 */

const provider = getConfiguredAuthProvider();

export interface OrganizationSummary {
  id: string;
  name: string;
  slug: string;
  image: string | null;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : null;
}

function readString(value: unknown) {
  return typeof value === "string" ? value : "";
}

export function canAttemptOrganizationOperations(capabilities: { organizations: boolean }) {
  // Better Auth mounts and probes plugins lazily inside organization methods.
  return provider === "better-auth" || capabilities.organizations;
}

function normalizeClerkOrganizations(input: unknown): OrganizationSummary[] {
  const payload = asRecord(input);
  const items = Array.isArray(payload?.data) ? payload.data : Array.isArray(input) ? input : [];

  return items
    .map((item) => {
      const membership = asRecord(item);
      const org =
        asRecord(membership?.organization) ??
        asRecord(membership?.publicOrganizationData) ??
        membership;

      if (!org) return null;

      const id = readString(org.id);
      if (!id) return null;

      return {
        id,
        name: readString(org.name) || "Untitled workspace",
        slug: readString(org.slug),
        image: readString(org.imageUrl) || null,
      } satisfies OrganizationSummary;
    })
    .filter((org): org is OrganizationSummary => Boolean(org));
}

export async function getOrganizationsForRequest(
  request: Request,
): Promise<OrganizationSummary[] | null> {
  if (provider === "clerk") {
    const { auth, clerkClient } = await import("@clerk/nextjs/server");
    const { userId } = await auth();
    if (!userId) return null;

    const client = await clerkClient();
    const memberships = await client.users.getOrganizationMembershipList({ userId });
    return normalizeClerkOrganizations(memberships);
  }

  const auth = await createAuth({ provider });
  const session = await auth.getSession(request);
  if (!session?.userId) return null;
  if (!canAttemptOrganizationOperations(auth.capabilities)) return [];

  const organizations = await auth.getUserOrganizations(session.userId, request);
  return organizations.map((organization) => ({
    id: organization.id,
    name: organization.name,
    slug: organization.slug,
    image: null,
  }));
}
