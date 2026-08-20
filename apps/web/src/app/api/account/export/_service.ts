/**
 * Account data export — durable service seam.
 *
 * GDPR Article 20 + PIPL Article 45 (right to data portability).
 *
 * The export pipeline has three durable pieces, none of them in-process:
 *   1. `@nebutra/queue`   — the build job. POST enqueues and returns immediately.
 *   2. `uploads` table    — the export record (id, owner, object key, status).
 *   3. `@nebutra/uploads` — the artifact itself, handed back as a presigned URL
 *                           with a real expiry.
 *
 * Co-located under `_service.ts` (underscored = private, not a route segment)
 * because Next.js 16 Route files may only export HTTP verbs and Route Segment
 * Config. Shared state and helpers must live outside `route.ts`.
 */

import { auditLogger } from "@nebutra/audit";
import { logger } from "@nebutra/logger";
import type { JobPayload, JobStatusInfo, QueueProvider } from "@nebutra/queue";
import type { UploadProvider } from "@nebutra/uploads";
import { db } from "@/lib/db";

// ── Constants ───────────────────────────────────────────────────────────────

/** Queue + job type the export worker is registered under. */
export const EXPORT_QUEUE = "account-export";
export const EXPORT_JOB_TYPE = "build";

/** Object-store bucket holding export artifacts. */
export const EXPORT_BUCKET = process.env.ACCOUNT_EXPORT_BUCKET ?? "account-exports";

/** Lifetime of the presigned download URL handed to the browser. */
export const DOWNLOAD_URL_TTL_SECONDS = 15 * 60;

/** Retries the queue provider applies before the job is dead-lettered. */
const MAX_RETRIES = 3;

/** Advisory hint for clients polling the status endpoint. */
const ESTIMATED_BUILD_MS = 30_000;

const EXPORT_CONTENT_TYPE = "application/json";
const EXPORT_FILENAME = "nebutra-account-export.json";

export type ExportStatus = "pending" | "ready" | "failed";

export interface ExportJobInput {
  exportId: string;
  userId: string;
}

export interface ExportStatusResult {
  exportId: string;
  status: ExportStatus;
  sizeBytes: number;
  createdAt: string;
  downloadUrl?: string;
  expiresAt?: string;
  failedReason?: string;
}

export interface StartedExport {
  exportId: string;
  jobId: string;
  queueProvider: string;
  status: ExportStatus;
  createdAt: string;
  estimatedReadyAt: string;
}

// ── Runtime seam (injectable) ───────────────────────────────────────────────

export interface ExportRuntime {
  queue: QueueProvider;
  uploads: UploadProvider;
  /** Used to PUT the artifact to the presigned URL. */
  fetchImpl: typeof fetch;
  /** Storage provider label persisted on the export record. */
  uploadProviderName: string;
  /**
   * Whether `uploads.getDownloadUrl()` returns a URL that is both private and
   * time-limited. See `PRIVATE_DOWNLOAD_PROVIDERS`.
   */
  supportsPrivateDownload: boolean;
}

/**
 * An account export is the user's entire personal record. It may only be
 * written to a store that hands back a *signed, expiring* download URL.
 *
 * - `s3` (incl. R2 via the S3 endpoint) signs a GET with `expiresIn` — allowed.
 * - `blob` hard-codes `access: "public"` on write and returns a permanent
 *   unauthenticated URL from `getDownloadUrl()`; it also appends a random
 *   suffix to the object key, so the key on the export record no longer
 *   resolves. Publishing a GDPR export there is a data leak, not a download.
 * - `local` points at an upload server this app does not run.
 *
 * Rather than write personal data somewhere it cannot be protected, refuse the
 * export and say why.
 */
const PRIVATE_DOWNLOAD_PROVIDERS = new Set(["s3"]);

/** Thrown when the active object store cannot hold an export safely. */
export class ExportStorageUnsupportedError extends Error {
  readonly provider: string;

  constructor(provider: string) {
    super(
      `Object storage provider "${provider}" cannot issue a private, expiring download URL, ` +
        "so account exports are not available on this deployment. Configure S3-compatible " +
        "storage (AWS S3 or Cloudflare R2) to enable them.",
    );
    this.name = "ExportStorageUnsupportedError";
    this.provider = provider;
  }
}

let runtimeOverride: Partial<ExportRuntime> | null = null;
let workerRegisteredOn: QueueProvider | null = null;

/** @internal — tests inject fakes instead of reaching real infrastructure. */
export function setExportRuntimeForTests(overrides: Partial<ExportRuntime>): void {
  runtimeOverride = { ...runtimeOverride, ...overrides };
  workerRegisteredOn = null;
}

/** @internal — clears injected fakes and worker registration. */
export function __resetExportRuntimeForTests(): void {
  runtimeOverride = null;
  workerRegisteredOn = null;
}

export async function getExportRuntime(): Promise<ExportRuntime> {
  const queue = runtimeOverride?.queue ?? (await (await import("@nebutra/queue")).getQueue());
  const uploadsModule = await import("@nebutra/uploads");
  const uploads = runtimeOverride?.uploads ?? (await uploadsModule.getUploadProvider());
  const uploadProviderName =
    runtimeOverride?.uploadProviderName ??
    (runtimeOverride?.uploads ? "injected" : uploadsModule.getActiveProviderType());

  return {
    queue,
    uploads,
    fetchImpl: runtimeOverride?.fetchImpl ?? globalThis.fetch,
    uploadProviderName,
    supportsPrivateDownload:
      runtimeOverride?.supportsPrivateDownload ??
      (runtimeOverride?.uploads ? true : PRIVATE_DOWNLOAD_PROVIDERS.has(uploadProviderName)),
  };
}

// ── Payload ─────────────────────────────────────────────────────────────────

/**
 * Object key *within* `EXPORT_BUCKET`. The bucket is a separate argument to
 * every `UploadProvider` call, so it must not be repeated in the key — doing so
 * writes to `<bucket>/<bucket>/…`.
 */
export function exportObjectKey(userId: string, exportId: string): string {
  return `${userId}/${exportId}.json`;
}

export async function buildExportPayload(userId: string) {
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
    // No notification model is wired into the export yet; emit an empty list so
    // the artifact shape stays stable for downstream consumers.
    notifications: [] as unknown[],
    invitations,
  };
}

// ── Failure recording ───────────────────────────────────────────────────────

function asMetadataObject(metadata: unknown): Record<string, unknown> {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return {};
  return metadata as Record<string, unknown>;
}

/**
 * Flip the record to FAILED, keeping the metadata already on it.
 *
 * Prisma writes a `Json` column wholesale, so `data: { metadata: { … } }`
 * replaces the object rather than merging into it. Writing only `failedReason`
 * would silently drop `kind` and `jobId`, which is how the record is traced
 * back to its queue job. Never throws — the caller is already on a failure path.
 */
async function markExportFailed(exportId: string, failedReason: string): Promise<void> {
  try {
    const existing = await db.uploadRecord.findUnique({
      where: { id: exportId },
      select: { metadata: true },
    });
    await db.uploadRecord.update({
      where: { id: exportId },
      data: {
        status: "FAILED",
        metadata: { ...asMetadataObject(existing?.metadata), failedReason },
      },
    });
  } catch (error) {
    logger.error("[account/export] Failed to record export failure", {
      exportId,
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
}

// ── Worker ──────────────────────────────────────────────────────────────────

/**
 * Register the build handler on the active queue provider.
 *
 * - memory: processes inline on the next tick (dev/test).
 * - bullmq: starts an in-process Worker.
 * - qstash: the handler registry is read by the QStash webhook route.
 */
export function ensureExportWorker(runtime: ExportRuntime): void {
  if (workerRegisteredOn === runtime.queue) return;

  runtime.queue.registerHandler<Record<string, unknown>>(
    EXPORT_QUEUE,
    EXPORT_JOB_TYPE,
    async (job) => {
      const exportId = typeof job.data.exportId === "string" ? job.data.exportId : undefined;
      const userId = typeof job.data.userId === "string" ? job.data.userId : undefined;
      if (!exportId || !userId) {
        throw new Error("Export job is missing exportId or userId.");
      }
      await runExportJob(runtime, { exportId, userId });
    },
  );

  workerRegisteredOn = runtime.queue;
}

/**
 * Build the artifact and push it to object storage. Throwing here is how the
 * queue provider learns to retry, so the failure is recorded *and* rethrown.
 */
export async function runExportJob(runtime: ExportRuntime, input: ExportJobInput): Promise<void> {
  const { exportId, userId } = input;

  try {
    const payload = await buildExportPayload(userId);
    const body = JSON.stringify(payload);
    const sizeBytes = Buffer.byteLength(body, "utf8");
    const objectKey = exportObjectKey(userId, exportId);

    const presigned = await runtime.uploads.createPresignedUpload({
      bucket: EXPORT_BUCKET,
      key: objectKey,
      contentType: EXPORT_CONTENT_TYPE,
      tenantId: userId,
      acl: "private",
      metadata: { exportId, userId },
    });

    // The presigned signature covers the headers the provider chose. Re-adding
    // `content-type` in a different case appends a second value ("a/b, a/b")
    // once `Headers` normalises, which breaks an S3 signature — so only fill it
    // in when the provider left it out.
    const uploadHeaders = new Headers(presigned.headers);
    if (!uploadHeaders.has("content-type")) {
      uploadHeaders.set("content-type", EXPORT_CONTENT_TYPE);
    }

    const response = await runtime.fetchImpl(presigned.url, {
      method: presigned.method,
      headers: uploadHeaders,
      body,
    });

    if (!response.ok) {
      throw new Error(`Object storage rejected the export artifact (HTTP ${response.status}).`);
    }

    await db.uploadRecord.update({
      where: { id: exportId },
      data: {
        status: "COMPLETED",
        sizeBytes: BigInt(sizeBytes),
        completedAt: new Date(),
        uploadUrlExpiresAt: presigned.expiresAt,
        ...(response.headers.get("etag") ? { etag: response.headers.get("etag") } : {}),
      },
    });

    logger.info("[account/export] Artifact stored", { exportId, userId, sizeBytes });

    await auditLogger(undefined, {
      actor: { id: userId, type: "user" },
      // Account-level exports are not org-scoped: the user is their own tenant.
      tenantId: userId,
    }).log({
      action: "data.export.completed",
      outcome: "success",
      resource: { type: "account_export", id: exportId },
      severity: "warning",
      metadata: { sizeBytes, objectKey },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    logger.error("[account/export] Build failed", { exportId, userId, error: message });

    await markExportFailed(exportId, message);

    throw error instanceof Error ? error : new Error(message);
  }
}

// ── Start ───────────────────────────────────────────────────────────────────

/**
 * Create the durable export record and enqueue the build job. Returns as soon
 * as the queue provider accepts the job — the artifact is produced elsewhere.
 */
export async function startExport(
  runtime: ExportRuntime,
  userId: string,
  exportId: string,
): Promise<StartedExport> {
  if (!runtime.supportsPrivateDownload) {
    throw new ExportStorageUnsupportedError(runtime.uploadProviderName);
  }

  const now = new Date();
  const objectKey = exportObjectKey(userId, exportId);

  const { createJob } = await import("@nebutra/queue");
  const job: JobPayload = createJob(
    EXPORT_QUEUE,
    EXPORT_JOB_TYPE,
    { exportId, userId },
    {
      tenantId: userId,
      idempotencyKey: exportId,
      maxRetries: MAX_RETRIES,
      metadata: { exportId },
    },
  );

  await db.uploadRecord.create({
    data: {
      id: exportId,
      tenantId: userId,
      userId,
      status: "PENDING",
      provider: runtime.uploadProviderName,
      bucket: EXPORT_BUCKET,
      objectKey,
      filename: EXPORT_FILENAME,
      contentType: EXPORT_CONTENT_TYPE,
      sizeBytes: BigInt(0),
      metadata: { kind: "account-export", jobId: job.id },
      idempotencyKey: exportId,
      uploadUrlExpiresAt: new Date(now.getTime() + DOWNLOAD_URL_TTL_SECONDS * 1000),
    },
  });

  ensureExportWorker(runtime);

  try {
    const result = await runtime.queue.enqueue(job);
    return {
      exportId,
      jobId: result.jobId,
      queueProvider: result.provider,
      status: "pending",
      createdAt: now.toISOString(),
      estimatedReadyAt: new Date(now.getTime() + ESTIMATED_BUILD_MS).toISOString(),
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    await markExportFailed(exportId, message);
    throw error instanceof Error ? error : new Error(message);
  }
}

// ── Status ──────────────────────────────────────────────────────────────────

function readMetadataString(metadata: unknown, key: string): string | undefined {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return undefined;
  const value = (metadata as Record<string, unknown>)[key];
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function statusFromJob(info: JobStatusInfo | undefined): {
  status: ExportStatus;
  failedReason?: string;
} {
  if (!info) return { status: "pending" };
  if (info.status === "failed" || info.status === "dead-lettered") {
    return {
      status: "failed",
      ...(info.failedReason ? { failedReason: info.failedReason } : {}),
    };
  }
  if (info.status === "canceled") {
    return {
      status: "failed",
      ...(info.canceledReason ? { failedReason: info.canceledReason } : {}),
    };
  }
  return { status: "pending" };
}

/**
 * Resolve the real state of an export. Ownership is enforced by the record —
 * an export belonging to another user is indistinguishable from a missing one.
 */
export async function resolveExportStatus(
  runtime: ExportRuntime,
  userId: string,
  exportId: string,
): Promise<ExportStatusResult | null> {
  const record = await db.uploadRecord.findFirst({
    where: { id: exportId, userId, bucket: EXPORT_BUCKET },
  });
  if (!record) return null;

  const sizeBytes = Number(record.sizeBytes ?? 0);
  const createdAt =
    record.createdAt instanceof Date ? record.createdAt.toISOString() : String(record.createdAt);

  if (record.status === "COMPLETED") {
    const downloadUrl = await runtime.uploads.getDownloadUrl(
      record.bucket,
      record.objectKey,
      DOWNLOAD_URL_TTL_SECONDS,
    );
    return {
      exportId,
      status: "ready",
      sizeBytes,
      createdAt,
      downloadUrl,
      expiresAt: new Date(Date.now() + DOWNLOAD_URL_TTL_SECONDS * 1000).toISOString(),
    };
  }

  if (record.status === "FAILED") {
    const failedReason = readMetadataString(record.metadata, "failedReason");
    return {
      exportId,
      status: "failed",
      sizeBytes,
      createdAt,
      ...(failedReason ? { failedReason } : {}),
    };
  }

  // Still PENDING in the database — ask the queue what actually happened to
  // the job so a dead-lettered build does not look like it is still running.
  const jobId = readMetadataString(record.metadata, "jobId");
  if (!jobId || !runtime.queue.getJobStatus) {
    return { exportId, status: "pending", sizeBytes, createdAt };
  }

  const info = await runtime.queue.getJobStatus(jobId, EXPORT_QUEUE);
  const resolved = statusFromJob(info);
  return {
    exportId,
    status: resolved.status,
    sizeBytes,
    createdAt,
    ...(resolved.failedReason ? { failedReason: resolved.failedReason } : {}),
  };
}
