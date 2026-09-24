import { auditLogger } from "@nebutra/audit";
import { getConfiguredAuthProvider, isOrganizationsUnavailableError } from "@nebutra/auth";
import { createAuth } from "@nebutra/auth/server";
import { logger } from "@nebutra/logger";
import { NextResponse } from "next/server";
import { z } from "zod";
import { setActiveOrganizationCookie } from "@/lib/active-organization";
import {
  classifyOrganizationCreateError,
  ORGANIZATION_ERROR_CODES,
} from "@/lib/organization-errors";
import {
  canAttemptOrganizationOperations,
  getOrganizationsForRequest,
  type OrganizationSummary,
} from "@/lib/organizations";

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

type CreateOrganizationResult =
  | { status: "unauthenticated" }
  | { status: "unsupported" }
  | { status: "created"; organization: OrganizationSummary; creatorUserId: string };

async function createOrganizationForRequest(
  request: Request,
  input: z.infer<typeof CreateOrganizationSchema>,
): Promise<CreateOrganizationResult> {
  const auth = await createAuth({ provider });
  const session = await auth.getSession(request);
  if (!session?.userId) return { status: "unauthenticated" };
  if (!canAttemptOrganizationOperations(auth.capabilities)) return { status: "unsupported" };

  const organization = await auth.createOrganization({
    name: input.name,
    slug: input.slug,
    createdByUserId: session.userId,
    request,
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
        {
          code: ORGANIZATION_ERROR_CODES.notEnabled,
          error: "Organizations are not enabled for this provider.",
        },
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
    const code = classifyOrganizationCreateError(error, isOrganizationsUnavailableError);

    logger.error("[organizations] Failed to create organization", {
      provider,
      code: code ?? "unclassified",
      error: error instanceof Error ? error.message : "Unknown error",
    });

    // A cause the UI can act on gets its own status and code. Only a genuinely
    // unknown failure falls through to the opaque 500 — previously everything
    // did, so "workspace creation failed" covered a missing plugin and a taken
    // slug alike.
    if (code === ORGANIZATION_ERROR_CODES.notEnabled) {
      return NextResponse.json(
        { code, error: "Organizations are not enabled for this deployment." },
        { status: 404 },
      );
    }

    if (code === ORGANIZATION_ERROR_CODES.slugTaken) {
      return NextResponse.json(
        { code, error: "That workspace address is already taken." },
        { status: 409 },
      );
    }

    return NextResponse.json({ error: "Failed to create organization." }, { status: 500 });
  }
}
