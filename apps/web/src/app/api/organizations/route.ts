import { createAuth } from "@nebutra/auth/server";
import { logger } from "@nebutra/logger";
import { NextResponse } from "next/server";

const provider =
  process.env.AUTH_PROVIDER || process.env.NEXT_PUBLIC_AUTH_PROVIDER || "better-auth";

interface OrganizationSummary {
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

async function getOrganizationsForRequest(request: Request): Promise<OrganizationSummary[] | null> {
  if (provider === "clerk") {
    const { auth, clerkClient } = await import("@clerk/nextjs/server");
    const { userId } = await auth();
    if (!userId) return null;

    const client = await clerkClient();
    const memberships = await client.users.getOrganizationMembershipList({ userId });
    return normalizeClerkOrganizations(memberships);
  }

  const auth = await createAuth({ provider: "better-auth" });
  const session = await auth.getSession(request);
  if (!session?.userId) return null;

  const organizations = await auth.getUserOrganizations(session.userId);
  return organizations.map((organization) => ({
    id: organization.id,
    name: organization.name,
    slug: organization.slug,
    image: null,
  }));
}

export async function GET(request: Request) {
  try {
    const organizations = await getOrganizationsForRequest(request);

    if (!organizations) {
      return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    }

    return NextResponse.json({ organizations });
  } catch (error) {
    logger.error("[organizations] Failed to list organizations", {
      provider,
      error: error instanceof Error ? error.message : "Unknown error",
    });

    return NextResponse.json({ error: "Failed to load organizations." }, { status: 500 });
  }
}
