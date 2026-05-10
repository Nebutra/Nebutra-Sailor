# Cloudflare Infrastructure

Cloudflare integration for CDN, Edge caching, WAF, and R2 storage.

## Architecture

```
                    ┌─────────────────────────────────────────┐
                    │           Cloudflare Edge               │
                    │  ┌─────┐  ┌─────┐  ┌─────┐  ┌─────┐    │
User ──────────────►│  │ WAF │──│Cache│──│ CDN │──│ R2  │    │
                    │  └──┬──┘  └──┬──┘  └──┬──┘  └──┬──┘    │
                    └─────┼───────┼───────┼───────┼─────────┘
                          │       │       │       │
              ┌───────────┘       │       │       └───────────┐
              ▼                   ▼                           ▼
    ┌─────────────────┐  ┌─────────────────┐          ┌──────────────┐
    │     Vercel      │  │   Aliyun ECS    │          │  R2 Storage  │
    │  ┌───────────┐  │  │  ┌───────────┐  │          │   (Files)    │
    │  │ landing   │  │  │  │ web       │  │          └──────────────┘
    │  │ studio    │  │  │  │ api-gw    │  │
    │  └───────────┘  │  │  │ docs      │  │
    └─────────────────┘  │  └───────────┘  │
                         └─────────────────┘
```

## Domain Configuration

| Subdomain | Proxy | Cache | Origin |
|-----------|-------|-------|--------|
| `nebutra.com` | ✅ Proxied | Edge cache | Vercel (landing-page) |
| `app.nebutra.com` | ✅ Proxied after origin health | No cache | Aliyun ECS (web) |
| `api.nebutra.com` | ✅ Proxied after origin health | No cache | Aliyun ECS (api-gateway) |
| `status.nebutra.com` | ✅ Proxied | No cache | Vercel (landing-page status route) |
| `docs.nebutra.com` | Start DNS-only | Docs/static cache | Aliyun ECS (sailor-docs) |
| `studio.nebutra.com` | ✅ Proxied | No cache | Vercel (studio) |
| `cdn.nebutra.com` | ✅ Proxied | Long cache | R2 bucket |

## Setup Steps

### 1. DNS Records (Cloudflare Dashboard)

```
Type    Name      Content                  Proxy   TTL
────    ────      ───────                  ─────   ───
A       @         76.76.21.21              ✅      Auto
CNAME   www       cname.vercel-dns.com     ✅      Auto
A       app       106.15.4.31              ✅      Auto
A       api       106.15.4.31              ✅      Auto
A       status    76.76.21.21              ✅      Auto
A       docs      106.15.4.31              DNS     Auto
CNAME   studio    cname.vercel-dns.com     ✅      Auto
CNAME   cdn       <r2-bucket>.r2.dev       ✅      Auto
```

Keep `docs` as DNS-only until `curl -I http://docs.nebutra.com/` returns `200`
from the ECS origin. Do not bind `docs.nebutra.com` to Vercel.

Keep `status` on Vercel/landing-page, not ECS. The status surface is designed to
stay reachable when the ECS-hosted app/API/docs stack is degraded, and exposes a
machine-readable snapshot at `https://status.nebutra.com/status.json`.
Vercel currently verifies this subdomain with `A status 76.76.21.21`; do not
reuse the old `198.18.x.x` placeholder record.

### 2. SSL/TLS Settings

- SSL Mode: **Full (strict)**
- Always Use HTTPS: **On**
- Minimum TLS Version: **1.2**
- Automatic HTTPS Rewrites: **On**

### 3. Cache Rules

Apply via Cloudflare Dashboard → Rules → Cache Rules:

See `rules/cache-rules.json` for configuration.

### 4. WAF Rules

See `rules/waf-rules.json` for security configuration.

### 5. R2 Storage

See `r2/README.md` for storage setup.

## Environment Variables

Add to `.env`:

```env
# Cloudflare
CLOUDFLARE_ACCOUNT_ID="your-account-id"
CLOUDFLARE_API_TOKEN="your-api-token"

# R2 Storage
R2_ACCESS_KEY_ID="your-r2-access-key"
R2_SECRET_ACCESS_KEY="your-r2-secret-key"
R2_BUCKET_NAME="nebutra-assets"
R2_PUBLIC_URL="https://cdn.nebutra.com"
```

## File Structure

```
infra/iac/cloudflare/
├── README.md           # This file
├── wrangler.toml       # Wrangler CLI config
├── workers/            # Edge Workers (optional)
│   └── README.md
├── r2/                 # R2 storage config
│   ├── README.md
│   └── cors.json
└── rules/              # Cloudflare rules
    ├── cache-rules.json
    └── waf-rules.json
```

## CLI Commands

```bash
# Install Wrangler
npm install -g wrangler

# Login to Cloudflare
wrangler login

# Deploy Worker (if using)
wrangler deploy

# Manage R2
wrangler r2 bucket list
wrangler r2 bucket create nebutra-assets
```
