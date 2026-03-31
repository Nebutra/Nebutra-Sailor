/**
 * Upload provider factory with auto-detection
 */

import { logger } from "@nebutra/logger";
import { createLocalProvider, LocalUploadProvider } from "./providers/local.js";
import { createS3Provider, S3UploadProvider } from "./providers/s3.js";
import type { ProviderConfig, UploadProvider, UploadProviderType } from "./types.js";

let instance: UploadProvider | null = null;

/**
 * Create an upload provider with auto-detection
 */
export function createUploadProvider(config?: ProviderConfig): UploadProvider {
  if (config?.type) {
    return createUploadProviderByType(config.type, config);
  }

  return autoDetectProvider(config);
}

/**
 * Create provider by explicit type
 */
function createUploadProviderByType(
  type: UploadProviderType,
  config?: ProviderConfig,
): UploadProvider {
  if (type === "s3") {
    if (!config?.s3) {
      return createS3Provider();
    }
    return new S3UploadProvider(config.s3);
  }

  if (type === "local") {
    if (!config?.local) {
      return createLocalProvider();
    }
    return new LocalUploadProvider(config.local);
  }

  throw new Error(`Unknown upload provider type: ${type}`);
}

/**
 * Auto-detect provider based on environment
 */
function autoDetectProvider(config?: ProviderConfig): UploadProvider {
  // Priority 1: Check explicit UPLOAD_PROVIDER
  const explicitProvider = process.env.UPLOAD_PROVIDER as UploadProviderType | undefined;
  if (explicitProvider) {
    logger.info("Using explicit upload provider", { provider: explicitProvider });
    return createUploadProviderByType(explicitProvider, config);
  }

  // Priority 2: Check for R2 credentials
  if (process.env.R2_ACCESS_KEY_ID || process.env.R2_SECRET_ACCESS_KEY) {
    logger.info("Auto-detected R2 credentials, using S3 provider");
    return new S3UploadProvider({
      accessKeyId: process.env.R2_ACCESS_KEY_ID || "",
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || "",
      region: "auto",
      ...(process.env.R2_ENDPOINT !== undefined ? { endpoint: process.env.R2_ENDPOINT } : {}),
      ...(process.env.R2_PUBLIC_URL !== undefined ? { publicUrl: process.env.R2_PUBLIC_URL } : {}),
    });
  }

  // Priority 3: Check for AWS S3 credentials
  if (process.env.AWS_ACCESS_KEY_ID || process.env.AWS_SECRET_ACCESS_KEY) {
    logger.info("Auto-detected AWS credentials, using S3 provider");
    return createS3Provider();
  }

  // Priority 4: Check for custom S3 endpoint (Minio, etc.)
  if (process.env.S3_ENDPOINT) {
    logger.info("Using custom S3 endpoint", { endpoint: process.env.S3_ENDPOINT });
    return new S3UploadProvider({
      accessKeyId: process.env.AWS_ACCESS_KEY_ID || process.env.S3_ACCESS_KEY_ID || "",
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || process.env.S3_SECRET_ACCESS_KEY || "",
      region: process.env.AWS_REGION || "us-east-1",
      ...(process.env.S3_ENDPOINT !== undefined ? { endpoint: process.env.S3_ENDPOINT } : {}),
      ...(process.env.S3_PUBLIC_URL !== undefined ? { publicUrl: process.env.S3_PUBLIC_URL } : {}),
    });
  }

  // Fallback: Local filesystem
  logger.info("No cloud credentials found, using local filesystem provider");
  return createLocalProvider();
}

/**
 * Get or create singleton instance
 */
export async function getUploadProvider(config?: ProviderConfig): Promise<UploadProvider> {
  if (instance) {
    return instance;
  }

  instance = createUploadProvider(config);
  return instance;
}

/**
 * Reset singleton instance (for testing)
 */
export function resetUploadProvider(): void {
  if (instance) {
    instance.close().catch((error) => {
      logger.warn("Failed to close upload provider", { error });
    });
  }
  instance = null;
}

/**
 * Determine which provider is active
 */
export function getActiveProviderType(): UploadProviderType {
  if (instance instanceof S3UploadProvider) {
    return "s3";
  }
  if (instance instanceof LocalUploadProvider) {
    return "local";
  }

  if (
    process.env.UPLOAD_PROVIDER === "s3" ||
    process.env.R2_ACCESS_KEY_ID ||
    process.env.AWS_ACCESS_KEY_ID ||
    process.env.S3_ENDPOINT
  ) {
    return "s3";
  }

  return "local";
}
