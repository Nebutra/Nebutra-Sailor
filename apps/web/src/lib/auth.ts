import type { Session, User } from "@nebutra/auth";
import { createAuth } from "@nebutra/auth/server";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { ACTIVE_ORG_COOKIE, resolveActiveOrganizationSelection } from "./active-organization";
import { getDefaultPublicUrls } from "./public-url-defaults";

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

  const provider = (process.env.NEXT_PUBLIC_AUTH_PROVIDER || "better-auth") as
    | "clerk"
    | "better-auth";

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

/**
 * Get the current user's auth state (server-side)
 * Use in Server Components or Route Handlers
 */
export async function getAuth(request?: Request) {
  const auth = await getAuthInstance();
  const session = await auth.getSession(request ?? (await buildServerRequest()));
  const orgId = await resolveActiveOrganizationId(session, auth);

  return {
    userId: session?.userId ?? null,
    orgId,
    sessionClaims: { org_plan: "FREE", org_role: "org:admin" }, // Placeholder for backward compatibility
    isSignedIn: !!session?.userId,
  };
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
  const { orgId } = await getAuth();
  const auth = await getAuthInstance();

  let plan = "FREE";
  if (orgId) {
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
