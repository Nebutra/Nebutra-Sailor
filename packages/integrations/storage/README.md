# @nebutra/storage

R2/S3-compatible object storage client.

## Installation

```bash
pnpm add @nebutra/storage
```

## Features

- **Provider Agnostic** — Works with R2, S3, MinIO
- **Presigned URLs** — Secure upload/download links
- **Multi-tenant** — Tenant-scoped file paths
- **Type-safe** — TypeScript support

## Setup

### Environment Variables

```bash
# Cloudflare R2
R2_ACCOUNT_ID=your-account-id
R2_ACCESS_KEY_ID=your-access-key
R2_SECRET_ACCESS_KEY=your-secret-key
R2_BUCKET_NAME=your-bucket

# Or AWS S3
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
AWS_REGION=us-east-1
S3_BUCKET_NAME=your-bucket
```

## Usage

### Upload File

```typescript
import { storage } from "@nebutra/storage";

const result = await storage.upload({
  key: "uploads/avatar.png",
  body: fileBuffer,
  contentType: "image/png",
  tenantId: "org_123",
});

console.log(result.url);
```

### Download File

```typescript
const file = await storage.download({
  key: "uploads/avatar.png",
  tenantId: "org_123",
});
```

### Presigned URLs

```typescript
// Upload URL (PUT)
const uploadUrl = await storage.getPresignedUploadUrl({
  key: "uploads/document.pdf",
  contentType: "application/pdf",
  expiresIn: 3600, // 1 hour
  tenantId: "org_123",
});

// Download URL (GET)
const downloadUrl = await storage.getPresignedDownloadUrl({
  key: "uploads/document.pdf",
  expiresIn: 3600,
  tenantId: "org_123",
});
```

### List Files

```typescript
const files = await storage.list({
  prefix: "uploads/",
  tenantId: "org_123",
  maxKeys: 100,
});
```

### Delete File

```typescript
await storage.delete({
  key: "uploads/old-file.png",
  tenantId: "org_123",
});
```

## Multi-tenant Paths

Files are automatically scoped by tenant:

```typescript
// Input key: "uploads/file.png"
// Actual path: "tenants/org_123/uploads/file.png"
```

## Related

- [API Gateway](../../backends/gateway/)
- [Content service](../../backends/python/content/)
