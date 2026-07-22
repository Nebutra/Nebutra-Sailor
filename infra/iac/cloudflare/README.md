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
    │     Vercel      │  │    Cloud VM     │          │  R2 Storage  │
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
| `app.nebutra.com` | ✅ Proxied after origin health | No cache | Cloud VM (web; EC2/ECS/CVM/GCE compatible) |
| `api.nebutra.com` | ✅ Proxied after origin health | No cache | Cloud VM (api-gateway; EC2/ECS/CVM/GCE compatible) |
| `status.nebutra.com` | ✅ Proxied | No cache | Vercel (landing-page status route) |
| `docs.nebutra.com` | ✅ Proxied | Docs/static cache | Cloudflare Workers (OpenNext `nebutra-sailor-docs`) |
| `studio.nebutra.com` | ✅ Proxied when active | No cache | Optional branded Studio alias |
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
CNAME   docs      nebutra-sailor-docs.<account-subdomain>.workers.dev  ✅      Auto
CNAME   studio    <active studio host>     ✅      Auto
CNAME   cdn       <r2-bucket>.r2.dev       ✅      Auto
```

`docs.nebutra.com` is served by the OpenNext Cloudflare Worker
`nebutra-sailor-docs` (`apps/sailor-docs`). Deploy via
`.github/workflows/deploy-sailor-docs.yml` or:

```bash
pnpm --filter @nebutra/sailor-docs build:worker
pnpm --filter @nebutra/sailor-docs deploy:worker
```

Do **not** bind `docs.nebutra.com` to the landing-page Vercel project, and do
**not** point it at the ECS origin (that box no longer runs sailor-docs; unknown
hosts 301 to the marketing apex).

Keep `status` on Vercel/landing-page, not the VM. The status surface is designed to
stay reachable when the VM-hosted app/API/docs stack is degraded, and exposes a
machine-readable snapshot at `https://status.nebutra.com/status.json`.
Vercel currently verifies this subdomain with `A status 76.76.21.21`; do not
reuse the old `198.18.x.x` placeholder record.

The checked-in Sanity Studio deploy command targets Sanity-hosted
`https://nebutra.sanity.studio`. Only point `studio.nebutra.com` at Vercel,
Cloudflare Pages, or another SPA host if the Studio is self-hosted there and
the domain has been added to Sanity CORS with credentials. Do not leave `studio`
on an old `198.18.x.x` placeholder or a host that has no TLS certificate for the
branded domain.

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
