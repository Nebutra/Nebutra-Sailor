# Phase 0 Metabase Dashboards

Infrastructure-as-Code home for the Phase 0 analytics dashboards. Every SQL
file in this directory is version-controlled, reviewable, and intended to be
pasted into a Metabase **Native Query** card. Grouping these queries in the
repo keeps analytics changes in the same PR flow as product changes.

---

## What each dashboard answers

| File | Question it answers | Primary data source |
|------|---------------------|---------------------|
| `01-funnel-scaffold-to-license.sql` | Of users who scaffold, how many finish the license wizard, activate a CLI key, and land in the Sleptons community? Where do they drop off? | PostHog events (replayed into `analytics_events`) |
| `02-cohort-retention.sql` | For a given scaffold cohort (day X), what share come back on D1 / D7 / D30? | PostHog events |
| `03-channel-attribution.sql` | Which `utm_source` / `utm_medium` combinations convert scaffold → activated license best? | PostHog events |
| `04-payment-funnel-drop-off.sql` | By payment method (WeChat / Alipay / Stripe / Lemon Squeezy), what is the started → completed rate? Which abandons most? | PostHog events |
| `05-docs-pain-map.sql` | Top 20 documentation searches returning zero results — i.e. gaps that the content team must fill next. | PostHog events |
| `06-sleptons-engagement.sql` | Who are the most engaged Sleptons community members (profiles viewed / showcases posted / votes / connections)? | PostHog events |

> `metabase-setup.md` contains the step-by-step bootstrap guide for a fresh
> Metabase instance (database connections + importing each query).

---

## Importing into Metabase

For every `*.sql` file in this folder:

1. In Metabase, choose **+ New → SQL query**.
2. Pick the appropriate database connection:
   - Queries that read `analytics_events` → **Nebutra Analytics Events**
     (the Postgres replay of the PostHog event stream, or the ClickHouse
     warehouse exposed via Metabase's PostHog integration).
   - Queries that join Nebutra app tables (users, licenses, sleptons
     profiles) → also add the **Nebutra App** Postgres connection and use
     the Metabase model join UI.
3. Paste the SQL **verbatim** (including the leading comment block — it
   becomes the card description).
4. Save the card with the filename as the card name
   (e.g. `01-funnel-scaffold-to-license`).
5. Add the card to the **Phase 0 Funnel** dashboard.

---

## Update cadence

- **Preferred**: hourly aggregates. Set the Metabase model refresh to
  `1 hour`; dashboards embedded in Slack digests pick up the latest numbers
  without manual runs.
- **Acceptable**: daily refresh for the retention and attribution boards
  (they look at 30–90 day windows, so the hourly signal is noise).
- **Live**: the funnel board (`01`) and the payment drop-off board (`04`)
  should be live-refresh (5 minutes) during launch windows.

---

## Conventions followed by every file

- `timestamp >= NOW() - INTERVAL '<window> days'` rolling windows so
  dashboards stay "recent" with no manual date fiddling.
- PostHog properties accessed via Postgres JSONB (`properties->>'key'`) —
  Metabase transparently translates these to ClickHouse JSON access when
  the query runs against the PostHog warehouse directly.
- Each file starts with a comment block describing the question, the
  window, and any assumed events/properties. Treat the comment as part of
  the contract: if you change it, review the SQL below it.
