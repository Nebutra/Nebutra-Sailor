import { auditLogger } from "@nebutra/audit";
import { getConfiguredAuthProvider } from "@nebutra/auth";
import { createAuth } from "@nebutra/auth/server";
import { logger } from "@nebutra/logger";
import { NextResponse } from "next/server";
import { z } from "zod";
import { setActiveOrganizationCookie } from "@/lib/active-organization";

const provider = getConfiguredAuthProvider();

const CreateOrganizationSchema = z.object({
  name: z.string().trim().min(1).max(80),
  slug: z
    .string()
    .trim()
    .min(3)
    .max(48)
    .regex(/^[a-z0-9][a-z0-9-]*[a-z0-9]$/),
});

interface OrganizationSummary {
  id: string;
  name: string;
  slug: string;
  image: string | null;
}

type CreateOrganizationResult =
  | { status: "unauthenticated" }
  | { status: "unsupported" }
  | { status: "created"; organization: OrganizationSummary; creatorUserId: string };

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

  const auth = await createAuth({ provider });
  const session = await auth.getSession(request);
  if (!session?.userId) return null;
  if (!auth.capabilities.organizations) return [];

  const organizations = await auth.getUserOrganizations(session.userId);
  return organizations.map((organization) => ({
    id: organization.id,
    name: organization.name,
    slug: organization.slug,
    image: null,
  }));
}

async function createOrganizationForRequest(
  request: Request,
  input: z.infer<typeof CreateOrganizationSchema>,
): Promise<CreateOrganizationResult> {
  if (provider === "clerk") {
    const { auth, clerkClient } = await import("@clerk/nextjs/server");
    const { userId } = await auth();
    if (!userId) return { status: "unauthenticated" };

    const client = await clerkClient();
    const organization = await client.organizations.createOrganization({
      name: input.name,
      slug: input.slug,
      createdBy: userId,
    });

    return {
      status: "created",
      organization: {
        id: organization.id,
        name: organization.name,
        slug: organization.slug ?? input.slug,
        image: organization.imageUrl ?? null,
      },
      creatorUserId: userId,
    };
  }

  const auth = await createAuth({ provider });
  const session = await auth.getSession(request);
  if (!session?.userId) return { status: "unauthenticated" };
  if (!auth.capabilities.organizations) return { status: "unsupported" };

  const organization = await auth.createOrganization({
    name: input.name,
    slug: input.slug,
    createdByUserId: session.userId,
  });

  return {
    status: "created",
    organization: {
      id: organization.id,
      name: organization.name,
      slug: organization.slug,
      image: null,
    },
    creatorUserId: session.userId,
  };
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

export async function POST(request: Request) {
  let payload: unknown;

  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid organization details." }, { status: 400 });
  }

  const parsed = CreateOrganizationSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid organization details." }, { status: 400 });
  }

  try {
    const created = await createOrganizationForRequest(request, parsed.data);

    if (created.status === "unauthenticated") {
      return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    }

    if (created.status === "unsupported") {
      return NextResponse.json(
        { error: "Organizations are not enabled for this provider." },
        { status: 404 },
      );
    }

    const { organization, creatorUserId } = created;

    await auditLogger(request, {
      actor: { id: creatorUserId, type: "user" },
      tenantId: organization.id,
    }).log({
      action: "org.created",
      outcome: "success",
      resource: { type: "organization", id: organization.id, name: organization.name },
      severity: "info",
      metadata: { slug: organization.slug },
    });

    const response = NextResponse.json(
      {
        organizationId: organization.id,
        organization,
      },
      { status: 201 },
    );
    setActiveOrganizationCookie(response, organization.id);

    return response;
  } catch (error) {
    logger.error("[organizations] Failed to create organization", {
      provider,
      error: error instanceof Error ? error.message : "Unknown error",
    });

    return NextResponse.json({ error: "Failed to create organization." }, { status: 500 });
  }
}
