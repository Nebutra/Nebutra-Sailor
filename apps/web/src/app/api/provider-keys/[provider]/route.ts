import { auditLogger } from "@nebutra/audit";
import { logger } from "@nebutra/logger";
import { getTenantProviderKeyRepository } from "@nebutra/repositories";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getAuth } from "@/lib/auth";
import { hasPermission, resolveRole } from "@/lib/permissions";

const ProviderEnum = z.enum(["OPENAI", "ANTHROPIC", "GOOGLE", "SILICONFLOW", "CUSTOM"]);

interface RouteContext {
  params: Promise<{ provider: string }>;
}

export async function DELETE(request: Request, context: RouteContext) {
  const auth = await getAuth();
  if (!auth.isSignedIn || !auth.userId) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }
  if (!auth.orgId) {
    return NextResponse.json({ error: "Organization required." }, { status: 403 });
  }

  const role = resolveRole(auth.sessionClaims?.org_role as string | undefined);
  if (!hasPermission(role, "provider_key:delete")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const parsedProvider = ProviderEnum.safeParse((await context.params).provider);
  if (!parsedProvider.success) {
    return NextResponse.json({ error: "Unknown provider." }, { status: 400 });
  }
  const provider = parsedProvider.data;

  try {
    const repo = getTenantProviderKeyRepository(auth.orgId);
    const existing = await repo.findByProvider(provider);
    if (!existing) {
      return NextResponse.json({ error: "Provider key not found." }, { status: 404 });
    }
    await repo.delete(provider);

    await auditLogger(request, {
      actor: { id: auth.userId, type: "user" },
      tenantId: auth.orgId,
    }).log({
      action: "provider_key.deleted",
      outcome: "success",
      resource: { type: "provider_key", id: existing.id, name: provider },
      severity: "warning",
      metadata: { provider },
    });

    return NextResponse.json({ deleted: true, provider });
  } catch (error) {
    logger.error("[provider-keys.DELETE] Failed to delete key", {
      error: error instanceof Error ? error.message : "Unknown error",
    });
    return NextResponse.json({ error: "Failed to delete provider key." }, { status: 500 });
  }
}
