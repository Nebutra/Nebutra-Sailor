/**
 * Persist Pebble diagnostic bundles without relying on a working public HTTP
 * loopback for presigned uploads (local provider) or accidental random keys.
 *
 * Order:
 * 1. If cloud credentials exist → presigned PUT via @nebutra/uploads (S3/R2)
 * 2. Else → local disk under PEBBLE_DIAGNOSTICS_DIR (ECS single-node OK)
 */

import { mkdir, unlink, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { logger } from "@nebutra/logger";
import { getActiveProviderType, getUploadProvider } from "@nebutra/uploads";

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
      process.env["BLOB_READ_WRITE_TOKEN"] ||
      process.env["UPLOAD_PROVIDER"] === "s3" ||
      process.env["UPLOAD_PROVIDER"] === "blob",
  );
}

export async function putDiagnosticBundle(input: {
  bucket: string;
  key: string;
  body: Uint8Array;
}): Promise<{ backend: "cloud" | "local" }> {
  if (hasCloudUploadCredentials()) {
    const provider = await getUploadProvider();
    const presigned = await provider.createPresignedUpload({
      bucket: input.bucket,
      key: input.key,
      contentType: NDJSON,
      maxSize: input.body.byteLength,
      acl: "private",
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
      });
      throw new Error(`cloud_store_failed:${stored.status}`);
    }

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
    const provider = await getUploadProvider();
    await provider.deleteFile(input.bucket, input.key);
    return;
  }

  const fullPath = join(localRoot(), input.bucket, input.key);
  await unlink(fullPath).catch(() => undefined);
}
