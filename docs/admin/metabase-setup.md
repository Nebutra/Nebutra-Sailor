# Metabase Setup — 30-minute BI for Sailor

> **TL;DR:** Metabase is the fastest way to get from "we have a Postgres" to "the founders see MRR every Monday." Free OSS via Docker, or $85/mo cloud. Always point it at a read-only replica, never the primary. Graduate to [Hex](./hex-setup.md) once you have a dedicated data analyst.

This guide walks through a complete Metabase setup in under 30 minutes. By the end you'll have three working dashboards: Daily Active Users, MRR, and Top Events.

See also: [`README.md`](./README.md) for the broader admin philosophy, [`retool-recipe.md`](./retool-recipe.md) for the CS-ops side, [`hex-setup.md`](./hex-setup.md) for the upgrade path.

---

## Why Metabase first

| Property | Metabase | Hex | Looker |
|---|---|---|---|
| Cost (small team) | Free (self-host) or $85/mo | $24/user/mo | $$$$ enterprise |
| Time to first dashboard | 10 min | 30 min | weeks |
| SQL required for basic charts | No (visual query builder) | Yes | No (LookML) |
| Notebook-style analysis | Limited | Excellent | No |
| Self-host option | Yes (OSS) | No | No |
| Best for | Founders + ops, < ~2k users | Data analyst + ML, > 2k users | Enterprise BI org |

For a team of 1–10 with no dedicated data analyst, Metabase is correct.

---

## Step 1 — Provision a read-only Postgres replica

**Never point Metabase at your primary database.** A bad analyst query (`SELECT * FROM events`) can lock the primary and take down your app. A read-only replica isolates the blast radius.

### Option A — Supabase

```bash
# In the Supabase dashboard:
# 1. Project → Settings → Database → Read-only replicas → Add replica
# 2. Copy the read-only connection string
```

### Option B — Neon

```bash
# In the Neon console:
# 1. Branches → Create branch → "metabase-read" → Read-only
# 2. Copy the connection string for that branch
```

### Option C — Self-managed Postgres

Provision a streaming replica or a logical-replication subscriber, then create a read-only role:

```sql
CREATE ROLE metabase_ro WITH LOGIN PASSWORD 'change-me';
GRANT CONNECT ON DATABASE app TO metabase_ro;
GRANT USAGE ON SCHEMA public TO metabase_ro;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO metabase_ro;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO metabase_ro;
```

### Add to your env contract

```env
# Read replica — used by Metabase, Hex, Retool reads, and analytics jobs.
# Never grant write privileges here.
READONLY_DATABASE_URL="postgres://metabase_ro:...@replica.example.com:5432/app?sslmode=require"
```

This is a Sailor convention: any tool that *reads* user data uses `READONLY_DATABASE_URL`; only the application server uses `DATABASE_URL`.

---

## Step 2 — Run Metabase

### Option A — Docker (self-host, free)

```bash
docker run -d \
  -p 3000:3000 \
  -v metabase-data:/metabase.db \
  --name metabase \
  metabase/metabase
```

Open http://localhost:3000 and complete the setup wizard. For production, swap the H2 application DB for a Postgres backing store (see Metabase docs) and put it behind your reverse proxy with SSO.

### Option B — Metabase Cloud ($85/mo starter)

Sign up at https://www.metabase.com/start/. No infrastructure, automatic upgrades, SSO included on higher tiers. Skip to Step 3.

---

## Step 3 — Connect Metabase to the read replica

In the setup wizard (or **Admin → Databases → Add database**):

| Field | Value |
|---|---|
| Database type | PostgreSQL |
| Host | (from your `READONLY_DATABASE_URL`) |
| Port | 5432 |
| Database name | (from URL) |
| Username | `metabase_ro` |
| Password | (from URL) |
| Use SSL | Yes |

Click **Save**. Metabase will scan the schema (~30s for typical Sailor schema).

---

## Step 4 — The first three dashboards every SaaS should build

These three dashboards cover ~80% of what a founder needs to glance at daily. Build them in this order.

### Dashboard 1 — Daily Active Users (DAU)

**New question → SQL editor:**

```sql
SELECT
  DATE_TRUNC('day', s.created_at AT TIME ZONE 'UTC') AS day,
  COUNT(DISTINCT s.user_id)                          AS dau
FROM sessions s
WHERE s.created_at > NOW() - INTERVAL '90 days'
GROUP BY 1
ORDER BY 1;
```

Visualization: **Line chart**, X = day, Y = dau. Save as "DAU — 90d". Add to a new dashboard "Product KPIs".

> Note: column names assume the default Sailor `sessions` table — adjust to your schema.

### Dashboard 2 — MRR (Monthly Recurring Revenue)

```sql
SELECT
  DATE_TRUNC('month', s.current_period_start AT TIME ZONE 'UTC') AS month,
  SUM(s.amount_cents) / 100.0                                    AS mrr_usd
FROM subscriptions s
WHERE s.status = 'active'
  AND s.current_period_start > NOW() - INTERVAL '12 months'
GROUP BY 1
ORDER BY 1;
```

Visualization: **Bar chart**. Save as "MRR — 12mo". Add to "Revenue" dashboard.

For a more accurate MRR (normalizing annual plans to monthly), pull from Stripe directly via the Stripe-Metabase integration or your `@nebutra/billing` mirror tables.

### Dashboard 3 — Top events (last 7 days)

```sql
SELECT
  event_name,
  COUNT(*)                          AS event_count,
  COUNT(DISTINCT user_id)           AS unique_users
FROM events
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY event_name
ORDER BY event_count DESC
LIMIT 25;
```

Visualization: **Table**, sorted by `event_count` desc. Save as "Top Events — 7d".

Add all three to a single dashboard called **"Founder Daily"**. Pin it. Subscribe yourself to a daily email digest (Metabase → Subscriptions). Done.

---

## When to upgrade to Hex

| Signal | Upgrade? |
|---|---|
| You have a full-time data analyst | Yes |
| Analyses need Python (forecasting, cohorts with custom logic, ML scoring) | Yes |
| You want Notion-style sharable notebooks | Yes |
| Stakeholders want to comment + collaborate inline | Yes |
| You're past ~2k MAU and queries are getting complex | Probably |
| You're still 1–10 people and SQL covers it | No, stay on Metabase |

See [`hex-setup.md`](./hex-setup.md) for the migration path.

---

## Security checklist

- [ ] Metabase points at `READONLY_DATABASE_URL`, never `DATABASE_URL`.
- [ ] Read-only role has `SELECT` only, no `INSERT/UPDATE/DELETE/TRUNCATE`.
- [ ] SSO enabled (Google Workspace / Okta / SAML) — no shared logins.
- [ ] Admin access restricted to founders + data team.
- [ ] No PII columns (raw email, phone) exposed in public dashboards — use Metabase's column-level permissions or views.
- [ ] Metabase instance behind your VPN or IP-allowlisted; not on the public internet.
- [ ] Backup the Metabase app DB if self-hosting (dashboards live there).

---

## Common questions

**"Can we use Metabase for writes / customer support actions?"**
No. Metabase is read-only by contract. For "find this user, refund their subscription, resend invoice," use Retool — see [`retool-recipe.md`](./retool-recipe.md).

**"Should we expose Metabase dashboards to customers?"**
Metabase has an embedding feature, but for customer-facing analytics you probably want a real charting library (Tremor, Recharts) inside `apps/web`. Embedding Metabase is fine for B2B "give the customer admin read access" scenarios.

**"What about ClickHouse for metering?"**
Sailor uses ClickHouse for the metering pipeline (`@nebutra/metering`). Metabase connects to ClickHouse natively — add it as a second database. Use Postgres replica for transactional analytics (users, subs) and ClickHouse for event analytics (API calls, usage).
