import { DEFAULT_PRODUCT_SCOPES, issueApiKey } from "@nebutra/prepaid-wallet";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionFromRequest } from "@/lib/auth";
import { getApiKeyRepository, resolveSessionTenantId } from "@/lib/router-keys";

export const dynamic = "force-dynamic";

const CreateBody = z.object({ name: z.string().trim().min(1).max(64).default("default") });

/**
 * Console key management. Keys are rows in the shared `APIKey` table (the same
 * table as app settings and the gateway), scoped by the session's tenant, and
 * the /v1 edge validates them. There is no second store.
 */
async function requireTenant(request: Request) {
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
  return { session, tenantId };
}

export async function GET(request: Request) {
  const ctx = await requireTenant(request);
  if ("error" in ctx) return ctx.error;
  const keys = await getApiKeyRepository().listByTenant(ctx.tenantId);
  return NextResponse.json({ keys });
}

export async function POST(request: Request) {
  const parsed = CreateBody.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input." }, { status: 400 });
  }
  const { name } = parsed.data;

  const ctx = await requireTenant(request);
  if ("error" in ctx) return ctx.error;

  const issued = issueApiKey({ scopes: DEFAULT_PRODUCT_SCOPES });
  const created = await getApiKeyRepository().create({
    name,
    keyHash: issued.keyHash,
    keyPrefix: issued.keyPrefix,
    tenantId: ctx.tenantId,
    createdById: ctx.session.userId,
    scopes: [...issued.scopes],
  });
  // Plaintext is returned once and never stored.
  return NextResponse.json({ ...created, fullKey: issued.fullKey }, { status: 201 });
}
