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

export function canAttemptOrganizationOperations(capabilities: { organizations: boolean }) {
  // Better Auth mounts and probes plugins lazily inside organization methods.
  return provider === "better-auth" || capabilities.organizations;
}

export async function getOrganizationsForRequest(
  request: Request,
): Promise<OrganizationSummary[] | null> {
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
