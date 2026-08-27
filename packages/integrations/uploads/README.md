> **Status: Foundation** — Type definitions, factory pattern, and provider stubs are complete. Provider implementations require external service credentials to activate. See inline TODOs for integration points.

# @nebutra/uploads

Large file upload service for the Nebutra-Sailor monorepo. Handles all upload scenarios with support for multiple storage backends.

## Features

- **Presigned URLs** — Simple direct uploads for small files (<100MB)
- **Multipart Upload** — S3 multipart protocol for large files (100MB+)
- **Tus Protocol** — Resumable uploads for unreliable connections
- **Multiple Backends** — S3/R2 (production) and local filesystem (dev/test)
- **Auto-detection** — Automatically selects provider based on environment
- **Multi-tenant** — Built-in tenant ID prefixing for isolation
- **Validation** — File size, MIME type, and extension validation
- **TypeScript** — Full type safety with zod schemas

## Installation

```bash
pnpm add @nebutra/uploads
```

## Quick Start

### Initialize provider (auto-detected)

```typescript
import { getUploadProvider } from "@nebutra/uploads";

const provider = await getUploadProvider();
```

### Create a presigned upload

```typescript
import { getUploadProvider } from "@nebutra/uploads";

const provider = await getUploadProvider();

const upload = await provider.createPresignedUpload({
  bucket: "uploads",
  key: "documents/report.pdf",
  contentType: "application/pdf",
  maxSize: 50 * 1024 * 1024, // 50MB
  tenantId: "org_123",
  acl: "private",
});

// Use upload.url with PUT request from client
```

### Multipart upload

```typescript
const target = {
  bucket: "uploads",
  key: "videos/large-video.mp4",
  contentType: "video/mp4",
  tenantId: "org_123",
};

// Initiate
const multipart = await provider.createMultipartUpload(target, 10); // 10 parts

// Client uploads each part to presignedUrl with part data
// Complete after all parts uploaded
const result = await provider.completeMultipartUpload(
  multipart.uploadId,
  multipart.key,
  [
    { partNumber: 1, etag: "..." },
    { partNumber: 2, etag: "..." },
    // ...
  ],
);
```

### Validation

```typescript
import {
  validateUpload,
  createImageValidationRules,
  createDocumentValidationRules,
} from "@nebutra/uploads";

// Validate before upload
const imageRules = createImageValidationRules({
  maxSize: 10 * 1024 * 1024, // 10MB
  maxWidth: 4096,
  maxHeight: 4096,
});

const error = validateUpload("profile.png", fileSize, "image/png", imageRules);
if (error) {
  console.error(error.message);
}
```

## Configuration

### Environment Variables

#### S3/R2 (Cloudflare)

```bash
R2_ACCESS_KEY_ID=...
R2_SECRET_ACCESS_KEY=...
R2_ENDPOINT=https://abc123.r2.cloudflarestorage.com
R2_PUBLIC_URL=https://cdn.example.com
```

#### AWS S3

```bash
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
AWS_REGION=us-east-1
S3_ENDPOINT=https://s3.amazonaws.com  # optional
S3_PUBLIC_URL=https://cdn.example.com # optional
```

#### Custom S3 (Minio, DigitalOcean Spaces, etc.)

```bash
S3_ACCESS_KEY_ID=...
S3_SECRET_ACCESS_KEY=...
S3_ENDPOINT=https://minio.example.com
S3_PUBLIC_URL=https://cdn.example.com
```

#### Local Filesystem

```bash
UPLOAD_DIR=/tmp/nebutra-uploads
UPLOAD_HTTP_BASE_URL=http://localhost:3000
UPLOAD_MAX_CONCURRENCY=10
```

#### Provider Selection

```bash
UPLOAD_PROVIDER=s3  # or "local"
```

## Provider Auto-detection

The factory automatically selects a provider based on environment:

1. **Explicit** — `UPLOAD_PROVIDER` env var
2. **R2** — `R2_ACCESS_KEY_ID` + `R2_SECRET_ACCESS_KEY`
3. **AWS S3** — `AWS_ACCESS_KEY_ID` + `AWS_SECRET_ACCESS_KEY`
4. **Custom S3** — `S3_ENDPOINT`
5. **Fallback** — Local filesystem

## API Reference

### UploadProvider

```typescript
interface UploadProvider {
  createPresignedUpload(target: UploadTarget): Promise<PresignedUpload>;
  createMultipartUpload(target: UploadTarget, partCount: number): Promise<MultipartUpload>;
  completeMultipartUpload(uploadId: string, key: string, parts: CompletePart[]): Promise<UploadComplete>;
  abortMultipartUpload(uploadId: string, key: string): Promise<void>;
  getTusEndpoint(target: UploadTarget): Promise<TusUploadConfig>;
  deleteFile(bucket: string, key: string): Promise<void>;
  getDownloadUrl(bucket: string, key: string, expiresInSec?: number): Promise<string>;
  close(): Promise<void>;
}
```

### UploadTarget

```typescript
interface UploadTarget {
  bucket: string;          // Storage bucket/directory
  key: string;             // File path/name
  contentType: string;     // MIME type
  maxSize?: number;        // Optional max file size
  metadata?: Record<...>; // Custom metadata
  tenantId?: string;       // Tenant ID for prefixing
  acl?: "private" | "public-read";
}
```

### PresignedUpload

```typescript
interface PresignedUpload {
  url: string;             // Client uses this for upload
  method: "PUT" | "POST";
  headers: Record<...>;   // Custom headers to include
  expiresAt: Date;        // URL expiration time
  uploadId?: string;      // File identifier
}
```

### ValidationRules

```typescript
interface ValidationRules {
  maxSize: number;                           // Max file size in bytes
  allowedTypes: string[];                    // MIME type whitelist
  blockedExtensions: string[];               // Blocked file extensions
  imageDimensions?: { maxWidth, maxHeight }; // For images
}
```

## Validation Functions

### validateUpload

```typescript
const error = validateUpload(
  filename,      // string
  fileSize,      // number (bytes)
  mimeType,      // string (e.g., "image/png")
  rules,         // Partial<ValidationRules> (optional)
);
```

Returns `null` if valid, or `ValidationError` with code and message.

### createImageValidationRules

```typescript
const rules = createImageValidationRules({
  maxSize: 10 * 1024 * 1024,  // 10MB
  maxWidth: 4096,
  maxHeight: 4096,
});
```

Default: 10MB, JPEG/PNG/WebP/GIF/SVG

### createDocumentValidationRules

```typescript
const rules = createDocumentValidationRules({
  maxSize: 50 * 1024 * 1024,  // 50MB
});
```

Default: 50MB, PDF/Office/Text/CSV

## Multi-tenant Usage

Automatically prefixes keys with tenant ID:

```typescript
const upload = await provider.createPresignedUpload({
  bucket: "uploads",
  key: "documents/report.pdf",
  contentType: "application/pdf",
  tenantId: "org_123",
  // Key becomes: org_123/{uuid}/report.pdf
});
```

## Error Handling

```typescript
import { validateUpload, type ValidationError } from "@nebutra/uploads";

try {
  const error = validateUpload(filename, size, mimeType);
  if (error) {
    switch (error.code) {
      case "size_exceeded":
        console.error("File too large");
        break;
      case "type_not_allowed":
        console.error("File type not allowed");
        break;
      case "extension_blocked":
        console.error("File extension blocked");
        break;
      case "invalid_image":
        console.error("Image validation failed");
        break;
    }
  }
} catch (error) {
  console.error("Upload failed:", error);
}
```

## Testing

Use the local provider for tests:

```typescript
import { createLocalProvider } from "@nebutra/uploads";

const provider = createLocalProvider();

// Provider will use local filesystem
const upload = await provider.createPresignedUpload({...});
```

## Development

```bash
# Type check
pnpm --filter @nebutra/uploads typecheck

# Build
pnpm --filter @nebutra/uploads build
```

## License

Proprietary — Nebutra
