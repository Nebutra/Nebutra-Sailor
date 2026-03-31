/**
 * Local filesystem upload provider
 * For development and testing
 */

import { randomUUID } from "node:crypto";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { logger } from "@nebutra/logger";
import type {
  CompletePart,
  LocalProviderConfig,
  MultipartUpload,
  PresignedUpload,
  TusUploadConfig,
  UploadComplete,
  UploadProvider,
  UploadTarget,
} from "../types.js";

export class LocalUploadProvider implements UploadProvider {
  private config: Required<LocalProviderConfig>;
  private pendingUploads: Map<string, { key: string; parts: Map<number, Buffer> }>;

  constructor(config: LocalProviderConfig) {
    this.config = {
      uploadDir: config.uploadDir,
      httpBaseUrl: config.httpBaseUrl,
      maxConcurrency: config.maxConcurrency || 10,
    };
    this.pendingUploads = new Map();

    logger.info("Local upload provider initialized", {
      uploadDir: this.config.uploadDir,
      httpBaseUrl: this.config.httpBaseUrl,
    });
  }

  /**
   * Build object key with tenant prefix and UUID
   */
  private buildKey(target: UploadTarget): string {
    const id = randomUUID();
    if (target.tenantId) {
      return `${target.tenantId}/${id}/${target.key.split("/").pop()}`;
    }
    return `${id}/${target.key.split("/").pop()}`;
  }

  /**
   * Generate presigned URL for simple uploads
   */
  async createPresignedUpload(target: UploadTarget): Promise<PresignedUpload> {
    const key = this.buildKey(target);

    // Ensure directory exists
    await this.ensureDir(target.bucket);

    const expiresIn = 3600; // 1 hour

    logger.debug("Local presigned upload URL generated", { key, bucket: target.bucket });

    return {
      url: `${this.config.httpBaseUrl}/upload?bucket=${encodeURIComponent(target.bucket)}&key=${encodeURIComponent(key)}`,
      method: "PUT",
      headers: {
        "Content-Type": target.contentType,
      },
      expiresAt: new Date(Date.now() + expiresIn * 1000),
      uploadId: key,
    };
  }

  /**
   * Initiate multipart upload
   */
  async createMultipartUpload(target: UploadTarget, partCount: number): Promise<MultipartUpload> {
    const key = this.buildKey(target);
    const uploadId = randomUUID();

    // Ensure directory exists
    await this.ensureDir(target.bucket);

    // Initialize upload tracking
    this.pendingUploads.set(uploadId, {
      key,
      parts: new Map(),
    });

    // Generate presigned URLs for each part
    const parts = Array.from({ length: partCount }, (_, i) => ({
      partNumber: i + 1,
      presignedUrl: `${this.config.httpBaseUrl}/upload/multipart?bucket=${encodeURIComponent(target.bucket)}&uploadId=${encodeURIComponent(uploadId)}&partNumber=${i + 1}`,
    }));

    logger.info("Local multipart upload initiated", {
      key,
      bucket: target.bucket,
      uploadId,
      partCount,
    });

    return {
      uploadId,
      key,
      bucket: target.bucket,
      parts,
      completeUrl: `${this.config.httpBaseUrl}/upload/multipart/complete?bucket=${encodeURIComponent(target.bucket)}&uploadId=${encodeURIComponent(uploadId)}`,
    };
  }

  /**
   * Complete a multipart upload
   */
  async completeMultipartUpload(
    uploadId: string,
    key: string,
    _parts: CompletePart[],
  ): Promise<UploadComplete> {
    const upload = this.pendingUploads.get(uploadId);

    if (!upload) {
      throw new Error(`Upload not found: ${uploadId}`);
    }

    // For local storage, etag is a simple hash of part data
    // In production, this would be the actual S3 etag
    const filePath = join(this.config.uploadDir, key);

    // Ensure directory exists
    const dir = filePath.substring(0, filePath.lastIndexOf("/"));
    await this.ensureDir(dir);

    // Combine parts in order
    const parts_array = Array.from(upload.parts.entries())
      .sort(([a], [b]) => a - b)
      .map(([, buffer]) => buffer);

    const combined = Buffer.concat(parts_array);

    await writeFile(filePath, combined);

    this.pendingUploads.delete(uploadId);

    logger.info("Local multipart upload completed", { key, uploadId, size: combined.length });

    return {
      key,
      bucket: "local",
      url: `${this.config.httpBaseUrl}/files/${key}`,
      size: combined.length,
      contentType: "application/octet-stream",
      etag: this.generateETag(combined),
    };
  }

  /**
   * Abort a multipart upload
   */
  async abortMultipartUpload(uploadId: string, _key: string): Promise<void> {
    this.pendingUploads.delete(uploadId);

    logger.info("Local multipart upload aborted", { uploadId });
  }

  /**
   * Get Tus protocol endpoint configuration
   */
  async getTusEndpoint(target: UploadTarget): Promise<TusUploadConfig> {
    await this.ensureDir(target.bucket);

    return {
      endpoint: `${this.config.httpBaseUrl}/upload/tus`,
      chunkSize: 1 * 1024 * 1024, // 1MB chunks for local testing
      retryDelays: [0, 1000, 3000],
      metadata: {
        ...target.metadata,
        filename: target.key,
      },
    };
  }

  /**
   * Delete a file
   */
  async deleteFile(_bucket: string, key: string): Promise<void> {
    const filePath = join(this.config.uploadDir, key);

    try {
      await rm(filePath, { force: true });
      logger.debug("Local file deleted", { key });
    } catch (error) {
      logger.warn("Failed to delete local file", { key, error });
    }
  }

  /**
   * Generate a download URL
   */
  async getDownloadUrl(_bucket: string, key: string, _expiresInSec?: number): Promise<string> {
    return `${this.config.httpBaseUrl}/files/${key}`;
  }

  /**
   * Ensure directory exists
   */
  private async ensureDir(dirPath: string): Promise<void> {
    const fullPath = join(this.config.uploadDir, dirPath);

    try {
      await mkdir(fullPath, { recursive: true });
    } catch (error) {
      logger.warn("Failed to create directory", { path: fullPath, error });
    }
  }

  /**
   * Generate a simple ETag from content
   */
  private generateETag(buffer: Buffer): string {
    // Simple hash implementation
    let hash = 0;
    for (let i = 0; i < buffer.length; i++) {
      hash = (hash << 5) - hash + (buffer[i] ?? 0);
      hash = hash & hash; // Convert to 32bit integer
    }
    return `"${Math.abs(hash).toString(16)}"`;
  }

  /**
   * Clean up resources
   */
  async close(): Promise<void> {
    this.pendingUploads.clear();
    logger.debug("Local upload provider closed");
  }
}

/**
 * Create local provider from environment variables
 */
export function createLocalProvider(): LocalUploadProvider {
  const config: LocalProviderConfig = {
    uploadDir: process.env.UPLOAD_DIR || "/tmp/nebutra-uploads",
    httpBaseUrl: process.env.UPLOAD_HTTP_BASE_URL || "http://localhost:3000",
    maxConcurrency: process.env.UPLOAD_MAX_CONCURRENCY
      ? parseInt(process.env.UPLOAD_MAX_CONCURRENCY, 10)
      : 10,
  };

  return new LocalUploadProvider(config);
}
