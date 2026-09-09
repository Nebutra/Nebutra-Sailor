import { DEFAULT_PRODUCT_SCOPES, issueApiKey } from "@nebutra/prepaid-wallet";
import { NextResponse } from "next/server";
import { z } from "zod";
import { requireConsoleTenant } from "@/lib/console-tenant";
import { getApiKeyRepository, invalidateKeyCache } from "@/lib/router-keys";

export const dynamic = "force-dynamic";

/**
 * Console key management. Keys are rows in the shared `APIKey` table (the same
 * table as app settings and the gateway), scoped by the session's tenant, and
 * the /v1 edge validates them. There is no second store.
 *
 * Tenant resolution is `requireConsoleTenant` — the one helper every console
 * route uses. This file used to carry a private copy of it.
 */

/** `expiresAt` (absolute) or `expiresIn` (seconds) — never both. */
const Expiry = z
  .object({
    expiresAt: z.string().datetime().nullish(),
    expiresIn: z
      .number()
      .int()
      .positive()
      .max(10 * 365 * 24 * 3600)
      .nullish(),
  })
  .refine((v) => !(v.expiresAt && v.expiresIn), {
    message: "Send `expiresAt` or `expiresIn`, not both.",
  });

const Limits = z
  .object({
    total: z.number().positive().max(1_000_000).nullish(),
    daily: z.number().positive().max(1_000_000).nullish(),
  })
  .optional();

const CreateBody = z
  .object({
    name: z.string().trim().min(1).max(64).default("default"),
    rateLimitRps: z.number().int().min(1).max(1_000).optional(),
    saveLogs: z.boolean().optional(),
    limits: Limits,
  })
  .and(Expiry);

function resolveExpiry(
  input: { expiresAt?: string | null | undefined; expiresIn?: number | null | undefined },
  now: Date,
): Date | null {
  if (input.expiresAt) return new Date(input.expiresAt);
  if (input.expiresIn) return new Date(now.getTime() + input.expiresIn * 1000);
  return null;
}

export async function GET(request: Request) {
  const ctx = await requireConsoleTenant(request);
  if ("error" in ctx) return ctx.error;
  const keys = await getApiKeyRepository().listDetailByTenant(ctx.tenantId);
  return NextResponse.json({ keys });
}

/**
 * Issue a key. The plaintext is returned once, in this response, and never
 * stored — only its SHA-256 hash is.
 */
export async function POST(request: Request) {
  const ctx = await requireConsoleTenant(request);
  if ("error" in ctx) return ctx.error;

  const parsed = CreateBody.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input." },
      { status: 400 },
    );
  }
  const body = parsed.data;

  const issued = issueApiKey({ scopes: DEFAULT_PRODUCT_SCOPES });
  const repository = getApiKeyRepository();
  const created = await repository.create({
    name: body.name,
    keyHash: issued.keyHash,
    keyPrefix: issued.keyPrefix,
    tenantId: ctx.tenantId,
    createdById: ctx.userId,
    scopes: [...issued.scopes],
    ...(body.rateLimitRps !== undefined ? { rateLimitRps: body.rateLimitRps } : {}),
    expiresAt: resolveExpiry(body, new Date()),
    ...(body.saveLogs !== undefined ? { saveLogs: body.saveLogs } : {}),
    ...(body.limits?.total != null ? { limitTotal: body.limits.total } : {}),
    ...(body.limits?.daily != null ? { limitDaily: body.limits.daily } : {}),
  });

  // A new key is not in the negative cache, but a re-issued prefix could be.
  invalidateKeyCache();

  const detail = await repository.findDetail(ctx.tenantId, created.id);
  return NextResponse.json({ ...(detail ?? created), fullKey: issued.fullKey }, { status: 201 });
}
