# Admin Stack — Philosophy & Map

> **TL;DR:** Sailor deliberately ships a thin self-built `/admin` (KPI dashboard + impersonate). For user CRUD, customer support, content ops, and BI, connect external best-of-breed tools (Metabase/Hex, Retool, Sanity, Sentry/PostHog). This is exactly what Stripe, Linear, Vercel, Brex, and Mercury do internally — the more successful the company, the *less* they self-build their admin.

---

## The 5-Layer Admin Stack

Most internal-tool needs fall into one of five layers. Sailor's opinion: own the layers that are unique to your product; rent the rest from tools that are already better than anything you'll build in-house.

| Layer | Need | Recommended tool | What Sailor ships | Status |
|---|---|---|---|---|
| **1. Data exploration / BI** | Ad-hoc SQL, dashboards, weekly metrics, board decks | **Metabase** (free OSS, $85/mo cloud) → **Hex** ($24/user/mo) when you hire a data analyst | Read-only replica env var contract (`READONLY_DATABASE_URL`) | External |
| **2. CS / Ops console** | Find user, refund, change plan, resend invoice, unlock account | **Retool** ($10–50/user/mo) → self-hosted Appsmith past 200 internal users | `@nebutra/admin-tooling` REST contract + `@nebutra/audit` + `@nebutra/permissions` | External + thin contract |
| **3. Founder/exec KPI dashboard** | Single glance — MRR, signups, churn, error rate today | **Self-built `/admin/dashboard`** (Next.js, lives in `apps/web`) | `/admin/dashboard` route + `/admin/impersonate` escape hatch | We ship this |
| **4. Content ops** | Marketing pages, blog, docs, changelog, legal | **Sanity Studio** | `apps/studio` (Sanity v4) — already wired | We ship this |
| **5. Eng ops / observability** | Error tracking, perf, product analytics, traces | **Sentry + PostHog + OpenTelemetry** | `@nebutra/logger` (pino + Sentry transport), OTel SDKs in gateway | External + wired |

---

## Why Sailor doesn't ship a heavy admin

> **"越成功的公司，admin 投入越少。"**
> The more successful the company, the less they invest in their own admin.

Look at what public engineering blogs and conference talks tell us about real internal stacks:

| Company | User CRUD / CS ops | BI / dashboards | Content |
|---|---|---|---|
| Stripe | Internal Ruby tool, but most one-off ops via Retool/Mode | Mode + internal | — |
| Linear | Retool | Metabase historically, internal now | — |
| Vercel | Retool + internal Next.js admin | Hex | Sanity |
| Notion | Retool | Hex (publicly featured Hex case study) | — |
| Cal.com | Retool | Metabase | — |
| Brex | Retool (publicly discussed) | Looker / internal | — |
| Mercury | Retool (publicly discussed) | Looker / internal | — |

Pattern: **every one of them connects external tools at layers 1, 2, and 4.** None of them re-implements a generic "user table with edit modal" inside their main product app.

Why this matters for a template:

1. **Buyer optionality.** Different buyers have wildly different ops needs. An indie hacker wants Metabase free tier. A 50-person company wants Retool with SSO. A 500-person company wants Looker + self-hosted Appsmith. A template that ships one opinionated admin loses all of them.
2. **Maintenance burden.** Every self-built admin screen is a screen you have to design, test, secure, accessibility-audit, and i18n. Retool's table component already does 100% of that.
3. **Security surface.** A self-built `/admin/users/[id]/edit` page is one auth misconfig away from a data breach. Pushing writes through `@nebutra/admin-tooling` (audited, permission-gated REST endpoints) + Retool's RBAC is *fewer* moving parts, not more.
4. **Talent fit.** Ops teams already know Retool/Metabase. New hires onboard in hours, not weeks.

---

## Decision tree — should you self-build this admin feature?

Walk top to bottom. The first "no" means **don't build it** — connect an external tool instead.

```
1. Is this feature unique to your product's core domain?
   (e.g. "approve a deployment", "review a fraud signal in our scoring model")
      ├── no  → STOP. Use Retool. (User CRUD, refunds, plan changes are NOT unique.)
      └── yes ↓

2. Will a non-engineer use it more than 5 times per week?
      ├── no  → STOP. A Retool app or a SQL snippet in Metabase is enough.
      └── yes ↓

3. Does it require >3 screens or multi-step workflows tightly coupled to product state?
      ├── no  → STOP. Single-screen Retool app.
      └── yes ↓

4. Will it be used by 10+ internal users concurrently?
      ├── no  → STOP. Retool scales fine to single-digit users; cheaper than building.
      └── yes ↓

5. Does the access pattern require sub-100ms response, deep React state, or live collab?
      ├── no  → STOP. Retool still wins.
      └── yes → OK, build it inside `apps/web/app/admin/*` and wire it through @nebutra/admin-tooling.
```

The vast majority of admin features hit "no" on question 1. That is the correct answer.

---

## What we DO ship

These are the pieces of the admin stack Sailor owns and maintains. Everything else is external by design.

| Surface | Path | Purpose |
|---|---|---|
| Founder KPI dashboard | `apps/web/app/admin/dashboard` | Single-page glance: MRR, DAU, signups today, error rate, queue depth |
| Impersonate escape hatch | `apps/web/app/admin/impersonate` | Log in as any user (audited, time-boxed, requires 2 admin approvals) |
| Admin tooling contract | `@nebutra/admin-tooling` | REST endpoints under `/api/admin/tools/*` that Retool/Forest/etc. connect to. Every endpoint goes through `withAuditHook()` + `requirePermission()`. |
| Audit log | `@nebutra/audit` | Tamper-evident audit trail for every admin write (SOC 2 ready) |
| Permissions | `@nebutra/permissions` | RBAC/ABAC engine (CASL + OpenFGA) — gates every admin endpoint |
| Read replica contract | `READONLY_DATABASE_URL` env var | Standard env contract for Metabase/Hex/Retool reads |

That's it. ~6 surfaces, all small, all maintained.

---

## Setup guides

Pick the tools that match your stage and follow the matching guide. They're cross-referenced — start with Metabase and Retool; graduate to Hex when you hire a data analyst.

- [`metabase-setup.md`](./metabase-setup.md) — BI in 30 min, free OSS or $85/mo cloud. Start here for layer 1.
- [`hex-setup.md`](./hex-setup.md) — Graduate from Metabase once you're past ~2k users and have a dedicated analyst.
- [`retool-recipe.md`](./retool-recipe.md) — CS / ops console in 30 min. Free for ≤5 users. Start here for layer 2.

For layer 4 (content) see [`apps/studio/README.md`](../../apps/studio/README.md). For layer 5 (observability) see the runbooks under `infra/runtime/`.

---

## Anti-patterns

Things we have seen in other templates and explicitly do not do:

- Shipping a generic "users table" with edit/delete in the main app. Retool does this better in 5 minutes.
- Building a SQL console inside `/admin`. Metabase does this better and is sandboxed.
- Custom dashboards for every metric. Metabase questions + Slack alerts cover 95% of need.
- Hand-rolled audit log. Use `@nebutra/audit` everywhere or you will fail SOC 2.
- Writing directly to `DATABASE_URL` from Retool. Always go through `/api/admin/tools/*` so writes are audited.

---

## Further reading

- ["Why we use Retool"](https://retool.com/customers) — Brex, Mercury, Doordash case studies
- Hex publicly featured customers: Notion, Reddit, Cisco
- Sanity Studio docs: https://www.sanity.io/docs/studio
- Internal: `docs/architecture/2026-05-10-ts-by-default-python-only-when-justified.md` (same philosophy applied to backends)
