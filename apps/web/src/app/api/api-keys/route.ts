import { createHash, randomBytes } from "node:crypto";
import { auditLogger } from "@nebutra/audit";
import { logger } from "@nebutra/logger";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import { hasPermission, resolveRole } from "@/lib/permissions";

// ── Helpers ──────────────────────────────────────────────────────────────────

const BASE62 = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";

/**
 * Generates 32 random bytes mapped to base62.
 * Output length is variable (~43 chars) but contains only [A-Za-z0-9],
 * which is human-copyable, URL-safe, and avoids ambiguous characters.
 */
function randomBase62(byteCount = 32): string {
  const bytes = randomBytes(byteCount);
  let out = "";
  for (let i = 0; i < bytes.length; i++) {
    out += BASE62[bytes[i] % 62];
  }
  return out;
}

/**
 * Generates a fresh API key, its sha256 hash, and a stable 12-char prefix.
 * Format: `nbk_live_<random>`
 */
export function generateApiKey(): { key: string; keyHash: string; keyPrefix: string } {
  const key = `nbk_live_${randomBase62(32)}`;
  const keyHash = createHash("sha256").update(key).digest("hex");
  const keyPrefix = key.slice(0, 12);
  return { key, keyHash, keyPrefix };
}

const CreateBody = z.object({
  name: z.string().trim().min(1).max(64),
  scopes: z.array(z.string().min(1).max(64)).default([]),
  rateLimitRps: z.number().int().positive().max(10_000).optional(),
  expiresAt: z.string().datetime().optional(),
});

interface ApiKeyRow {
  id: string;
  name: string;
  keyPrefix: string;
  lastUsedAt: Date | string | null;
  scopes: string[];
  rateLimitRps: number;
  expiresAt: Date | string | null;
  createdAt: Date | string;
}

function serializeKey(row: ApiKeyRow) {
  const toIso = (v: Date | string | null) =>
    v instanceof Date ? v.toISOString() : (v as string | null);
  return {
    id: row.id,
    name: row.name,
    keyPrefix: row.keyPrefix,
    lastUsedAt: toIso(row.lastUsedAt),
    scopes: row.scopes ?? [],
    rateLimitRps: row.rateLimitRps,
    expiresAt: toIso(row.expiresAt),
    createdAt: toIso(row.createdAt) ?? new Date().toISOString(),
  };
}

// ── Handlers ─────────────────────────────────────────────────────────────────

export async function GET(_request: Request) {
  const auth = await getAuth();

  if (!auth.isSignedIn || !auth.userId) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }
  if (!auth.orgId) {
    return NextResponse.json({ error: "Organization required." }, { status: 403 });
  }

  const role = resolveRole(auth.sessionClaims?.org_role as string | undefined);
  if (!hasPermission(role, "api_key:read")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const rows = (await db.aPIKey.findMany({
      where: { organizationId: auth.orgId, revokedAt: null },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        keyPrefix: true,
        lastUsedAt: true,
        scopes: true,
        rateLimitRps: true,
        expiresAt: true,
        createdAt: true,
      },
    })) as ApiKeyRow[];

    return NextResponse.json({ keys: rows.map(serializeKey) });
  } catch (error) {
    logger.error("[api-keys.GET] Failed to load keys", {
      error: error instanceof Error ? error.message : "Unknown error",
    });
    return NextResponse.json({ error: "Failed to load keys." }, { status: 500 });
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
  if (!hasPermission(role, "api_key:create")) {
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

  const { name, scopes, rateLimitRps, expiresAt } = parsed.data;
  const { key, keyHash, keyPrefix } = generateApiKey();

  try {
    const created = await db.aPIKey.create({
      data: {
        name,
        keyHash,
        keyPrefix,
        organizationId: auth.orgId,
        createdById: auth.userId,
        scopes,
        ...(typeof rateLimitRps === "number" ? { rateLimitRps } : {}),
        ...(expiresAt ? { expiresAt: new Date(expiresAt) } : {}),
      },
      select: {
        id: true,
        name: true,
        keyPrefix: true,
        lastUsedAt: true,
        scopes: true,
        rateLimitRps: true,
        expiresAt: true,
        createdAt: true,
      },
    });

    // SOC 2 audit — record API key creation. Failure to log MUST NOT block the
    // 201 response, so auditLogger.log internally swallows errors.
    await auditLogger(request, {
      actor: { id: auth.userId, type: "user" },
      tenantId: auth.orgId,
    }).log({
      action: "api_key.created",
      outcome: "success",
      resource: { type: "api_key", id: created.id, name: created.name },
      severity: "warning",
      metadata: { keyPrefix: created.keyPrefix, scopes: created.scopes },
    });

    // Plaintext key is returned ONCE — never persisted, never returned again.
    return NextResponse.json({ key, ...serializeKey(created as ApiKeyRow) }, { status: 201 });
  } catch (error) {
    logger.error("[api-keys.POST] Failed to create key", {
      error: error instanceof Error ? error.message : "Unknown error",
    });
    return NextResponse.json({ error: "Failed to create key." }, { status: 500 });
  }
}
