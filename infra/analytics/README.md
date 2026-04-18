# Self-Hosted Analytics Stack

PostHog CE + Umami + Metabase, wired to a shared Postgres instance. Follows the ADR
`docs/architecture/2026-04-18-license-sleptons-cli-closed-loop.md` §10 Q1 decision — no
paid SaaS, no Vercel/GA dependencies, CN-friendly (ad-blocker immune where possible).

## Services

| Service   | Purpose                                              | Host port | In-container port |
|-----------|------------------------------------------------------|-----------|-------------------|
| PostHog CE | Product analytics — funnels, cohorts, retention      | 8000      | 8000              |
| Umami     | Privacy-first pageview tracking (ad-blocker immune)  | 3010      | 3000              |
| Metabase  | BI dashboards over Postgres                          | 3005      | 3000              |
| analytics-postgres | Shared metadata DB for Umami + Metabase     | 5433      | 5432              |
| posthog-redis | Redis for PostHog job queue / caching            | (internal)| 6379              |

Host ports are deliberately non-default to avoid collision with the main app
Postgres (`5432`) and the web app dev servers.

## Quick start

```bash
# From repo root
cp infra/analytics/env.example infra/analytics/.env     # then edit secrets
pnpm analytics:up                                       # docker-compose up -d
pnpm analytics:smoke                                    # run smoke tests
```

### First-time setup

- **PostHog** (http://localhost:8000)
  - Visit the URL and complete the signup flow to create the initial admin user.
  - Create a project, copy the **Project API Key** (`phc_...`) — use this as
    `POSTHOG_PROJECT_API_KEY` in apps that ingest events.
- **Umami** (http://localhost:3010)
  - Default login: `admin` / `umami`. Change the password immediately.
  - Add a website → copy the tracking script tag or the Website ID for JS SDK use.
- **Metabase** (http://localhost:3005)
  - Complete the admin user flow on first visit.
  - Under *Admin → Databases*, add the application Postgres as a **read-only**
    data source (create a dedicated read-only role in the app DB — do NOT reuse
    the migrator role).

## Wiring Metabase to the application Postgres

Create a read-only user in the application database:

```sql
CREATE ROLE metabase_reader LOGIN PASSWORD '<strong-password>';
GRANT CONNECT ON DATABASE <app_db> TO metabase_reader;
GRANT USAGE ON SCHEMA public TO metabase_reader;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO metabase_reader;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO metabase_reader;
```

Then in Metabase: *Admin → Databases → Add database* with host, port, db name,
user `metabase_reader`, and the password above.

## Running the smoke test

```bash
pnpm analytics:smoke
```

Runs `infra/analytics/smoke-test.ts` via Vitest and checks:
- PostHog `/_health` returns 200
- Umami `/api/heartbeat` returns 200 or 401
- Metabase `/api/health` returns 200
- PostHog `/capture/` accepts a synthetic event

Metabase's first-boot migration can take 30–60 s; the smoke test tolerates this
with a 30s timeout.

## Tear down

```bash
pnpm analytics:down         # stop containers, keep volumes
pnpm analytics:reset        # stop and DELETE all data volumes
```

## Environment variables

All secrets have dev-friendly defaults but MUST be overridden in production.

| Variable                        | Purpose                                        | Default (dev)                     |
|---------------------------------|------------------------------------------------|-----------------------------------|
| `ANALYTICS_POSTGRES_PASSWORD`   | Shared Postgres password                       | `analytics_dev_password`          |
| `POSTHOG_SECRET_KEY`            | Django `SECRET_KEY` for PostHog                | `dev_posthog_secret_change_me`    |
| `POSTHOG_SITE_URL`              | Public URL PostHog uses for links in emails   | `http://localhost:8000`           |
| `UMAMI_APP_SECRET`              | Umami session / cookie secret                  | `dev_umami_secret_change_me`      |
| `POSTHOG_PROJECT_API_KEY`       | Only used by smoke test — optional             | `phc_test`                        |

## Security notes

- **Never** commit a real `.env` file. `infra/analytics/.env` is in `.gitignore`.
- In production, rotate all secrets and use a proper secret manager (AWS Secrets
  Manager, HashiCorp Vault, Doppler, etc.).
- The `posthog` image ships as a monolithic all-in-one for dev; for production
  use the official Helm chart and split web/worker/plugins into dedicated pods.
- Restrict Metabase's Postgres user to `SELECT` on required schemas only.
- Consider putting PostHog / Metabase behind an auth proxy (oauth2-proxy,
  Pomerium) if exposed beyond `localhost`.

## Image version pinning

All services pin to specific versions for reproducibility — do NOT use `:latest`:

- `postgres:16-alpine`
- `redis:7-alpine`
- `posthog/posthog:release-1.62.0`
- `ghcr.io/umami-software/umami:postgresql-v2.14.0`
- `metabase/metabase:v0.52.0`

Bump versions deliberately via a PR so CHANGELOG captures the change.
