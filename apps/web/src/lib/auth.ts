import "server-only";

import type { Session, User } from "@nebutra/auth";
import { getConfiguredAuthProvider } from "@nebutra/auth";
import { createAuth } from "@nebutra/auth/server";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { ACTIVE_ORG_COOKIE, resolveActiveOrganizationSelection } from "./active-organization";
import { getDefaultPublicUrls } from "./public-url-defaults";

type ServerSessionClaims = Record<string, unknown> & {
  org_plan?: string;
  org_role?: string;
};

interface ServerAuthState {
  userId: string | null;
  orgId: string | null;
  sessionClaims: ServerSessionClaims;
  isSignedIn: boolean;
}

// Singleton auth instance — lazily initialized
let authInstance: Awaited<ReturnType<typeof createAuth>> | null = null;
const defaultPublicUrls = getDefaultPublicUrls(process.env.NODE_ENV);

/**
 * Get or create the singleton auth instance.
 * Detects provider from NEXT_PUBLIC_AUTH_PROVIDER env var.
 */
async function getAuthInstance() {
  if (authInstance) {
    return authInstance;
  }

  const provider = getConfiguredAuthProvider();
  authInstance = await createAuth({ provider });
  return authInstance;
}

export function resolveServerRequestOrigin(
  requestHeaders: Headers,
  fallbackOrigin = process.env.NEXT_PUBLIC_APP_URL || defaultPublicUrls.appUrl,
): string {
  const forwardedHost = requestHeaders.get("x-forwarded-host");
  const forwardedProto = requestHeaders.get("x-forwarded-proto") || "https";
  return forwardedHost ? `${forwardedProto}://${forwardedHost}` : fallbackOrigin;
}

export function createServerRequestFromHeaders(
  requestHeaders: Headers,
  fallbackOrigin = process.env.NEXT_PUBLIC_APP_URL || defaultPublicUrls.appUrl,
): Request {
  const origin = resolveServerRequestOrigin(requestHeaders, fallbackOrigin);
  return new Request(origin, { headers: requestHeaders });
}

async function buildServerRequest(): Promise<Request> {
  return createServerRequestFromHeaders(new Headers(await headers()));
}

async function resolveActiveOrganizationId(
  session: Session | null,
  auth: Awaited<ReturnType<typeof createAuth>>,
): Promise<string | null> {
  if (!session?.userId) {
    return null;
  }

  if (session.organizationId) {
    return session.organizationId;
  }

  const cookieStore = await cookies();
  const selectedOrganizationId = cookieStore.get(ACTIVE_ORG_COOKIE)?.value ?? null;
  const organizations = await auth.getUserOrganizations(session.userId);
  return resolveActiveOrganizationSelection({
    sessionOrganizationId: session.organizationId ?? null,
    cookieOrganizationId: selectedOrganizationId,
    organizations,
  });
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : null;
}

function normalizeClerkOrganizationCandidates(input: unknown): Array<{ id: string }> {
  const payload = asRecord(input);
  const items = Array.isArray(payload?.data) ? payload.data : Array.isArray(input) ? input : [];

  return items
    .map((item) => {
      const membership = asRecord(item);
      const org =
        asRecord(membership?.organization) ??
        asRecord(membership?.publicOrganizationData) ??
        membership;
      const id = typeof org?.id === "string" ? org.id : null;
      return id ? { id } : null;
    })
    .filter((organization): organization is { id: string } => Boolean(organization));
}

async function resolveClerkActiveOrganizationId(userId: string, sessionOrgId?: string | null) {
  if (sessionOrgId) {
    return sessionOrgId;
  }

  const cookieStore = await cookies();
  const selectedOrganizationId = cookieStore.get(ACTIVE_ORG_COOKIE)?.value ?? null;
  const { clerkClient } = await import("@clerk/nextjs/server");
  const client = await clerkClient();
  const memberships = await client.users.getOrganizationMembershipList({ userId });

  return resolveActiveOrganizationSelection({
    sessionOrganizationId: sessionOrgId ?? null,
    cookieOrganizationId: selectedOrganizationId,
    organizations: normalizeClerkOrganizationCandidates(memberships),
  });
}

async function getClerkAuth(): Promise<ServerAuthState> {
  const { auth } = await import("@clerk/nextjs/server");
  const session = await auth();
  const userId = session.userId ?? null;

  if (!userId) {
    return {
      userId: null,
      orgId: null,
      sessionClaims: {},
      isSignedIn: false,
    };
  }

  const orgId = await resolveClerkActiveOrganizationId(userId, session.orgId ?? null);
  const rawClaims = asRecord(session.sessionClaims) ?? {};
  const orgRole =
    typeof session.orgRole === "string"
      ? session.orgRole
      : typeof rawClaims.org_role === "string"
        ? rawClaims.org_role
        : "org:admin";

  return {
    userId,
    orgId,
    sessionClaims: {
      ...rawClaims,
      org_role: orgRole,
    } as ServerSessionClaims,
    isSignedIn: true,
  };
}

/**
 * Get the current user's auth state (server-side)
 * Use in Server Components or Route Handlers
 */
export async function getAuth(request?: Request) {
  if (getConfiguredAuthProvider() === "clerk") {
    return getClerkAuth();
  }

  const auth = await getAuthInstance();
  const session = await auth.getSession(request ?? (await buildServerRequest()));
  const orgId = await resolveActiveOrganizationId(session, auth);

  return {
    userId: session?.userId ?? null,
    orgId,
    sessionClaims: { org_plan: "FREE", org_role: "org:admin" }, // Placeholder for backward compatibility
    isSignedIn: !!session?.userId,
  } satisfies ServerAuthState;
}

/**
 * Get the current user object (server-side)
 * Use when you need full user data
 */
export async function getUser(): Promise<User | null> {
  const auth = await getAuthInstance();
  const session = await auth.getSession(await buildServerRequest());

  if (!session?.userId) {
    return null;
  }

  return auth.getUser(session.userId);
}

/**
 * Require authentication, redirect to sign-in if not authenticated
 * Use at the top of protected Server Components
 */
export async function requireAuth() {
  const { userId } = await getAuth();

  if (!userId) {
    redirect("/sign-in");
  }

  return { userId };
}

/**
 * Require organization membership
 * Use for multi-tenant routes
 */
export async function requireOrg() {
  const { userId, orgId } = await getAuth();

  if (!userId) {
    redirect("/sign-in");
  }

  if (!orgId) {
    redirect("/select-org");
  }

  return { userId, orgId };
}

/**
 * Get tenant context from organization
 */
export async function getTenantContext() {
  const { orgId, sessionClaims } = await getAuth();

  if (getConfiguredAuthProvider() === "clerk") {
    return {
      tenantId: orgId,
      plan: typeof sessionClaims.org_plan === "string" ? sessionClaims.org_plan : "FREE",
    };
  }

  let plan = "FREE";
  if (orgId) {
    const auth = await getAuthInstance();
    const org = await auth.getOrganization(orgId);
    if (org?.plan) {
      plan = org.plan;
    }
  }

  return {
    tenantId: orgId,
    plan,
  };
}
