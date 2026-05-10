/**
 * S3/R2 upload provider
 * Supports both AWS S3 and Cloudflare R2 (S3-compatible)
 */

import { randomUUID } from "node:crypto";
import {
  AbortMultipartUploadCommand,
  CompleteMultipartUploadCommand,
  CreateMultipartUploadCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
  type CompletedPart as S3CompletedPart,
  UploadPartCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { logger } from "@nebutra/logger";
import type {
  CompletePart,
  MultipartUpload,
  PresignedUpload,
  S3ProviderConfig,
  TusUploadConfig,
  UploadComplete,
  UploadProvider,
  UploadTarget,
} from "../types.js";

export class S3UploadProvider implements UploadProvider {
  private client: S3Client;
  private config: {
    accessKeyId: string;
    secretAccessKey: string;
    region: string;
    endpoint: string | undefined;
    publicUrl: string;
    forcePathStyle: boolean;
  };
  private uploadTracking: Map<string, { bucket: string; key: string }>;

  constructor(config: S3ProviderConfig) {
    this.uploadTracking = new Map();
    this.config = {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
      region: config.region,
      endpoint: config.endpoint,
      publicUrl: config.publicUrl ?? "https://cdn.example.com",
      forcePathStyle: config.forcePathStyle ?? false,
    };

    this.client = new S3Client({
      region: this.config.region,
      ...(this.config.endpoint !== undefined ? { endpoint: this.config.endpoint } : {}),
      credentials: {
        accessKeyId: this.config.accessKeyId,
        secretAccessKey: this.config.secretAccessKey,
      },
      forcePathStyle: this.config.forcePathStyle,
    });

    logger.info("S3 upload provider initialized", { provider: "s3", region: this.config.region });
  }

  /**
   * Build object key with tenant prefix
   */
  private buildKey(target: UploadTarget): string {
    const id = randomUUID();
    if (target.tenantId) {
      return `${target.tenantId}/${id}/${target.key.split("/").pop()}`;
    }
    return `${id}/${target.key.split("/").pop()}`;
  }

  /**
   * Generate presigned PUT URL for simple uploads
   */
  async createPresignedUpload(target: UploadTarget): Promise<PresignedUpload> {
    const key = this.buildKey(target);
    const expiresIn = 3600; // 1 hour

    const command = new PutObjectCommand({
      Bucket: target.bucket,
      Key: key,
      ContentType: target.contentType,
      Metadata: target.metadata,
      ...(target.acl !== undefined ? { ACL: target.acl } : {}),
    });

    const url = await getSignedUrl(this.client, command, { expiresIn });

    logger.debug("Presigned upload URL generated", { key, bucket: target.bucket });

    return {
      url,
      method: "PUT",
      headers: {
        "Content-Type": target.contentType,
      },
      expiresAt: new Date(Date.now() + expiresIn * 1000),
      uploadId: key,
    };
  }

  /**
   * Initiate multipart upload for large files
   */
  async createMultipartUpload(target: UploadTarget, partCount: number): Promise<MultipartUpload> {
    const key = this.buildKey(target);

    const createCmd = new CreateMultipartUploadCommand({
      Bucket: target.bucket,
      Key: key,
      ContentType: target.contentType,
      Metadata: target.metadata,
      ...(target.acl !== undefined ? { ACL: target.acl } : {}),
    });

    const response = await this.client.send(createCmd);

    if (!response.UploadId) {
      throw new Error("Failed to initiate multipart upload: no UploadId returned");
    }

    // Track upload for completion
    this.uploadTracking.set(response.UploadId, {
      bucket: target.bucket,
      key,
    });

    // Generate presigned URLs for each part
    const uploadId = response.UploadId;
    const parts = await Promise.all(
      Array.from({ length: partCount }, async (_, i) => {
        const partNumber = i + 1;
        const uploadPartCmd = new UploadPartCommand({
          Bucket: target.bucket,
          Key: key,
          PartNumber: partNumber,
          UploadId: uploadId,
        });

        const presignedUrl = await getSignedUrl(this.client, uploadPartCmd, {
          expiresIn: 3600,
        });

        return {
          partNumber,
          presignedUrl,
        };
      }),
    );

    const completeUrl = await this.generateCompleteUrl(target.bucket, key, uploadId);

    logger.info("Multipart upload initiated", {
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
      completeUrl,
    };
  }

  /**
   * Generate a presigned URL for the complete multipart upload operation
   */
  private async generateCompleteUrl(
    bucket: string,
    key: string,
    uploadId: string,
  ): Promise<string> {
    // This is a simplified implementation
    // In production, you'd implement a callback endpoint on your server
    return `https://api.example.com/uploads/complete?bucket=${bucket}&key=${encodeURIComponent(key)}&uploadId=${uploadId}`;
  }

  /**
   * Complete a multipart upload
   */
  async completeMultipartUpload(
    uploadId: string,
    key: string,
    parts: CompletePart[],
  ): Promise<UploadComplete> {
    const uploadInfo = this.uploadTracking.get(uploadId);
    if (!uploadInfo) {
      throw new Error(`Upload not found or already completed: ${uploadId}`);
    }

    const { bucket } = uploadInfo;
    this.uploadTracking.delete(uploadId);

    const completedParts: S3CompletedPart[] = parts.map((part) => ({
      ETag: part.etag,
      PartNumber: part.partNumber,
    }));

    const command = new CompleteMultipartUploadCommand({
      Bucket: bucket,
      Key: key,
      UploadId: uploadId,
      MultipartUpload: {
        Parts: completedParts,
      },
    });

    const response = await this.client.send(command);

    const url = this.generateDownloadUrl(key);

    logger.info("Multipart upload completed", { key, bucket, uploadId, etag: response.ETag });

    return {
      key,
      bucket,
      url,
      size: 0, // S3 doesn't provide size in complete response
      contentType: "application/octet-stream",
      ...(response.ETag !== undefined ? { etag: response.ETag } : {}),
    };
  }

  /**
   * Abort a multipart upload
   */
  async abortMultipartUpload(uploadId: string, key: string): Promise<void> {
    const uploadInfo = this.uploadTracking.get(uploadId);
    const bucket = uploadInfo?.bucket ?? "unknown";

    const command = new AbortMultipartUploadCommand({
      Bucket: bucket,
      Key: key,
      UploadId: uploadId,
    });

    await this.client.send(command);
    this.uploadTracking.delete(uploadId);

    logger.info("Multipart upload aborted", { key, bucket, uploadId });
  }

  /**
   * Get Tus protocol endpoint configuration
   */
  async getTusEndpoint(target: UploadTarget): Promise<TusUploadConfig> {
    const key = this.buildKey(target);

    // Initiate multipart upload for Tus
    const createCmd = new CreateMultipartUploadCommand({
      Bucket: target.bucket,
      Key: key,
      ContentType: target.contentType,
    });

    const response = await this.client.send(createCmd);

    if (!response.UploadId) {
      throw new Error("Failed to create Tus upload session");
    }

    return {
      endpoint: `${this.config.endpoint ?? "https://s3.amazonaws.com"}/${target.bucket}/${key}?uploadId=${response.UploadId}`,
      chunkSize: 5 * 1024 * 1024, // 5MB chunks
      retryDelays: [0, 1000, 3000, 5000],
      metadata: {
        ...target.metadata,
        filename: target.key,
        uploadId: response.UploadId,
      },
    };
  }

  /**
   * Delete a file from S3
   */
  async deleteFile(bucket: string, key: string): Promise<void> {
    const command = new DeleteObjectCommand({
      Bucket: bucket,
      Key: key,
    });

    await this.client.send(command);

    logger.debug("File deleted from S3", { key, bucket });
  }

  /**
   * Generate a presigned download URL
   */
  async getDownloadUrl(bucket: string, key: string, expiresInSec: number = 3600): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: bucket,
      Key: key,
    });

    return getSignedUrl(this.client, command, { expiresIn: expiresInSec });
  }

  /**
   * Generate public CDN URL for assets
   */
  private generateDownloadUrl(key: string): string {
    return `${this.config.publicUrl}/${key}`;
  }

  /**
   * Clean up resources
   */
  async close(): Promise<void> {
    this.uploadTracking.clear();
    this.client.destroy();
    logger.debug("S3 upload provider closed");
  }
}

/**
 * Create S3 provider from environment variables
 */
export function createS3Provider(): S3UploadProvider {
  const endpoint = process.env.S3_ENDPOINT;
  const publicUrl = process.env.S3_PUBLIC_URL ?? process.env.R2_PUBLIC_URL;

  const config: S3ProviderConfig = {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID ?? process.env.R2_ACCESS_KEY_ID ?? "",
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY ?? process.env.R2_SECRET_ACCESS_KEY ?? "",
    region: process.env.AWS_REGION ?? "auto",
    ...(endpoint !== undefined ? { endpoint } : {}),
    ...(publicUrl !== undefined ? { publicUrl } : {}),
    forcePathStyle: process.env.S3_FORCE_PATH_STYLE === "true",
  };

  if (!config.accessKeyId || !config.secretAccessKey) {
    throw new Error(
      "AWS credentials not found. Set AWS_ACCESS_KEY_ID/AWS_SECRET_ACCESS_KEY or R2_ACCESS_KEY_ID/R2_SECRET_ACCESS_KEY",
    );
  }

  return new S3UploadProvider(config);
}
