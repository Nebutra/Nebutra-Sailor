import { NextResponse } from "next/server";
import { z } from "zod";
import { requireConsoleTenant } from "@/lib/console-tenant";
import { getApiKeyRepository, invalidateKeyCache } from "@/lib/router-keys";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

/**
 * Disable is reversible; revoke is terminal. They are different verbs on
 * purpose — a customer who suspects a leaked key wants the second one, and a
 * customer pausing a runaway script wants the first, and offering only one
 * makes the other unavailable.
 */
const PatchBody = z
  .object({
    name: z.string().trim().min(1).max(64).optional(),
    rateLimitRps: z.number().int().min(1).max(1_000).optional(),
    saveLogs: z.boolean().optional(),
    disabled: z.boolean().optional(),
    expiresAt: z.string().datetime().nullish(),
    limits: z
      .object({
        total: z.number().positive().max(1_000_000).nullish(),
        daily: z.number().positive().max(1_000_000).nullish(),
      })
      .optional(),
  })
  .refine((body) => Object.keys(body).length > 0, { message: "Nothing to change." });

export async function PATCH(request: Request, context: RouteContext) {
  const ctx = await requireConsoleTenant(request);
  if ("error" in ctx) return ctx.error;

  const parsed = PatchBody.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input." },
      { status: 400 },
    );
  }
  const body = parsed.data;
  const { id } = await context.params;

  const updated = await getApiKeyRepository().update(ctx.tenantId, id, {
    ...(body.name !== undefined ? { name: body.name } : {}),
    ...(body.rateLimitRps !== undefined ? { rateLimitRps: body.rateLimitRps } : {}),
    ...(body.saveLogs !== undefined ? { saveLogs: body.saveLogs } : {}),
    ...(body.disabled !== undefined ? { disabled: body.disabled } : {}),
    ...(body.expiresAt !== undefined
      ? { expiresAt: body.expiresAt ? new Date(body.expiresAt) : null }
      : {}),
    ...(body.limits?.total !== undefined ? { limitTotal: body.limits.total ?? null } : {}),
    ...(body.limits?.daily !== undefined ? { limitDaily: body.limits.daily ?? null } : {}),
  });

  if (!updated) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }
  // Rate limit, expiry and the disable flag are all read at the edge through
  // the key cache, so every mutation has to drop it or the change lands up to
  // a minute late — on a key the customer just disabled.
  invalidateKeyCache();
  return NextResponse.json(updated);
}

/** Revoke. Terminal, and takes effect at the /v1 edge immediately. */
export async function DELETE(request: Request, context: RouteContext) {
  const ctx = await requireConsoleTenant(request);
  if ("error" in ctx) return ctx.error;

  const { id } = await context.params;
  const revoked = await getApiKeyRepository().revoke(ctx.tenantId, id);
  if (!revoked) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }
  invalidateKeyCache();
  return new NextResponse(null, { status: 204 });
}
