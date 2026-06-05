import { auditLogger } from "@nebutra/audit";
import { logger } from "@nebutra/logger";
import { getTenantProviderKeyRepository, type ProviderKeyCredentials } from "@nebutra/repositories";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getAuth } from "@/lib/auth";
import { hasPermission, resolveRole } from "@/lib/permissions";

// BYOK provider-key management for the dashboard. Routes through the repository
// seam + getTenantDb (RLS-scoped); the @nebutra/db extension encrypts the key on
// write and decrypts on read, so plaintext is masked here before it ever leaves
// the server.

const ProviderEnum = z.enum(["OPENAI", "ANTHROPIC", "GOOGLE", "SILICONFLOW", "CUSTOM"]);

const CreateBody = z.object({
  provider: ProviderEnum,
  apiKey: z.string().trim().min(8).max(400),
  baseUrl: z.string().url().max(300).optional(),
  label: z.string().trim().max(80).optional(),
  alwaysUse: z.boolean().optional(),
});

function maskKey(apiKey: string): string {
  return apiKey.length <= 4 ? "••••" : `••••${apiKey.slice(-4)}`;
}

function toIso(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : value;
}

export async function GET() {
  const auth = await getAuth();
  if (!auth.isSignedIn || !auth.userId) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }
  if (!auth.orgId) {
    return NextResponse.json({ error: "Organization required." }, { status: 403 });
  }

  const role = resolveRole(auth.sessionClaims?.org_role as string | undefined);
  if (!hasPermission(role, "provider_key:read")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const repo = getTenantProviderKeyRepository(auth.orgId);
    const rows = await repo.list();
    const keys = rows.map((row) => {
      const creds = row.credentials as unknown as ProviderKeyCredentials | null;
      return {
        id: row.id,
        provider: row.provider,
        label: row.label,
        isActive: row.isActive,
        alwaysUse: row.alwaysUse,
        baseUrl: creds?.baseUrl ?? null,
        maskedKey: creds?.apiKey ? maskKey(creds.apiKey) : null,
        createdAt: toIso(row.createdAt),
      };
    });
    return NextResponse.json({ keys });
  } catch (error) {
    logger.error("[provider-keys.GET] Failed to load keys", {
      error: error instanceof Error ? error.message : "Unknown error",
    });
    return NextResponse.json({ error: "Failed to load provider keys." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const auth = await getAuth();
  if (!auth.isSignedIn || !auth.userId) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }
  if (!auth.orgId) {
    return NextResponse.json({ error: "Organization required." }, { status: 403 });
  }

  const role = resolveRole(auth.sessionClaims?.org_role as string | undefined);
  if (!hasPermission(role, "provider_key:create")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = CreateBody.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input.", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { provider, apiKey, baseUrl, label, alwaysUse } = parsed.data;

  try {
    const repo = getTenantProviderKeyRepository(auth.orgId);
    const row = await repo.upsert({
      provider,
      apiKey,
      ...(baseUrl ? { baseUrl } : {}),
      ...(label !== undefined ? { label } : {}),
      ...(alwaysUse !== undefined ? { alwaysUse } : {}),
    });

    // SOC 2 audit — record provider-key registration. Never log the secret.
    await auditLogger(request, {
      actor: { id: auth.userId, type: "user" },
      tenantId: auth.orgId,
    }).log({
      action: "provider_key.created",
      outcome: "success",
      resource: { type: "provider_key", id: row.id, name: row.provider },
      severity: "warning",
      metadata: { provider: row.provider, alwaysUse: row.alwaysUse },
    });

    return NextResponse.json(
      {
        id: row.id,
        provider: row.provider,
        label: row.label,
        isActive: row.isActive,
        alwaysUse: row.alwaysUse,
        baseUrl: baseUrl ?? null,
        maskedKey: maskKey(apiKey),
        createdAt: toIso(row.createdAt),
      },
      { status: 201 },
    );
  } catch (error) {
    logger.error("[provider-keys.POST] Failed to save key", {
      error: error instanceof Error ? error.message : "Unknown error",
    });
    return NextResponse.json({ error: "Failed to save provider key." }, { status: 500 });
  }
}
