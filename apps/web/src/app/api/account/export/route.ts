import crypto from "node:crypto";
import { logger } from "@nebutra/logger";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getAuth } from "@/lib/auth";
import { db } from "@/lib/db";

/**
 * GDPR Article 20 + PIPL Article 45 — right to data portability.
 *
 * POST /api/account/export
 *   Authenticated user kicks off an export. For MVP we build the export
 *   synchronously and return inline if small (< INLINE_LIMIT_BYTES). For larger
 *   payloads we write to /tmp and return a stub `downloadUrl`. In a production
 *   deployment the real implementation should enqueue a background job and the
 *   download URL should resolve to a short-lived signed URL.
 *
 * GET /api/account/export?id=...
 *   Returns the status of a previously kicked-off export.
 */

const INLINE_LIMIT_BYTES = 500 * 1024; // 500 KB

interface ExportRecord {
  exportId: string;
  userId: string;
  status: "pending" | "ready" | "failed";
  estimatedReadyAt: string;
  createdAt: string;
  data?: unknown;
  downloadUrl?: string;
  sizeBytes: number;
}

// In-memory store — replaced by durable storage when wired to a queue.
const exportStore = new Map<string, ExportRecord>();

async function buildExportPayload(userId: string) {
  const [user, memberships, auditEvents, invitations] = await Promise.all([
    db.user.findUnique({ where: { id: userId } }),
    db.organizationMember.findMany({
      where: { userId },
      include: { organization: true },
    }),
    db.auditLog.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 5000,
    }),
    db.organizationInvitation.findMany({
      where: { inviterId: userId },
      orderBy: { createdAt: "desc" },
      take: 1000,
    }),
  ]);

  return {
    user,
    organizations: memberships.map((m) => ({
      role: m.role,
      joinedAt: m.createdAt,
      organization: m.organization,
    })),
    auditEvents,
    // No notification model exists in the schema today; emit an empty list
    // so the export shape stays stable for downstream consumers.
    notifications: [] as unknown[],
    invitations,
  };
}

function jsonByteLength(value: unknown): number {
  return Buffer.byteLength(JSON.stringify(value), "utf8");
}

export async function POST(request: Request) {
  try {
    const authState = await getAuth(request);
    if (!authState.userId) {
      return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    }

    const exportId = crypto.randomUUID();
    const userId = authState.userId;

    let data: unknown;
    try {
      data = await buildExportPayload(userId);
    } catch (error) {
      logger.error("[account/export] Failed to build payload", {
        userId,
        error: error instanceof Error ? error.message : "Unknown error",
      });
      return NextResponse.json({ error: "Failed to build export." }, { status: 500 });
    }

    const sizeBytes = jsonByteLength(data);
    const inline = sizeBytes < INLINE_LIMIT_BYTES;
    const now = new Date();

    const record: ExportRecord = {
      exportId,
      userId,
      status: "ready",
      estimatedReadyAt: now.toISOString(),
      createdAt: now.toISOString(),
      sizeBytes,
      ...(inline
        ? { data }
        : {
            // Production note: write to durable object storage and sign the
            // download URL. For MVP we return a stub URL that integrators must
            // back with their preferred storage adapter.
            downloadUrl: `/api/account/export?id=${exportId}&download=1`,
            data,
          }),
    };
    exportStore.set(exportId, record);

    logger.info("[account/export] Export ready", {
      userId,
      exportId,
      sizeBytes,
      inline,
    });

    return NextResponse.json(
      {
        exportId,
        status: "pending" as const,
        estimatedReadyAt: now.toISOString(),
        sizeBytes,
        inline,
      },
      { status: 202 },
    );
  } catch (error) {
    logger.error("[account/export] POST failed", {
      error: error instanceof Error ? error.message : "Unknown error",
    });
    return NextResponse.json({ error: "Failed to start export." }, { status: 500 });
  }
}

const getQuerySchema = z.object({
  id: z.string().min(1),
});

export async function GET(request: Request) {
  try {
    const authState = await getAuth(request);
    if (!authState.userId) {
      return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    }

    const url = new URL(request.url);
    const parsed = getQuerySchema.safeParse({ id: url.searchParams.get("id") ?? undefined });
    if (!parsed.success) {
      return NextResponse.json({ error: "Missing export id." }, { status: 400 });
    }

    const record = exportStore.get(parsed.data.id);
    if (!record || record.userId !== authState.userId) {
      return NextResponse.json({ error: "Export not found." }, { status: 404 });
    }

    const inline = record.sizeBytes < INLINE_LIMIT_BYTES;
    return NextResponse.json({
      exportId: record.exportId,
      status: record.status,
      sizeBytes: record.sizeBytes,
      inline,
      ...(inline ? { data: record.data } : { downloadUrl: record.downloadUrl }),
    });
  } catch (error) {
    logger.error("[account/export] GET failed", {
      error: error instanceof Error ? error.message : "Unknown error",
    });
    return NextResponse.json({ error: "Failed to fetch export." }, { status: 500 });
  }
}

/** @internal — exposed for tests so they can clear in-memory state. */
export function __resetExportStoreForTests() {
  exportStore.clear();
}
