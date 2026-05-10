/**
 * Vercel Blob upload provider — zero-config file uploads on Vercel.
 *
 * Uses @vercel/blob for server-side uploads with public URLs.
 * Requires BLOB_READ_WRITE_TOKEN env var (auto-provisioned on Vercel).
 *
 * Note: Vercel Blob doesn't support true multipart uploads or Tus protocol.
 * For files > 500MB, use the S3 provider instead.
 */

import type {
  CompletePart,
  MultipartUpload,
  PresignedUpload,
  TusUploadConfig,
  UploadComplete,
  UploadProvider,
  UploadTarget,
} from "../types";

export interface VercelBlobConfig {
  token?: string;
}

export class VercelBlobProvider implements UploadProvider {
  private token: string;

  constructor(config: VercelBlobConfig = {}) {
    this.token = config.token ?? process.env.BLOB_READ_WRITE_TOKEN ?? "";
  }

  private buildPathname(target: UploadTarget): string {
    const prefix = target.tenantId ? `${target.tenantId}/` : "";
    return `${prefix}${target.key}`;
  }

  async createPresignedUpload(target: UploadTarget): Promise<PresignedUpload> {
    // Vercel Blob uses server-side put() — we generate a URL that the client
    // can PUT to via the handleUpload client helper, or we return the blob URL
    // after server-side upload.
    const blob = await import("@vercel/blob");
    const pathname = this.buildPathname(target);

    const result = await blob.put(pathname, "", {
      access: "public",
      contentType: target.contentType,
      token: this.token,
      addRandomSuffix: true,
    });

    return {
      url: result.url,
      method: "PUT",
      headers: {
        "Content-Type": target.contentType,
        "x-vercel-blob-token": this.token,
      },
      expiresAt: new Date(Date.now() + 3600 * 1000), // 1 hour
    };
  }

  async createMultipartUpload(target: UploadTarget, _partCount: number): Promise<MultipartUpload> {
    // Vercel Blob handles large files internally — no client-side multipart needed
    // We simulate the interface for compatibility
    const presigned = await this.createPresignedUpload(target);
    return {
      uploadId: `blob_${Date.now()}`,
      key: this.buildPathname(target),
      bucket: target.bucket,
      parts: [{ partNumber: 1, presignedUrl: presigned.url }],
      completeUrl: presigned.url,
    };
  }

  async completeMultipartUpload(
    _uploadId: string,
    key: string,
    _parts: CompletePart[],
  ): Promise<UploadComplete> {
    // Vercel Blob uploads are atomic — no completion step needed
    return {
      key,
      bucket: "vercel-blob",
      url: `https://blob.vercel-storage.com/${key}`,
      size: 0,
      contentType: "application/octet-stream",
    };
  }

  async abortMultipartUpload(_uploadId: string, key: string): Promise<void> {
    // Clean up the blob if partially uploaded
    await this.deleteFile("vercel-blob", key);
  }

  async getTusEndpoint(_target: UploadTarget): Promise<TusUploadConfig> {
    throw new Error(
      "Vercel Blob does not support Tus protocol. Use S3 provider for resumable uploads.",
    );
  }

  async deleteFile(_bucket: string, key: string): Promise<void> {
    const blob = await import("@vercel/blob");
    const url = key.startsWith("http") ? key : `https://blob.vercel-storage.com/${key}`;
    await blob.del(url, { token: this.token });
  }

  async getDownloadUrl(_bucket: string, key: string, _expiresInSec?: number): Promise<string> {
    // Vercel Blob URLs are public by default — no signed URL needed
    const blob = await import("@vercel/blob");
    const url = key.startsWith("http") ? key : `https://blob.vercel-storage.com/${key}`;
    const meta = await blob.head(url, { token: this.token });
    return meta.url;
  }

  async close(): Promise<void> {
    // No-op — Vercel Blob has no persistent connections
  }
}

export function createVercelBlobProvider(config?: VercelBlobConfig): VercelBlobProvider {
  return new VercelBlobProvider(config);
}
