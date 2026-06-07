import { isStartupOSPrototypeEnabled } from "@nebutra/startup-os/feature-flag";
import { NextResponse } from "next/server";
import { getAuth } from "@/lib/auth";
import type { CofounderDb } from "@/lib/cofounder/store";
import { getTenantDb } from "@/lib/db";
import { hasPermission, resolveRole, type Scope } from "@/lib/permissions";

/**
 * Shared auth/tenant gate for the Match-Your-Cofounder API, mirroring the
 * Startup OS `getRequestContext` precedent. Cofounder matching is downstream of
 * Startup OS (a founder needs a compiled company to opt in), so it rides the
 * same prototype flag for now.
 *
 * TODO(scopes): reuse the `project:*` scopes until dedicated `cofounder:*`
 * scopes land in `@/lib/permissions`. An org member who can read/create
 * projects is exactly who may browse the pool / opt in, so this is a safe
 * interim mapping — not a permission relaxation.
 */
export type CofounderRequestContext =
  | { readonly response: NextResponse }
  | {
      readonly tenantId: string;
      readonly userId: string;
      readonly db: CofounderDb;
    };

function disabledResponse(): NextResponse {
  return NextResponse.json({ error: "Cofounder matching is not enabled." }, { status: 404 });
}

export async function getCofounderContext(
  request: Request,
  scope: Scope,
): Promise<CofounderRequestContext> {
  if (!isStartupOSPrototypeEnabled()) {
    return { response: disabledResponse() };
  }

  const auth = await getAuth(request);
  if (!auth.isSignedIn || !auth.userId) {
    return {
      response: NextResponse.json({ error: "Authentication required." }, { status: 401 }),
    };
  }
  if (!auth.orgId) {
    return {
      response: NextResponse.json({ error: "Organization required." }, { status: 403 }),
    };
  }
  const role = resolveRole(auth.sessionClaims?.org_role as string | undefined);
  if (!hasPermission(role, scope)) {
    return { response: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }

  return {
    tenantId: auth.orgId,
    userId: auth.userId,
    db: getTenantDb(auth.orgId) as unknown as CofounderDb,
  };
}
