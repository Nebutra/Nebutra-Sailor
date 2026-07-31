# Pebble support intake (production)

Desktop support paths that must stay green:

| Concern | Endpoint | Notes |
|---------|----------|--------|
| Feedback | `POST https://api.nebutra.com/pebble/v1/feedback` | Also `POST https://pebble.nebutra.com/v1/feedback` (nginx rewrite) |
| Diagnostics token | `POST https://api.nebutra.com/pebble/diagnostics/token` | Returns `{ token, upload_url, max_bytes }` |
| Diagnostics upload | `POST {upload_url}` | Bearer token; `Content-Type: application/x-ndjson`; exact `Content-Length` |
| Diagnostics delete | `POST …/diagnostics/delete/:ticketId` | Same path prefix as token |

## Desktop client contracts

From `apps/desktop/.../diagnostics.rs` `validate_upload_url`:

1. If token endpoint is **https**, `upload_url` must be **https**.
2. `upload_url` **host** (and default port) must match the token endpoint host.

Product analytics (PostHog) and crash reporting (Sentry) are **vendor-cloud** and do not use these routes.

## `upload_url` derivation

`deriveUploadUrl` reconstructs the **client-facing** URL from:

- `X-Forwarded-Host` / `Host` (maps `origin.nebutra.com` → `api.nebutra.com`)
- `X-Forwarded-Proto` (forces `https` for `*.nebutra.com`)
- `X-Original-URI` when nginx rewrites brand `/diagnostics/*` → gateway `/pebble/diagnostics/*`

Do **not** use the process-local `c.req.url` alone — behind CF grey-cloud origin it becomes `http://origin.nebutra.com/...` and the desktop client rejects it.

## Smoke (after deploy)

```bash
# Feedback
curl -sS -X POST 'https://api.nebutra.com/pebble/v1/feedback' \
  -H 'Content-Type: application/json' \
  -d '{"submission_id":"smoke-1","message":"ok"}'
# → 202 {"submission_id":"smoke-1","received":true}

# Token (canonical)
curl -sS -X POST 'https://api.nebutra.com/pebble/diagnostics/token' \
  -H 'Content-Type: application/json' \
  -d '{"bundle_submission_id":"smoke-b1","bytes":12}'
# → 200 upload_url must be https://api.nebutra.com/pebble/diagnostics/upload

# Token (brand proxy)
curl -sS -X POST 'https://pebble.nebutra.com/diagnostics/token' \
  -H 'Content-Type: application/json' \
  -d '{"bundle_submission_id":"smoke-b2","bytes":12}'
# → 200 upload_url must be https://pebble.nebutra.com/diagnostics/upload

# Upload (exact Content-Length)
BODY=$'{"event":"smoke"}\n'
LEN=$(printf '%s' "$BODY" | wc -c | tr -d ' ')
# re-issue token with bytes=$LEN then:
# curl -X POST "$upload_url" -H "Authorization: Bearer $token" \
#   -H 'Content-Type: application/x-ndjson' -H "Content-Length: $LEN" --data-binary "$BODY"
# → 200 {"ticket_id":"…"}
```

## Diagnostic object storage

### Default (current)

Without cloud credentials, bundles land on **local disk** on the API VM:

- `PEBBLE_DIAGNOSTICS_DIR` (default under process cwd / `LOCAL_UPLOAD_DIR`)
- Fine for **single-node** ECS; not shared across hosts.

### R2 (recommended for multi-node / off-box)

**Bucket:** `nebutra-pebble-diagnostics` (private)

```bash
# 1) Create bucket (needs CLOUDFLARE_API_TOKEN with R2 Admin)
export CLOUDFLARE_API_TOKEN=…
export CLOUDFLARE_ACCOUNT_ID=a4248a5738df319996a70092fe598d37
bash infra/ops/scripts/provision-pebble-diagnostics-r2.sh

# 2) Dashboard: R2 → Manage R2 API Tokens → Object Read & Write on that bucket
#    Copy Access Key ID + Secret

# 3a) GitHub secrets (once)
printf '%s' "$R2_ACCESS_KEY_ID"     | gh secret set R2_ACCESS_KEY_ID -R Nebutra/Nebutra-Sailor
printf '%s' "$R2_SECRET_ACCESS_KEY" | gh secret set R2_SECRET_ACCESS_KEY -R Nebutra/Nebutra-Sailor
# optional: gh secret set R2_ACCOUNT_ID …

# 3b) Apply to ECS api-gateway env + restart
gh workflow run "Configure Pebble R2 on ECS" -R Nebutra/Nebutra-Sailor
```

Manual on the VM (equivalent of the workflow):

```bash
# on ECS
export R2_ACCESS_KEY_ID=… R2_SECRET_ACCESS_KEY=…
export R2_ACCOUNT_ID=a4248a5738df319996a70092fe598d37
export PEBBLE_DIAGNOSTICS_BUCKET=nebutra-pebble-diagnostics
bash /path/to/configure-api-r2-env.sh
# writes /var/www/nebutra/api/.env and pm2 restart api-gateway
```

Env keys consumed by gateway:

```env
UPLOAD_PROVIDER=s3   # or r2 (alias)
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_ENDPOINT=https://<account_id>.r2.cloudflarestorage.com
PEBBLE_DIAGNOSTICS_BUCKET=nebutra-pebble-diagnostics
```

## Deploy surfaces

| Change | How it ships |
|--------|----------------|
| `backends/gateway/**` | **Auto** on `main` push via `deploy-ecs.yml` (`api`) |
| `apps/forge/**`, `apps/router/**`, `apps/pebble/**` | **Auto** on `main` push |
| nginx vhosts only | Auto via forge (or any auto-CI app that matches nginx paths) |
| Other apps (web, auth, …) | Manual: `gh workflow run deploy-ecs.yml -f apps=…` |

```bash
# explicit gateway deploy (still valid anytime)
gh workflow run deploy-ecs.yml -R Nebutra/Nebutra-Sailor -f apps=api -f reason="…"
```

Brand nginx: `infra/runtime/nginx/conf.d/pebble.nebutra.com.conf` must keep `Host $host` + `X-Original-URI` on support locations.
