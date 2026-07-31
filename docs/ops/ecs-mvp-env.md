# ECS MVP Runtime Environment

This document is the minimum production environment contract for the ECS/PM2
deployment path. The deploy workflow forwards these values from the GitHub
`ecs-prod` environment to `/var/www/nebutra/{web,api,landing}/.env` on ECS.

## P0 Runtime Closure

| Capability | GitHub secret or variable | Notes |
| --- | --- | --- |
| Database runtime | `DATABASE_URL` | Pooled Postgres URL. Production is PlanetScale (PgBouncer endpoint) as of 2026-07; Supabase and Neon use their own pooler URLs. |
| Database migrations | `DIRECT_URL` | Direct (non-pooled) Postgres URL, required for migrations and restore on every provider. |
| Auth core | `BETTER_AUTH_SECRET`, `AUTH_PROVIDER`, `NEXT_PUBLIC_AUTH_PROVIDER`, `BETTER_AUTH_URL` | `AUTH_PROVIDER` defaults to `better-auth`; keep `BETTER_AUTH_SECRET` stable across deploys. |
| Enterprise SSO discovery | `AUTH_SSO_DISCOVERY_PROVIDERS` | Maps email domains to Clerk Enterprise SSO, Feishu/Lark OAuth, or explicit generic handoff URLs. |
| Nebutra-owned SSO issuer | `OIDC_ISSUER`, `OIDC_COOKIE_KEYS`, `OIDC_ENABLE_CLIENT_CREDENTIALS`, `REDIS_URL` | `apps/idp` runs at `https://sso.nebutra.com`. `OIDC_COOKIE_KEYS` must contain two or more high-entropy values. `REDIS_URL` must be an ioredis-compatible URL, not an Upstash REST URL. |
| Clerk auth | `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`, `CLERK_WEBHOOK_SECRET` | Required when `AUTH_PROVIDER=clerk`. |
| Public app URLs | `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_API_GATEWAY_URL`, `NEBUTRA_LANDING_ORIGIN`, `NEBUTRA_SESSION_HINT_DOMAIN` | Defaults target the production `nebutra.com` domains. |
| Redis/cache | `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` | Upstash network allowlist must include the ECS egress IP. |
| Social login | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`, `FEISHU_APP_ID`, `FEISHU_APP_SECRET` | The workflow also accepts legacy `GH_OAUTH_CLIENT_ID` and `GH_OAUTH_CLIENT_SECRET`. Feishu/Lark uses Better Auth generic OAuth and the callback `/api/auth/oauth2/callback/feishu`. |
| Transactional email | `RESEND_API_KEY`, `EMAIL_FROM` | Required for invitations, account email changes, and product notifications. |
| Billing | `STRIPE_SECRET_KEY`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_ID_PRO_MONTHLY`, `STRIPE_PRICE_ID_PRO_YEARLY` | Checkout returns 503 without `STRIPE_SECRET_KEY`. |
| AI assistant | one of `OPENAI_API_KEY`, `OPENROUTER_API_KEY`, `SILICONFLOW_API_KEY` | Chat returns 503 without a provider key. |
| Uploads | `UPLOAD_PROVIDER` plus provider keys | Prefer R2/OSS/S3 for production; local disk is only acceptable for a very early MVP. |
| Observability | `SENTRY_DSN`, `NEXT_PUBLIC_SENTRY_DSN`, `SENTRY_RELEASE`, `POSTHOG_KEY`, `POSTHOG_HOST`, `NEXT_PUBLIC_POSTHOG_KEY`, `NEXT_PUBLIC_POSTHOG_HOST` | `SENTRY_RELEASE` defaults to the deployed commit SHA. PostHog server keys are for product events from API/server code; public keys are for the browser SDK. |
| Scheduled jobs | `CRON_SECRET` | Required for protected cron routes. |
| Abuse protection | `TURNSTILE_SECRET_KEY`, `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | Recommended before opening public signup. |
| Service auth | `SERVICE_SECRET`, `ADMIN_API_KEY` | Required for mature service-to-service/admin surfaces. |

## Common Provider Choices

### R2 Uploads

Use these when `UPLOAD_PROVIDER=r2` or `UPLOAD_PROVIDER=s3` with R2:

```env
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_ENDPOINT=https://<account_id>.r2.cloudflarestorage.com
R2_BUCKET_UPLOADS=
R2_PUBLIC_URL=
# Pebble diagnostic bundles (private)
PEBBLE_DIAGNOSTICS_BUCKET=nebutra-pebble-diagnostics
```

See [pebble-support-intake.md](./pebble-support-intake.md) for provisioning + ECS apply.

### Resend Email

```env
RESEND_API_KEY=
EMAIL_FROM="Nebutra <noreply@nebutra.com>"
```

### Stripe Billing

```env
STRIPE_SECRET_KEY=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_PRICE_ID_PRO_MONTHLY=
STRIPE_PRICE_ID_PRO_YEARLY=
```

### Supabase Postgres Cutover

Migration uses the direct URL. Runtime uses the pooled URL.

```env
SOURCE_DATABASE_URL=
SUPABASE_DIRECT_URL=
SUPABASE_DATABASE_URL=
```

Run the migration helper in phases:

```bash
SOURCE_DATABASE_URL="postgresql://..." \
SUPABASE_DIRECT_URL="postgresql://..." \
SUPABASE_DATABASE_URL="postgresql://..." \
bash infra/ops/scripts/migrate-ecs-postgres-to-supabase.sh all
```

After verification, set `SUPABASE_DATABASE_URL` or `DATABASE_URL` in GitHub
`ecs-prod` and redeploy ECS.
