import { logger } from "@nebutra/logger";
import { getWebhooks, type WebhookEndpoint } from "@nebutra/webhooks";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getAuth } from "@/lib/auth";

const patchSchema = z
  .object({
    url: z.string().url().max(2048).optional(),
    events: z.array(z.string().min(1)).min(1).max(32).optional(),
    isActive: z.boolean().optional(),
  })
  .refine(
    (value) =>
      value.url !== undefined || value.events !== undefined || value.isActive !== undefined,
    { message: "At least one field must be provided." },
  );

function maskSecret(secret: string | null | undefined): string {
  if (!secret) return "whsec_••••";
  const prefix = secret.startsWith("whsec_") ? "whsec_" : "";
  const tail = secret.slice(-4);
  return `${prefix}••••${tail}`;
}

function toDto(endpoint: WebhookEndpoint) {
  return {
    id: endpoint.id,
    url: endpoint.url,
    events: endpoint.eventTypes,
    isActive: endpoint.active,
    signingSecretMasked: maskSecret(endpoint.secret),
    createdAt: endpoint.createdAt,
    lastDeliveredAt:
      typeof endpoint.metadata?.lastDeliveredAt === "string"
        ? (endpoint.metadata.lastDeliveredAt as string)
        : null,
  };
}

async function ensureOwnership(orgId: string, endpointId: string) {
  const provider = await getWebhooks();
  const endpoints = await provider.listEndpoints(orgId);
  const found = endpoints.find((endpoint) => endpoint.id === endpointId);
  return { provider, found };
}

export async function PATCH(
  request: Request,
  ctx: { params: Promise<{ id: string }> },
): Promise<Response> {
  try {
    const auth = await getAuth(request);
    if (!auth.userId) {
      return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    }
    if (!auth.orgId) {
      return NextResponse.json({ error: "Organization required." }, { status: 400 });
    }

    const { id } = await ctx.params;
    const parsed = patchSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid request body." },
        { status: 400 },
      );
    }

    const { provider, found } = await ensureOwnership(auth.orgId, id);
    if (!found) {
      return NextResponse.json({ error: "Webhook endpoint not found." }, { status: 404 });
    }

    const updated = await provider.updateEndpoint(id, {
      ...(parsed.data.url !== undefined && { url: parsed.data.url }),
      ...(parsed.data.events !== undefined && { eventTypes: parsed.data.events }),
      ...(parsed.data.isActive !== undefined && { active: parsed.data.isActive }),
    });

    return NextResponse.json({ endpoint: toDto(updated) });
  } catch (error) {
    logger.error("[webhooks:update] failed", { error: String(error) });
    return NextResponse.json({ error: "Failed to update webhook endpoint." }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  ctx: { params: Promise<{ id: string }> },
): Promise<Response> {
  try {
    const auth = await getAuth(request);
    if (!auth.userId) {
      return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    }
    if (!auth.orgId) {
      return NextResponse.json({ error: "Organization required." }, { status: 400 });
    }

    const { id } = await ctx.params;
    const { provider, found } = await ensureOwnership(auth.orgId, id);
    if (!found) {
      return NextResponse.json({ error: "Webhook endpoint not found." }, { status: 404 });
    }

    await provider.deleteEndpoint(id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    logger.error("[webhooks:delete] failed", { error: String(error) });
    return NextResponse.json({ error: "Failed to delete webhook endpoint." }, { status: 500 });
  }
}
