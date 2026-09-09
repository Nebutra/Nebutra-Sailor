import "server-only";

import { NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/auth";
import { resolveSessionTenantId } from "@/lib/router-keys";

/**
 * Resolve the session's tenant for a console route, or return the response to
 * send. Console routes are never public — the wallet used to be an
 * unauthenticated mutation keyed to a literal `"demo"` tenant.
 */
export async function requireConsoleTenant(
  request: Request,
): Promise<{ tenantId: string; userId: string } | { error: NextResponse }> {
  const session = await getSessionFromRequest(request);
  if (!session?.userId) {
    return { error: NextResponse.json({ error: "Authentication required." }, { status: 401 }) };
  }
  const tenantId = await resolveSessionTenantId(session);
  if (!tenantId) {
    return {
      error: NextResponse.json(
        { error: "No tenant for this account yet. Sign in to the app once to provision it." },
        { status: 403 },
      ),
    };
  }
  return { tenantId, userId: session.userId };
}
