# Metabase Setup — Phase 0

Step-by-step runbook for standing up Metabase, wiring its database
connections, and importing the six Phase 0 dashboards.

---

## 1. Start the analytics stack

```bash
pnpm analytics:up
```

This brings up:

- `analytics-postgres` — Postgres backing PostHog + the replay table
  `analytics_events`.
- `analytics-clickhouse` — PostHog's warehouse (if using the direct PostHog
  integration instead of the replay table).
- `metabase` — the dashboard app.
- `umami-postgres` — Umami's own Postgres (for site analytics).

---

## 2. Open Metabase and complete admin setup

- URL: `http://localhost:3005`
- Create the admin account (store the credentials in 1Password under the
  `Nebutra / Metabase admin` item).
- Skip the "Add your data" prompt — we'll add connections manually next.

---

## 3. Add the **Nebutra Analytics Events** database

Settings → Admin → Databases → **Add database**.

| Field | Value |
|-------|-------|
| Display name | `Nebutra Analytics Events` |
| Engine | PostgreSQL |
| Host | `analytics-postgres` (inside the compose network) **or** `localhost` when running Metabase outside Docker |
| Port | `5432` inside the network, `5433` when exposed to the host |
| Database name | `posthog` |
| Username | `analytics` |
| Password | Pull from `.env` (`ANALYTICS_DB_PASSWORD`). Never commit the raw value. |
| SSL | Off locally, **required** in staging/production. |

Click **Save**. Metabase will run the initial sync — wait for `analytics_events`
to appear in the data browser before continuing.

---

## 4. Add the **Nebutra App** database

Same screen, a second connection, so queries can join licenses / users /
sleptons profiles with analytics events via Metabase models.

| Field | Value |
|-------|-------|
| Display name | `Nebutra App` |
| Engine | PostgreSQL |
| Host | `app-postgres` / your managed Postgres host |
| Port | `5432` |
| Database name | `nebutra` |
| Username | Read-only role — never the migration user. |
| Password | From `.env` (`APP_DB_READONLY_PASSWORD`). |

---

## 5. Import each SQL file as a Native Query card

For every file in `docs/analytics/dashboards/*.sql`:

1. **+ New → SQL query**.
2. Select the **Nebutra Analytics Events** database (all six Phase 0
   queries live there).
3. Paste the file contents verbatim, including the leading comment block.
4. **Save** with the filename (no extension) as the card name, e.g.
   `01-funnel-scaffold-to-license`.
5. Move the card into the collection **Phase 0 Funnel**.

---

## 6. Assemble the dashboard

1. **+ New → Dashboard**, name it **Phase 0 Funnel**.
2. Add all six cards. Suggested layout:
   - Row 1 (full width): `01-funnel-scaffold-to-license` (bar chart).
   - Row 2: `02-cohort-retention` (line chart) | `04-payment-funnel-drop-off` (table).
   - Row 3: `03-channel-attribution` (table) | `05-docs-pain-map` (table).
   - Row 4 (full width): `06-sleptons-engagement` (leaderboard table).
3. Set dashboard auto-refresh to **1 hour** (override to 5 minutes for the
   funnel and payment cards during launch windows).

---

## 7. Optional — embed in Slack

- Metabase → dashboard → Sharing → **Create a subscription**.
- Daily 09:00 Asia/Shanghai to `#nebutra-analytics`.
- Send an additional Monday-morning digest to `#founders`.

---

## 8. Validation checklist

- [ ] Each of the six cards renders without a SQL error.
- [ ] The Phase 0 Funnel dashboard resolves in under 10 seconds on a cold
      cache.
- [ ] Slack subscription has fired at least once.
- [ ] Read-only DB role is in use — verify by attempting an `INSERT` from
      Metabase's SQL editor and confirming it fails.
