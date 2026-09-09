import { NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/auth";
import { getApiKeyRepository, invalidateKeyCache, resolveSessionTenantId } from "@/lib/router-keys";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

/** Revoke. Takes effect at the /v1 edge immediately in this process. */
export async function DELETE(request: Request, context: RouteContext) {
  const session = await getSessionFromRequest(request);
  if (!session?.userId) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }
  const tenantId = await resolveSessionTenantId(session);
  if (!tenantId) {
    return NextResponse.json({ error: "No tenant for this account." }, { status: 403 });
  }
  const { id } = await context.params;
  const revoked = await getApiKeyRepository().revoke(tenantId, id);
  if (!revoked) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }
  invalidateKeyCache();
  return NextResponse.json({ ok: true });
}
