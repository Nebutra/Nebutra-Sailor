/**
 * Persist Pebble diagnostic bundles.
 *
 * Order:
 * 1. If R2/S3 credentials exist → presigned PUT via @nebutra/uploads (exact key)
 * 2. Else → local disk under PEBBLE_DIAGNOSTICS_DIR (ECS single-node OK)
 *
 * createS3Provider must see R2_ENDPOINT (or S3_ENDPOINT) — configure-api-r2-env.sh
 * writes both when applying R2 credentials.
 */

import { mkdir, unlink, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { logger } from "@nebutra/logger";
import { getActiveProviderType, getUploadProvider, resetUploadProvider } from "@nebutra/uploads";

const NDJSON = "application/x-ndjson";

function localRoot(): string {
  return (
    process.env["PEBBLE_DIAGNOSTICS_DIR"]?.trim() ||
    process.env["LOCAL_UPLOAD_DIR"]?.trim() ||
    join(process.cwd(), "data", "pebble-diagnostics")
  );
}

function hasCloudUploadCredentials(): boolean {
  return Boolean(
    process.env["R2_ACCESS_KEY_ID"] ||
      process.env["R2_SECRET_ACCESS_KEY"] ||
      process.env["AWS_ACCESS_KEY_ID"] ||
      process.env["AWS_SECRET_ACCESS_KEY"] ||
      process.env["S3_ENDPOINT"] ||
      process.env["R2_ENDPOINT"],
  );
}

export async function putDiagnosticBundle(input: {
  bucket: string;
  key: string;
  body: Uint8Array;
}): Promise<{ backend: "cloud" | "local" }> {
  if (hasCloudUploadCredentials()) {
    // Re-resolve provider so env changes after process start are not stuck on a
    // singleton that was created before R2 keys were present (rare, but cheap).
    resetUploadProvider();
    const provider = await getUploadProvider();
    const presigned = await provider.createPresignedUpload({
      bucket: input.bucket,
      key: input.key,
      contentType: NDJSON,
      maxSize: input.body.byteLength,
      // Omit ACL — R2 does not need/want AWS canned ACLs for private buckets.
      metadata: { purpose: "pebble-diagnostics" },
    });

    const stored = await fetch(presigned.url, {
      method: presigned.method,
      headers: { ...presigned.headers, "content-type": NDJSON },
      body: input.body as unknown as BodyInit,
    });

    if (!stored.ok) {
      const detail = await stored.text().catch(() => "");
      logger.error("Pebble diagnostic cloud store failed", {
        status: stored.status,
        backend: getActiveProviderType(),
        detail: detail.slice(0, 200),
        hasEndpoint: Boolean(process.env["R2_ENDPOINT"] || process.env["S3_ENDPOINT"]),
      });
      throw new Error(`cloud_store_failed:${stored.status}`);
    }

    logger.info("Pebble diagnostic stored in object storage", {
      bucket: input.bucket,
      key: input.key,
      bytes: input.body.byteLength,
      backend: getActiveProviderType(),
    });
    return { backend: "cloud" };
  }

  const fullPath = join(localRoot(), input.bucket, input.key);
  await mkdir(dirname(fullPath), { recursive: true });
  await writeFile(fullPath, input.body);
  logger.info("Pebble diagnostic stored on local disk", {
    path: fullPath,
    bytes: input.body.byteLength,
  });
  return { backend: "local" };
}

export async function deleteDiagnosticBundle(input: {
  bucket: string;
  key: string;
}): Promise<void> {
  if (hasCloudUploadCredentials()) {
    resetUploadProvider();
    const provider = await getUploadProvider();
    await provider.deleteFile(input.bucket, input.key);
    return;
  }

  const fullPath = join(localRoot(), input.bucket, input.key);
  await unlink(fullPath).catch(() => undefined);
}
