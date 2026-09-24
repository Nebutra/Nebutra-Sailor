/**
 * Core types for large file uploads
 */

export type UploadProviderType = "s3" | "local";
export type UploadMethod = "PUT" | "POST";
export type ACLType = "private" | "public-read";

/**
 * Target location and metadata for an upload
 */
export interface UploadTarget {
  bucket: string;
  key: string;
  contentType: string;
  maxSize?: number;
  metadata?: Record<string, string>;
  tenantId?: string;
  acl?: ACLType;
}

/**
 * Presigned upload response for simple PUT uploads
 */
export interface PresignedUpload {
  url: string;
  method: UploadMethod;
  headers: Record<string, string>;
  expiresAt: Date;
  uploadId?: string;
}

/**
 * Part configuration for multipart upload
 */
export interface UploadPart {
  partNumber: number;
  presignedUrl: string;
}

/**
 * Multipart upload response
 */
export interface MultipartUpload {
  uploadId: string;
  key: string;
  bucket: string;
  parts: UploadPart[];
  completeUrl: string;
}

/**
 * Tus protocol upload configuration
 */
export interface TusUploadConfig {
  endpoint: string;
  chunkSize: number;
  retryDelays: number[];
  metadata?: Record<string, string>;
}

/**
 * Completed upload response
 */
export interface UploadComplete {
  key: string;
  bucket: string;
  url: string;
  size: number;
  contentType: string;
  etag?: string;
  tenantId?: string;
}

/**
 * Part metadata for completing multipart upload
 */
export interface CompletePart {
  partNumber: number;
  etag: string;
}

/**
 * Upload provider interface
 */
export interface UploadProvider {
  /**
   * Generate a presigned URL for direct client upload
   */
  createPresignedUpload(target: UploadTarget): Promise<PresignedUpload>;

  /**
   * Initiate a multipart upload and return part configurations
   */
  createMultipartUpload(target: UploadTarget, partCount: number): Promise<MultipartUpload>;

  /**
   * Complete a multipart upload after all parts are uploaded
   */
  completeMultipartUpload(
    uploadId: string,
    key: string,
    parts: CompletePart[],
  ): Promise<UploadComplete>;

  /**
   * Abort/cancel a multipart upload
   */
  abortMultipartUpload(uploadId: string, key: string): Promise<void>;

  /**
   * Get Tus protocol endpoint configuration for resumable uploads
   */
  getTusEndpoint(target: UploadTarget): Promise<TusUploadConfig>;

  /**
   * Delete a file from storage
   */
  deleteFile(bucket: string, key: string): Promise<void>;

  /**
   * Generate a presigned download URL
   */
  getDownloadUrl(bucket: string, key: string, expiresInSec?: number): Promise<string>;

  /**
   * Clean up resources
   */
  close(): Promise<void>;
}

/**
 * S3 provider configuration
 */
export interface S3ProviderConfig {
  accessKeyId: string;
  secretAccessKey: string;
  region: string;
  endpoint?: string;
  publicUrl?: string;
  forcePathStyle?: boolean;
}

/**
 * Local filesystem provider configuration
 */
export interface LocalProviderConfig {
  uploadDir: string;
  httpBaseUrl: string;
  maxConcurrency?: number;
}

/**
 * Factory configuration for auto-detection
 */
export interface ProviderConfig {
  type?: UploadProviderType;
  s3?: S3ProviderConfig;
  local?: LocalProviderConfig;
}

/**
 * Validation rules for uploads
 */
export interface ValidationRules {
  maxSize: number;
  allowedTypes: string[];
  blockedExtensions: string[];
  imageDimensions?: {
    maxWidth: number;
    maxHeight: number;
  };
}
