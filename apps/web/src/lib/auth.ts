import type { Session, User } from "@nebutra/auth";
import { createAuth } from "@nebutra/auth/server";
import { redirect } from "next/navigation";

// Singleton auth instance — lazily initialized
let authInstance: Awaited<ReturnType<typeof createAuth>> | null = null;

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

/**
 * Get the current user's auth state (server-side)
 * Use in Server Components or Route Handlers
 */
export async function getAuth() {
  const auth = await getAuthInstance();
  const session = await auth.getSession();

  return {
    userId: session?.userId ?? null,
    orgId: session?.organizationId ?? null,
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
  const session = await auth.getSession();

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
