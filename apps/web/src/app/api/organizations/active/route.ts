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

/**
 * Merge `Set-Cookie` (and any other) headers returned by
 * `auth.organizations.setActive(...)` (phase 2.3) into the outgoing response.
 *
 * Better Auth rotates the session token on active-org change; without
 * forwarding its `Set-Cookie`, the selection will not persist across requests.
 * This route is the canonical (and currently only) consumer of the new
 * `SetActiveResult` shape.
 */
function forwardSetCookieHeaders(target: ReturnType<typeof NextResponse.json>, source: Headers) {
  source.forEach((value, key) => {
    if (key.toLowerCase() === "set-cookie") {
      target.headers.append("set-cookie", value);
      return;
    }
    // Preserve Content-Type already on the NextResponse JSON envelope; only
    // forward headers BA explicitly sets and we don't already own.
    if (target.headers.has(key)) return;
    target.headers.set(key, value);
  });
}

export async function POST(request: Request) {
  let parsed: { organizationId: string };

  try {
    const raw = (await request.json().catch(() => null)) as unknown;
    const result = bodySchema.safeParse(raw);
    if (!result.success) {
      return NextResponse.json({ error: "Invalid organization selection." }, { status: 400 });
    }
    parsed = result.data;
  } catch {
    return NextResponse.json({ error: "Invalid organization selection." }, { status: 400 });
  }

  try {
    if (provider === "clerk") {
      const result = await setClerkActiveOrganization(parsed.organizationId);

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

    const auth = await createAuth({ provider: provider as "better-auth" | "clerk" | "nextauth" });
    const session = await auth.getSession(request);

    if (!session?.userId) {
      return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    }

    // Phase 2.5 — this route is the FIRST (and currently only) consumer of
    // `OrganizationCapability.setActive`'s new `{ headers }` return shape
    // (phase 2.3). If the live provider doesn't expose the capability (e.g.
    // org plugin failed to mount), we surface a 404 rather than crashing.
    if (!auth.organizations) {
      return NextResponse.json(
        { error: "Organizations are not enabled for this provider." },
        { status: 404 },
      );
    }

    let result: { headers: Headers };
    try {
      result = await auth.organizations.setActive(request, parsed.organizationId);
    } catch (error) {
      logger.error("[organizations] setActive rejected by provider", {
        provider,
        organizationId: parsed.organizationId,
        error: error instanceof Error ? error.message : "Unknown error",
      });

      return NextResponse.json(
        { error: "Unable to switch to that organization. Confirm membership and try again." },
        { status: 400 },
      );
    }

    const response = NextResponse.json({ ok: true, organizationId: parsed.organizationId });

    // Order matters: NextResponse's `cookies.set(...)` rewrites the `set-cookie`
    // header from its internal cookie list, which would clobber values appended
    // manually beforehand. So we (1) write the first-party cookie via the
    // NextResponse API first, then (2) append BA's `Set-Cookie` rotations onto
    // the final outgoing header list. This is the phase 2.3 wire-up: without
    // step 2, the active-org change does not persist across requests.
    setActiveOrganizationCookie(response, parsed.organizationId);
    forwardSetCookieHeaders(response, result.headers);

    return response;
  } catch (error) {
    logger.error("[organizations] Failed to set active organization", {
      provider,
      error: error instanceof Error ? error.message : "Unknown error",
    });

    return NextResponse.json({ error: "Failed to set active organization." }, { status: 500 });
  }
}
