import crypto from "node:crypto";
import { auditLogger } from "@nebutra/audit";
import { logger } from "@nebutra/logger";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getAuth } from "@/lib/auth";
import {
  ExportStorageUnsupportedError,
  getExportRuntime,
  resolveExportStatus,
  startExport,
} from "./_service";

/**
 * GDPR Article 20 + PIPL Article 45 — right to data portability.
 *
 * POST /api/account/export
 *   Enqueues a build job through `@nebutra/queue` and returns the export id
 *   immediately (202). Nothing is built on the request path.
 *
 * GET /api/account/export?id=...
 *   Reports the real state of that job. Once the artifact is in object storage
 *   the response carries a presigned download URL and its expiry.
 */

export async function POST(request: Request) {
  try {
    const authState = await getAuth(request);
    if (!authState.userId) {
      return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    }

    const userId = authState.userId;
    const exportId = crypto.randomUUID();

    const runtime = await getExportRuntime();
    const started = await startExport(runtime, userId, exportId);

    logger.info("[account/export] Export enqueued", {
      userId,
      exportId,
      jobId: started.jobId,
      queueProvider: started.queueProvider,
    });

    // SOC 2 audit — GDPR Art. 20 / PIPL Art. 45 data portability event.
    // Tenant scoping: account-level exports are not org-scoped, so the user id
    // is the tenant boundary. Cross-org exports require a separate `org.export`
    // action when those routes land.
    await auditLogger(request, {
      actor: { id: userId, type: "user" },
      tenantId: userId,
    }).log({
      action: "data.export.requested",
      outcome: "success",
      resource: { type: "account_export", id: exportId },
      severity: "warning",
      metadata: { jobId: started.jobId, queueProvider: started.queueProvider },
    });

    return NextResponse.json(
      {
        exportId: started.exportId,
        status: started.status,
        jobId: started.jobId,
        queueProvider: started.queueProvider,
        estimatedReadyAt: started.estimatedReadyAt,
      },
      { status: 202 },
    );
  } catch (error) {
    // A deployment without private object storage cannot hold a personal-data
    // export. Say so rather than reporting a success the user cannot download.
    if (error instanceof ExportStorageUnsupportedError) {
      logger.error("[account/export] Storage provider cannot hold exports", {
        provider: error.provider,
      });
      return NextResponse.json({ error: error.message }, { status: 501 });
    }

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

    const runtime = await getExportRuntime();
    const result = await resolveExportStatus(runtime, authState.userId, parsed.data.id);
    if (!result) {
      return NextResponse.json({ error: "Export not found." }, { status: 404 });
    }

    return NextResponse.json({
      exportId: result.exportId,
      status: result.status,
      sizeBytes: result.sizeBytes,
      createdAt: result.createdAt,
      ...(result.downloadUrl ? { downloadUrl: result.downloadUrl } : {}),
      ...(result.expiresAt ? { expiresAt: result.expiresAt } : {}),
      ...(result.failedReason ? { failedReason: result.failedReason } : {}),
    });
  } catch (error) {
    logger.error("[account/export] GET failed", {
      error: error instanceof Error ? error.message : "Unknown error",
    });
    return NextResponse.json({ error: "Failed to fetch export." }, { status: 500 });
  }
}
