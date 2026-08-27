/**
 * @nebutra/uploads — Large file upload service
 * Handles presigned, multipart, and Tus protocol uploads
 */

// Factory
export {
  createUploadProvider,
  getActiveProviderType,
  getUploadProvider,
  resetUploadProvider,
} from "./factory";
// Providers
export { createVercelBlobProvider, VercelBlobProvider } from "./providers/blob";
export { createLocalProvider, LocalUploadProvider } from "./providers/local";
export { createS3Provider, S3UploadProvider } from "./providers/s3";
// Types
export type {
  ACLType,
  CompletePart,
  LocalProviderConfig,
  MultipartUpload,
  PresignedUpload,
  ProviderConfig,
  S3ProviderConfig,
  TusUploadConfig,
  UploadComplete,
  UploadMethod,
  UploadPart,
  UploadProvider,
  UploadProviderType,
  UploadTarget,
  ValidationRules,
} from "./types";
// Validation
export {
  createDocumentValidationRules,
  createImageValidationRules,
  logValidationError,
  type ValidationError,
  validateImageDimensions,
  validateUpload,
} from "./validation";
