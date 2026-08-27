# Hex Setup — BI for teams with a data analyst

> **TL;DR:** Hex is the next step after [Metabase](./metabase-setup.md) once you hire a dedicated data analyst and your questions outgrow point-and-click SQL. Notebook-style (SQL + Python + chart in one cell), Notion-style sharing, $24/user/mo. Used publicly by Notion, Reddit, and Cisco; Vercel's data team is also a known Hex user.

See also: [`README.md`](./README.md) for the overall admin philosophy, [`metabase-setup.md`](./metabase-setup.md) for the predecessor tool.

---

## When Hex makes sense

| Signal | Verdict |
|---|---|
| You have a full-time data analyst or data scientist | Hex pays for itself |
| Past ~2k MAU, multi-table joins are the norm | Yes |
| You need Python (forecasting, cohort math, ML scoring) inline with SQL | Hex |
| Stakeholders comment on analyses Notion-style | Hex |
| You're 1–10 people, founders write the SQL | Stay on Metabase |
| You want self-host | Hex is cloud-only — stay on Metabase or look at Mode/Hex alternatives |

---

## Pricing snapshot

| Tier | Price | Notes |
|---|---|---|
| Free | $0 | 5 users, 1 workspace, hobbyist scale |
| Team | $24/user/mo | The common starting tier |
| Professional | Higher | SSO, scheduling, advanced features |
| Enterprise | Custom | SOC 2, audit logs, VPC, etc. |

Always check current pricing at https://hex.tech/pricing — these tiers shift.

---

## Step 1 — Sign up and connect SSO

1. Sign up at https://hex.tech.
2. Create a workspace for your company.
3. **Settings → Single Sign-On** → connect Google Workspace or Okta. Restrict membership to your company email domain.
4. Invite your data analyst(s) and any stakeholder who needs read access.

Hex's permission model is per-project, so a wide-open SSO + per-project ACL works well.

---

## Step 2 — Connect the read replica

Same contract as Metabase — point at `READONLY_DATABASE_URL`, never the primary.

**Workspace → Data sources → Add → PostgreSQL:**

| Field | Value |
|---|---|
| Host | (from `READONLY_DATABASE_URL`) |
| Port | 5432 |
| Database | (from URL) |
| User | `metabase_ro` (reuse the same read-only role) |
| Password | (from URL) |
| SSL | Required |

If your replica is in a private VPC, Hex offers a static IP / PrivateLink — coordinate with your infra team.

For ClickHouse (Sailor's metering store), Hex has first-class support — add it as a second data source.

---

## Step 3 — The notebook pattern

Hex's killer feature is the cell-mixed notebook. A single project can contain:

```
Cell 1 (SQL):    pull subscriptions joined with users from Postgres
                 → exposes a dataframe named `subs`
Cell 2 (Python): import pandas as pd; cohort = subs.groupby(...).agg(...)
                 → exposes `cohort`
Cell 3 (Chart):  visual chart builder, bound to `cohort`
Cell 4 (Text):   markdown summary for the stakeholder reading the page
Cell 5 (Input):  date-range parameter that feeds back into Cell 1
```

This pattern is what makes Hex worth the cost. You cannot do "SQL → Python pandas → chart → markdown narrative" cleanly in Metabase.

---

## Step 4 — Sharing and embedding

- **App view** — Hex projects render as Notion-style pages for stakeholders. Hide raw SQL/Python, show charts + narrative + parameter inputs.
- **Scheduled runs** — schedule a project to re-run daily; email a snapshot to a Slack channel.
- **Comments** — stakeholders comment on cells, like Google Docs.
- **Embed** — embed a chart or app view in Notion, Confluence, or your internal wiki.

---

## Migration path — Metabase → Hex

You do **not** have to migrate Metabase dashboards wholesale. The right migration pattern:

1. **Keep Metabase running** for founder/ops daily glance dashboards (the three from `metabase-setup.md`). These are simple and Metabase handles them fine.
2. **Move complex analyses to Hex** as they come up: cohort retention, LTV modeling, custom funnel math, forecasting, anomaly detection.
3. **Over time**, if Hex usage outpaces Metabase, you can fully migrate, but most teams run both indefinitely.

Hex projects can run the exact same SQL you wrote for Metabase questions — copy/paste the SQL, point at the same data source, done. The work is in the *Python/narrative* layer, not redoing the SQL.

---

## Who else uses Hex

Public references that Hex itself markets:

- **Notion** — features publicly in Hex's customer page.
- **Reddit**, **Cisco**, **ClickUp** — also publicly referenced.
- Vercel's data team is a commonly cited user (verify against current public talks before quoting externally).

---

## Security checklist

- [ ] SSO enforced, domain-restricted.
- [ ] Hex connects only to `READONLY_DATABASE_URL`.
- [ ] PII columns either excluded via SQL views or masked in shared apps.
- [ ] Audit log enabled (Professional+ tier).
- [ ] Schedule-run notifications go to a private internal channel, not a public/customer-facing one.
- [ ] Project-level permissions for any analysis containing customer PII.

---

## When Hex is *not* the answer

- **Customer-facing analytics in your product** — build with Recharts/Tremor inside `apps/web`. Don't embed Hex.
- **CS / ops actions (refund, change plan)** — that's Retool. See [`retool-recipe.md`](./retool-recipe.md).
- **Error tracking / APM** — Sentry + PostHog + OpenTelemetry.
