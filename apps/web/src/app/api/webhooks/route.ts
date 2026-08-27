import { auditLogger } from "@nebutra/audit";
import { logger } from "@nebutra/logger";
import { getWebhooks, type WebhookEndpoint } from "@nebutra/webhooks";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getAuth } from "@/lib/auth";

/**
 * Webhook endpoint shape returned to the UI. The full signing secret is NEVER
 * returned in list responses — only a masked version. Plaintext secrets are
 * surfaced once on creation only, in the same spirit as API keys.
 */
export interface WebhookEndpointDTO {
  id: string;
  url: string;
  events: string[];
  isActive: boolean;
  signingSecretMasked: string;
  createdAt: string;
  lastDeliveredAt: string | null;
}

const createSchema = z.object({
  url: z.string().url().max(2048),
  events: z.array(z.string().min(1)).min(1).max(32),
});

function maskSecret(secret: string | null | undefined): string {
  if (!secret) {
    return "whsec_••••";
  }
  const prefix = secret.startsWith("whsec_") ? "whsec_" : "";
  const tail = secret.slice(-4);
  return `${prefix}••••${tail}`;
}

function toDto(endpoint: WebhookEndpoint): WebhookEndpointDTO {
  const lastDelivered =
    typeof endpoint.metadata?.lastDeliveredAt === "string"
      ? (endpoint.metadata.lastDeliveredAt as string)
      : null;
  return {
    id: endpoint.id,
    url: endpoint.url,
    events: endpoint.eventTypes,
    isActive: endpoint.active,
    signingSecretMasked: maskSecret(endpoint.secret),
    createdAt: endpoint.createdAt,
    lastDeliveredAt: lastDelivered,
  };
}

export async function GET(request: Request) {
  try {
    const auth = await getAuth(request);
    if (!auth.userId) {
      return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    }
    if (!auth.orgId) {
      return NextResponse.json({ error: "Organization required." }, { status: 400 });
    }

    const provider = await getWebhooks();
    const endpoints = await provider.listEndpoints(auth.orgId);

    return NextResponse.json({
      endpoints: endpoints.map(toDto),
    });
  } catch (error) {
    logger.error("[webhooks:list] failed", { error: String(error) });
    return NextResponse.json({ error: "Failed to list webhook endpoints." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const auth = await getAuth(request);
    if (!auth.userId) {
      return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    }
    if (!auth.orgId) {
      return NextResponse.json({ error: "Organization required." }, { status: 400 });
    }

    const json = await request.json().catch(() => null);
    const parsed = createSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid request body." },
        { status: 400 },
      );
    }

    const provider = await getWebhooks();
    const created = await provider.createEndpoint(auth.orgId, {
      url: parsed.data.url,
      tenantId: auth.orgId,
      eventTypes: parsed.data.events,
      active: true,
    });

    await auditLogger(request, {
      actor: { id: auth.userId, type: "user" },
      tenantId: auth.orgId,
    }).log({
      action: "webhook.created",
      outcome: "success",
      resource: { type: "webhook", id: created.id },
      severity: "warning",
      metadata: { url: created.url, events: created.eventTypes },
    });

    // Plaintext secret returned ONCE
    return NextResponse.json(
      {
        endpoint: toDto(created),
        signingSecret: created.secret,
      },
      { status: 201 },
    );
  } catch (error) {
    logger.error("[webhooks:create] failed", { error: String(error) });
    return NextResponse.json({ error: "Failed to create webhook endpoint." }, { status: 500 });
  }
}
