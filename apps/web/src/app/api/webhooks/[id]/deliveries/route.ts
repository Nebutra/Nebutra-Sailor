import { logger } from "@nebutra/logger";
import { getWebhooks } from "@nebutra/webhooks";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getAuth } from "@/lib/auth";
import { db } from "@/lib/db";

export type DeliveryStatus = "success" | "failed" | "retrying";

export interface WebhookDeliveryDTO {
  id: string;
  eventType: string;
  status: DeliveryStatus;
  statusCode: number | null;
  responseTimeMs: number | null;
  retryCount: number;
  errorMessage: string | null;
  payload: unknown;
  createdAt: string;
  processedAt: string | null;
}

const querySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

const MAX_RETRIES = 5;

function toStatus(
  processedAt: Date | null,
  errorMessage: string | null,
  retryCount: number,
): DeliveryStatus {
  if (errorMessage && retryCount >= MAX_RETRIES) return "failed";
  if (errorMessage) return "retrying";
  if (processedAt) return "success";
  return "retrying";
}

export async function GET(
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

    // Tenant ownership check
    const provider = await getWebhooks();
    const endpoints = await provider.listEndpoints(auth.orgId);
    if (!endpoints.find((endpoint) => endpoint.id === id)) {
      return NextResponse.json({ error: "Webhook endpoint not found." }, { status: 404 });
    }

    const url = new URL(request.url);
    const parsed = querySchema.safeParse({
      page: url.searchParams.get("page") ?? undefined,
      pageSize: url.searchParams.get("pageSize") ?? undefined,
    });
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid query parameters." }, { status: 400 });
    }

    const { page, pageSize } = parsed.data;
    const skip = (page - 1) * pageSize;

    const [rows, total] = await Promise.all([
      db.webhookEvent.findMany({
        where: { provider: id },
        orderBy: { createdAt: "desc" },
        skip,
        take: pageSize,
      }),
      db.webhookEvent.count({ where: { provider: id } }),
    ]);

    const deliveries: WebhookDeliveryDTO[] = rows.map((row) => ({
      id: row.id,
      eventType: row.eventType,
      status: toStatus(row.processedAt, row.errorMessage, row.retryCount),
      statusCode: extractStatusCode(row.payload),
      responseTimeMs: extractResponseTime(row.payload),
      retryCount: row.retryCount,
      errorMessage: row.errorMessage,
      payload: row.payload,
      createdAt: row.createdAt.toISOString(),
      processedAt: row.processedAt ? row.processedAt.toISOString() : null,
    }));

    return NextResponse.json({
      deliveries,
      meta: { page, pageSize, total },
    });
  } catch (error) {
    logger.error("[webhooks:deliveries] failed", { error: String(error) });
    return NextResponse.json({ error: "Failed to load deliveries." }, { status: 500 });
  }
}

function extractStatusCode(payload: unknown): number | null {
  if (payload && typeof payload === "object" && "statusCode" in payload) {
    const code = (payload as { statusCode?: unknown }).statusCode;
    if (typeof code === "number") return code;
  }
  return null;
}

function extractResponseTime(payload: unknown): number | null {
  if (payload && typeof payload === "object" && "responseTimeMs" in payload) {
    const ms = (payload as { responseTimeMs?: unknown }).responseTimeMs;
    if (typeof ms === "number") return ms;
  }
  return null;
}
