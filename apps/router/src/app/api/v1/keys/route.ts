import { DEFAULT_PRODUCT_SCOPES, issueApiKey } from "@nebutra/prepaid-wallet";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionFromRequest } from "@/lib/auth";
import { createKey, listKeys } from "@/lib/demo-store";
import { getApiKeyRepository, resolveSessionTenantId, routerKeyStoreMode } from "@/lib/router-keys";

export const dynamic = "force-dynamic";

const CreateBody = z.object({ name: z.string().trim().min(1).max(64).default("default") });

/**
 * Console key management. In `nebutra` mode keys are rows in the shared
 * APIKey table (same table as app settings and the gateway) scoped by the
 * session's tenant, and the /v1 edge validates them. In legacy mode the demo
 * store keeps the console usable without a database.
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
  if (routerKeyStoreMode() !== "nebutra") {
    return NextResponse.json({ keys: listKeys(), store: "demo" });
  }
  const ctx = await requireTenant(request);
  if ("error" in ctx) return ctx.error;
  const keys = await getApiKeyRepository().listByTenant(ctx.tenantId);
  return NextResponse.json({ keys, store: "nebutra" });
}

export async function POST(request: Request) {
  const parsed = CreateBody.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input." }, { status: 400 });
  }
  const { name } = parsed.data;

  if (routerKeyStoreMode() !== "nebutra") {
    const key = createKey(name);
    return NextResponse.json({
      id: key.id,
      name: key.name,
      keyPrefix: key.keyPrefix,
      scopes: key.scopes,
      fullKey: key.fullKey,
      warning: "Shown once only in demo store",
    });
  }

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
