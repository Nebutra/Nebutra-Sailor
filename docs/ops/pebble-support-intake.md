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
```

## Deploy surfaces

- Gateway code: `backends/gateway` → ECS PM2 `api-gateway` (`deploy-ecs.yml` apps=`api` or monorepo map).
- Brand nginx: `infra/runtime/nginx/conf.d/pebble.nebutra.com.conf` (must ship `X-Original-URI` + `Host $host` on support locations).
