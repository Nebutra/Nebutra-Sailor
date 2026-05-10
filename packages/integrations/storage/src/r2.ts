/**
 * Cloudflare R2 Storage Client
 * S3-compatible object storage
 */

import {
  CopyObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  type GetObjectCommandInput,
  HeadObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  type PutObjectCommandInput,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

// ============================================
// Configuration
// ============================================

const config = {
  accountId: process.env.CLOUDFLARE_ACCOUNT_ID ?? "",
  accessKeyId: process.env.R2_ACCESS_KEY_ID ?? "",
  secretAccessKey: process.env.R2_SECRET_ACCESS_KEY ?? "",
  buckets: {
    assets: process.env.R2_BUCKET_ASSETS || "nebutra-assets",
    uploads: process.env.R2_BUCKET_UPLOADS || "nebutra-uploads",
    backups: process.env.R2_BUCKET_BACKUPS || "nebutra-backups",
  },
  publicUrl: process.env.R2_PUBLIC_URL || "https://cdn.nebutra.com",
};

// ============================================
// Client
// ============================================

export const r2Client = new S3Client({
  region: "auto",
  endpoint: `https://${config.accountId}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: config.accessKeyId,
    secretAccessKey: config.secretAccessKey,
  },
});

// ============================================
// Types
// ============================================

export type Bucket = "assets" | "uploads" | "backups";

export interface UploadOptions {
  bucket?: Bucket;
  contentType?: string;
  metadata?: Record<string, string>;
  cacheControl?: string;
}

export interface UploadResult {
  key: string;
  bucket: string;
  url: string;
  size: number;
}

// ============================================
// Operations
// ============================================

/**
 * Upload a file to R2
 */
export async function upload(
  key: string,
  body: Buffer | Blob | ReadableStream,
  options: UploadOptions = {},
): Promise<UploadResult> {
  const bucket = config.buckets[options.bucket || "uploads"];

  const params: PutObjectCommandInput = {
    Bucket: bucket,
    Key: key,
    Body: body,
    ContentType: options.contentType,
    Metadata: options.metadata,
    CacheControl:
      options.cacheControl ||
      (options.bucket === "assets" ? "public, max-age=31536000, immutable" : undefined),
  };

  await r2Client.send(new PutObjectCommand(params));

  const url =
    options.bucket === "assets"
      ? `${config.publicUrl}/${key}`
      : await getSignedDownloadUrl(
          key,
          options.bucket !== undefined ? { bucket: options.bucket } : {},
        );

  return {
    key,
    bucket,
    url,
    size: body instanceof Buffer ? body.length : 0,
  };
}

/**
 * Upload file for a specific tenant
 */
export async function uploadForTenant(
  tenantId: string,
  filename: string,
  body: Buffer | Blob | ReadableStream,
  options: UploadOptions = {},
): Promise<UploadResult> {
  const key = `${tenantId}/${filename}`;
  return upload(key, body, { bucket: "uploads", ...options });
}

/**
 * Get a file from R2
 */
export async function download(
  key: string,
  bucket: Bucket = "uploads",
): Promise<ReadableStream | null> {
  const params: GetObjectCommandInput = {
    Bucket: config.buckets[bucket],
    Key: key,
  };

  try {
    const response = await r2Client.send(new GetObjectCommand(params));
    return response.Body as ReadableStream;
  } catch (error) {
    if ((error as { name: string }).name === "NoSuchKey") {
      return null;
    }
    throw error;
  }
}

/**
 * Delete a file from R2
 */
export async function remove(key: string, bucket: Bucket = "uploads"): Promise<void> {
  await r2Client.send(
    new DeleteObjectCommand({
      Bucket: config.buckets[bucket],
      Key: key,
    }),
  );
}

/**
 * Check if a file exists
 */
export async function exists(key: string, bucket: Bucket = "uploads"): Promise<boolean> {
  try {
    await r2Client.send(
      new HeadObjectCommand({
        Bucket: config.buckets[bucket],
        Key: key,
      }),
    );
    return true;
  } catch {
    return false;
  }
}

/**
 * List files in a directory
 */
export async function list(
  prefix: string,
  bucket: Bucket = "uploads",
  maxKeys = 1000,
): Promise<string[]> {
  const response = await r2Client.send(
    new ListObjectsV2Command({
      Bucket: config.buckets[bucket],
      Prefix: prefix,
      MaxKeys: maxKeys,
    }),
  );

  return response.Contents?.map((item) => item.Key ?? "").filter(Boolean) ?? [];
}

/**
 * Copy a file
 */
export async function copy(
  sourceKey: string,
  destinationKey: string,
  bucket: Bucket = "uploads",
): Promise<void> {
  const bucketName = config.buckets[bucket];
  await r2Client.send(
    new CopyObjectCommand({
      Bucket: bucketName,
      CopySource: `${bucketName}/${sourceKey}`,
      Key: destinationKey,
    }),
  );
}

// ============================================
// Signed URLs
// ============================================

/**
 * Generate a signed URL for downloading
 */
export async function getSignedDownloadUrl(
  key: string,
  options: { bucket?: Bucket; expiresIn?: number } = {},
): Promise<string> {
  const bucket = config.buckets[options.bucket || "uploads"];
  const expiresIn = options.expiresIn || 3600; // 1 hour default

  return getSignedUrl(r2Client, new GetObjectCommand({ Bucket: bucket, Key: key }), { expiresIn });
}

/**
 * Generate a signed URL for uploading
 */
export async function getSignedUploadUrl(
  key: string,
  options: { bucket?: Bucket; expiresIn?: number; contentType?: string } = {},
): Promise<string> {
  const bucket = config.buckets[options.bucket || "uploads"];
  const expiresIn = options.expiresIn || 3600; // 1 hour default

  return getSignedUrl(
    r2Client,
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      ContentType: options.contentType,
    }),
    { expiresIn },
  );
}

// ============================================
// Helpers
// ============================================

/**
 * Get public URL for assets bucket
 */
export function getPublicUrl(key: string): string {
  return `${config.publicUrl}/${key}`;
}

/**
 * Generate a unique filename
 */
export function generateFilename(originalName: string): string {
  const ext = originalName.split(".").pop();
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  return `${timestamp}-${random}.${ext}`;
}

export default {
  upload,
  uploadForTenant,
  download,
  remove,
  exists,
  list,
  copy,
  getSignedDownloadUrl,
  getSignedUploadUrl,
  getPublicUrl,
  generateFilename,
};
