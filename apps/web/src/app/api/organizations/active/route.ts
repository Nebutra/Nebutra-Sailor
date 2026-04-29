import { createAuth } from "@nebutra/auth/server";
import { logger } from "@nebutra/logger";
import { NextResponse } from "next/server";
import { z } from "zod";
import { setActiveOrganizationCookie } from "@/lib/active-organization";

const provider =
  process.env.AUTH_PROVIDER || process.env.NEXT_PUBLIC_AUTH_PROVIDER || "better-auth";

const bodySchema = z.object({
  organizationId: z.string().min(1),
});

interface OrganizationSummary {
  id: string;
  name: string;
  slug: string;
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
      } satisfies OrganizationSummary;
    })
    .filter((organization): organization is OrganizationSummary => Boolean(organization));
}

async function setClerkActiveOrganization(organizationId: string) {
  const { auth, clerkClient } = await import("@clerk/nextjs/server");
  const { userId } = await auth();
  if (!userId) {
    return { status: "unauthenticated" as const };
  }

  const client = await clerkClient();
  const memberships = await client.users.getOrganizationMembershipList({ userId });
  const organizations = normalizeClerkOrganizations(memberships);
  const selectedOrganization = organizations.find(
    (organization) => organization.id === organizationId,
  );

  if (!selectedOrganization) {
    return { status: "not-found" as const };
  }

  return {
    status: "ok" as const,
    organization: selectedOrganization,
  };
}

export async function POST(request: Request) {
  try {
    const parsed = bodySchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid organization selection." }, { status: 400 });
    }

    if (provider === "clerk") {
      const result = await setClerkActiveOrganization(parsed.data.organizationId);

      if (result.status === "unauthenticated") {
        return NextResponse.json({ error: "Authentication required." }, { status: 401 });
      }

      if (result.status === "not-found") {
        return NextResponse.json({ error: "Organization not found." }, { status: 404 });
      }

      const response = NextResponse.json({
        organizationId: result.organization.id,
        name: result.organization.name,
        slug: result.organization.slug,
      });

      setActiveOrganizationCookie(response, result.organization.id);
      return response;
    }

    const auth = await createAuth({ provider: provider as "better-auth" | "clerk" });
    const session = await auth.getSession(request);

    if (!session?.userId) {
      return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    }

    const organizations = await auth.getUserOrganizations(session.userId);
    const selectedOrganization = organizations.find(
      (organization) => organization.id === parsed.data.organizationId,
    );

    if (!selectedOrganization) {
      return NextResponse.json({ error: "Organization not found." }, { status: 404 });
    }

    const response = NextResponse.json({
      organizationId: selectedOrganization.id,
      name: selectedOrganization.name,
      slug: selectedOrganization.slug,
    });

    setActiveOrganizationCookie(response, selectedOrganization.id);
    return response;
  } catch (error) {
    logger.error("[organizations] Failed to set active organization", {
      provider,
      error: error instanceof Error ? error.message : "Unknown error",
    });

    return NextResponse.json({ error: "Failed to set active organization." }, { status: 500 });
  }
}
