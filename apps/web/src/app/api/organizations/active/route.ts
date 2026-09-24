import { getConfiguredAuthProvider } from "@nebutra/auth";
import { createAuth } from "@nebutra/auth/server";
import { logger } from "@nebutra/logger";
import { NextResponse } from "next/server";
import { z } from "zod";
import { setActiveOrganizationCookie } from "@/lib/active-organization";

const provider = getConfiguredAuthProvider();

const bodySchema = z.object({
  organizationId: z.string().min(1),
});

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
    const auth = await createAuth({ provider });
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
