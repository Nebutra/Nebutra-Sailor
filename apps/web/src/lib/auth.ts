import "server-only";

import type { Session, User } from "@nebutra/auth";
import {
  buildAuthCenterSignInUrl,
  buildDefaultPostLoginUrl,
  getConfiguredAuthProvider,
} from "@nebutra/auth";
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
const DEFAULT_ORG_ROLE = "org:viewer";

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

/**
 * The incoming request, reconstructed from the Server Component header store.
 *
 * Exported because the auth provider APIs take a Request and Server
 * Components do not have one — the tenant slug route needs the same object
 * this module builds, and a second reconstruction would be a second thing to
 * keep correct.
 */
export async function buildServerRequest(): Promise<Request> {
  return createServerRequestFromHeaders(new Headers(await headers()));
}

async function resolveActiveOrganizationId(
  session: Session | null,
  auth: Awaited<ReturnType<typeof createAuth>>,
  request?: Request,
): Promise<string | null> {
  if (!session?.userId) {
    return null;
  }

  if (session.organizationId) {
    return session.organizationId;
  }

  const cookieStore = await cookies();
  const selectedOrganizationId = cookieStore.get(ACTIVE_ORG_COOKIE)?.value ?? null;
  const organizations = await auth.getUserOrganizations(session.userId, request);
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
  const requestContext = request ?? (await buildServerRequest());
  const session = await auth.getSession(requestContext);
  const orgId = await resolveActiveOrganizationId(session, auth, requestContext);

  return {
    userId: session?.userId ?? null,
    orgId,
    sessionClaims: { org_plan: "FREE", org_role: DEFAULT_ORG_ROLE },
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
 * Require authentication, redirect to login center if not authenticated.
 * Multi-app RP model: product apps never own the primary login UI.
 */
export async function requireAuth() {
  const { userId } = await getAuth();

  if (!userId) {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || defaultPublicUrls.appUrl;
    redirect(buildAuthCenterSignInUrl(buildDefaultPostLoginUrl(appUrl)));
  }

  return { userId };
}

/**
 * Require a signed-in user, and send a signed-out one back to `path` after
 * signing in rather than to the dashboard — for pages reached from another
 * product, like checkout.
 */
export async function requireAuthReturningTo(path: string) {
  const { userId } = await getAuth();
  if (!userId) {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || defaultPublicUrls.appUrl;
    const safePath = path.startsWith("/") && !path.startsWith("//") ? path : "/";
    redirect(buildAuthCenterSignInUrl(new URL(safePath, appUrl).toString()));
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
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || defaultPublicUrls.appUrl;
    redirect(buildAuthCenterSignInUrl(`${appUrl.replace(/\/$/, "")}/select-org`));
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
  const request = await buildServerRequest();
  const { orgId } = await getAuth(request);

  let plan = "FREE";
  if (orgId) {
    const auth = await getAuthInstance();
    const org = await auth.getOrganization(orgId, request);
    if (org?.plan) {
      plan = org.plan;
    }
  }

  return {
    tenantId: orgId,
    plan,
  };
}
