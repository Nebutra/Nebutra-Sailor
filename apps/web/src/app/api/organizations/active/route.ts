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

export async function POST(request: Request) {
  try {
    const parsed = bodySchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid organization selection." }, { status: 400 });
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
