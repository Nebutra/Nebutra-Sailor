# Cloudflare R2 Storage

Object storage for user uploads, static assets, and media files.

## Buckets

| Bucket | Purpose | Public | Domain |
|--------|---------|--------|--------|
| `nebutra-assets` | Public static assets | ✅ Yes | `cdn.nebutra.com` |
| `nebutra-uploads` | User uploads (private) | ❌ No | Signed URLs |
| `nebutra-backups` | Database backups | ❌ No | Internal only |
| `nebutra-pebble-diagnostics` | Pebble desktop diagnostic NDJSON | ❌ No | Server-side only |

Pebble diagnostics: [docs/ops/nebutra/pebble-support-intake.md](../../../../docs/ops/nebutra/pebble-support-intake.md) ·  
`infra/ops/scripts/provision-pebble-diagnostics-r2.sh` ·  
`gh workflow run ops-configure-pebble-r2.yml`

## Setup

### 1. Create Buckets

```bash
# Login to Cloudflare
wrangler login

# Create public assets bucket
wrangler r2 bucket create nebutra-assets

# Create private uploads bucket
wrangler r2 bucket create nebutra-uploads

# Create backups bucket
wrangler r2 bucket create nebutra-backups
```

### 2. Configure Public Access

For `nebutra-assets` bucket:

1. Go to Cloudflare Dashboard → R2 → nebutra-assets
2. Click **Settings** → **Public Access**
3. Enable public access
4. Add custom domain: `cdn.nebutra.com`

### 3. Configure CORS

Apply `cors.json` to buckets that need browser access:

```bash
wrangler r2 bucket cors set nebutra-assets --file=cors.json --force
wrangler r2 bucket cors set nebutra-uploads --file=cors.json --force
```

### 4. Generate API Tokens

1. Go to Cloudflare Dashboard → R2 → **Manage R2 API Tokens**
2. Create token with:
   - Permission: Object Read & Write
   - Specify bucket(s)
3. Save credentials to `.env`:

```env
R2_ACCESS_KEY_ID="..."
R2_SECRET_ACCESS_KEY="..."
```

## Usage in Code

### Upload Client (S3-compatible)

```typescript
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

const r2 = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});

// Upload file
await r2.send(new PutObjectCommand({
  Bucket: "nebutra-uploads",
  Key: `${tenantId}/${filename}`,
  Body: buffer,
  ContentType: mimeType,
}));
```

### Generate Signed URL

```typescript
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { GetObjectCommand } from "@aws-sdk/client-s3";

const signedUrl = await getSignedUrl(r2, new GetObjectCommand({
  Bucket: "nebutra-uploads",
  Key: key,
}), { expiresIn: 3600 }); // 1 hour
```

## File Organization

```
nebutra-assets/           # Public CDN (cdn.nebutra.com)
├── brand/logo/           # VI marks — Logo + docs
├── brand/logo-compliant/
├── kuanlan/{orbit,skus,wardrobe}/
├── landing/{images,screenshots,animations,logos,dashboard}/
├── router/{banners,product}/
├── forge/product/
└── pebble/assets/

Seed: `pnpm assets:seed`. `public/` is the seed tree, not consumption.
Favicons stay same-origin.

nebutra-uploads/          # Private user uploads
├── {tenant_id}/
│   ├── avatars/
│   ├── documents/
│   └── media/

nebutra-backups/          # Internal backups
├── db/
│   └── {date}/
└── logs/
```

## Lifecycle Rules

Configure via Cloudflare Dashboard or API:

| Bucket | Rule | Action |
|--------|------|--------|
| `nebutra-uploads` | Delete incomplete uploads after 1 day | Auto-delete |
| `nebutra-backups` | Move to Infrequent Access after 30 days | Transition |
| `nebutra-backups` | Delete after 90 days | Expiration |
