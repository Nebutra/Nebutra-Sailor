# Admin of Admins — one control model for every Nebutra SaaS

- **Date**: 2026-09-08
- **Status**: Proposal (owner brief: "一般 SaaS admin 要什么，再抽象一层做管理 SaaS admin 的 admin，包罗万象、闭环一致")
- **Owner**: tseka_luk
- **Related**: [admin control-plane PRD](./2026-07-28-nebutra-admin-control-plane-design.md), [closure phase](../architecture/2026-08-27-closure-phase.md), task `09-08-admin-console-vercel-grade`

---

## 1. The idea in one paragraph

Every SaaS admin is made of the same eleven domains, and inside each domain
the same four kinds of things: **resources** (nouns), **actions** (audited
verbs), **signals** (probed facts), **policies** (actions the system runs by
itself). Call that the **Admin Contract**. A product's admin is one instance
of the contract. Nebutra's admin is the same contract one level up: its rows
are products instead of tenants, and it adds the things that only exist
across products — fleet, one identity, consolidated money, shared supply,
staff. Because both levels speak the same contract, one UI renders both,
one audit stream records both, and one loop closes both:

```text
signal ──▶ inbox item ──▶ action (plan → apply) ──▶ audit event ──▶ signal resolves
                 ▲                                                        │
                 └──────────────── policy (automatic, reported) ◀─────────┘
```

Nothing enters the UI except through this loop. That is what "闭环一致" means mechanically.

## 2. Level 0 — what every SaaS admin needs (the canonical eleven)

| Domain | Resources | Actions (audited) | Signals | Default policies |
|---|---|---|---|---|
| **Identity** | users, orgs/teams, memberships, sessions, invitations | invite · remove · transfer ownership · force sign-out · impersonate (timed) | sign-in failures, dormant orgs | expire invites; revoke sessions on role change |
| **Access** | roles, permissions, API keys, service accounts, SSO connections | grant · revoke · rotate key · scope key | keys unused 90 d, over-privileged roles | rotate reminders; disable unused keys |
| **Commerce** | plans, prices, subscriptions, invoices, payments, credits/wallet, coupons, refunds | change plan · refund · credit · void invoice · retry payment | failed payments, churn risk, negative balance | dunning; auto-suspend on repeated failure |
| **Usage & limits** | meters, quotas, rate limits, entitlements (plan → features → limits), overrides | set override · reset quota · raise limit | quota ≥ 80 %, burst abuse, cost per tenant | notify at 80 %; throttle at 100 % |
| **Catalog** | product-specific nouns: models & shelf (router), tools (forge), packs (kuanlan), templates | publish · unpublish · reprice · alias | drift between source and published, stale prices | draft → preview → publish with changelog |
| **Operations** | services, deploys, jobs, queues, DLQ, crons, caches | redeploy · rollback · replay · purge · pause | health, latency, error rate, queue depth, failed deploys | auto-replay transient DLQ; page on down |
| **Integrations** | inbound webhooks, outbound webhooks, connectors, OAuth apps, email/SMS providers | replay delivery · rotate secret · reconnect | delivery failure rate, expired tokens | retry with backoff; disable after N failures |
| **Trust** | audit log, data export/deletion requests, security settings, abuse reports, legal docs & consent | export · delete (2-step) · block · accept report | pending GDPR requests, anomalous admin activity | SLA timers on requests |
| **Support** | tickets, feedback, announcements, changelog, status page | reply · escalate · announce · post incident | unanswered > SLA, sentiment | auto-acknowledge; link incidents to status page |
| **Growth** | waitlist, referrals, campaigns, funnels, cohorts | approve · invite batch · tag | conversion drop, waitlist size | invite N/day |
| **Settings** | branding, domains, email templates, locales, environments | edit · verify domain · switch environment | domain/DNS mismatch, template errors | certificate renewal |

Every cell above already has a package in this repo (`@nebutra/auth`,
`permissions`, `billing`, `metering`, `feature-flags`, `webhooks`, `audit`,
`notifications`, `waitlist`, `status`, `health`, …). The domains are not new
work; the contract that lets one UI speak to all of them is.

## 3. The Admin Contract (what a product exposes)

One manifest, one API shape, one event schema. Lives in
`packages/commerce/contracts` (already "cross-package contracts"); no new package.

```jsonc
// GET https://<product-origin>/.well-known/nebutra-admin.json
{
  "product": "router", "version": "0.1.1", "graph": "core", "status": "wip",
  "domains": {
    "catalog": {
      "resources": [{ "id": "model", "list": "/admin/v1/models", "detail": "/admin/v1/models/{id}",
                      "columns": ["id","supply","price","status"], "search": true }],
      "actions":   [{ "id": "shelf.publish", "verb": "Publish", "resource": "model", "plan": true,
                      "role": "platform_operator", "destructive": false }],
      "signals":   [{ "id": "shelf.drift", "probe": "/admin/v1/signals/shelf.drift", "severity": "warn" }],
      "policies":  [{ "id": "shelf.autosync", "on": "supply.account.changed", "runs": "shelf.publish" }]
    },
    "usage": { "...": "..." }
  },
  "audit": { "stream": "/admin/v1/audit", "schema": "nebutra.audit/v1" },
  "health": "/api/health"
}
```

Rules the contract enforces:

1. **Actions have an envelope**: `POST <action> { mode: "plan" | "apply", input }` →
   `{ diff, affected, warnings }` for plan, `{ auditId, result }` for apply.
   No write without a plan; destructive ones require the plan id on apply.
2. **Signals are probed, never configured.** A signal carries `probedAt`;
   the UI shows the age and refuses to colour anything it did not probe.
3. **Audit envelope is one schema** (`@nebutra/audit` today): actor · action ·
   resource · outcome · diff · request id. Product and platform write the
   same shape to the same stream.
4. **Status vocabulary is one enum**: `healthy · degraded · down · unknown`.
   `unknown` is a first-class state and renders grey, never green.
5. **Roles are one ladder**: product roles map onto the platform ladder
   (`readonly · support · operator · owner`) so a staff grant means the same
   thing in every product.
6. **Money is one unit** (USD cents, with display currency) so consolidated
   revenue, supply cost and margin add up across products.

## 4. Level 2 — Nebutra admin as the aggregate

Same UI, rows are products. Plus the six cross-cutting things that only exist
at this level:

| Cross-cutting | What it is | Source of truth |
|---|---|---|
| **Fleet** | every product's health/deploy/drift on one matrix | manifests' `health` + deploy-target resolver + GitHub Actions |
| **One identity** | a person is one Nebutra account across products; staff is a platform grant | `auth` / `sso` + `PlatformStaff` |
| **Money, consolidated** | revenue per product − supply cost (router engines, infra) = margin | `billing` + `metering` + router usage ledger |
| **Shared supply** | router's engines and account pool serve every product's AI needs | `router-supply`, New-API, CLIProxyAPI |
| **Trust, consolidated** | one audit search, one GDPR queue, one incident timeline | `audit` stream union, `status` |
| **Inbox** | union of unresolved signals across products, ranked by severity × revenue at risk | derived |

Navigation follows the model, not the org chart:
**Inbox · Fleet · Customers · Money · Supply · Catalog · Trust · Staff · Settings**.
(Today's "Tenants" becomes Customers; "Audit" folds into Trust; "Supply" and
"Catalog" split because supply is capacity and catalog is what we sell.)

## 5. The loop, spelled out per level

| Step | Product admin | Platform admin |
|---|---|---|
| Signal | `quota ≥ 80 %` for tenant X | `channel drift` on router, `deploy failed` on forge |
| Inbox item | "Tenant X will hit its limit tomorrow. Raise limit / Notify / Ignore" | "Router shelf is missing 2 served models. Sync now" |
| Action | `usage.override` plan → apply | `catalog.shelf.publish` plan → apply |
| Audit | one event, one schema | same |
| Resolve | signal re-probes green; inbox item closes itself | same |
| Policy | notify at 80 % automatically; only 100 % reaches a human | auto-sync on `supply.account.changed`; only OAuth reaches a human |

An inbox item is never closed by hand alone; it closes when its signal clears.
That single rule keeps the UI honest.

## 6. Productisation consequences

- **create-sailor ships the manifest.** Every scaffolded SaaS is manageable
  from Nebutra admin on day one, with the canonical eleven pre-wired to the
  packages it already includes. That is the template's selling point:
  "your admin is done, and your platform admin is done".
- **One renderer.** `apps/admin` gets a generic resource renderer
  (list · detail · actions with plan→apply · signals strip) driven by the
  manifest; product-specific screens (router's supply capacity, forge's
  tool drift) are slots, not forks. The same renderer can be embedded in a
  product's own admin (`apps/web/src/components/admin` today) so product
  and platform look and behave identically.
- **Policies are visible.** A `Policies` panel per domain shows each rule
  and its last runs, like a CI history. Automation is trusted because it is
  legible.
- **Notifications carry deep links to inbox items**; the item page is
  phone-friendly because OAuth device flows are finished on a phone.

## 7. Principles → mechanisms (owner: 高内聚 · 高自由 · 低耦合 · AI 原生 · 不堆设置)

| Principle | Mechanism | Test that proves it |
|---|---|---|
| **高内聚** | The **domain** is the unit. A product's admin domain (its resources, actions, signals, policies, and the UI slot for anything non-generic) lives next to the product code and is declared in that product's manifest. `apps/admin` owns no domain logic, only the renderer, the inbox and the cross-cutting six. | Deleting a product deletes its admin surface with it; nothing in `apps/admin` has to change. |
| **低耦合** | Admin ↔ product talk only through the contract: manifest, action envelope, audit stream, health. No shared tables, no imports across the line. The gateway serves the manifest; the admin app fetches it. | Any contract-speaking client can operate a product — the admin app, a CLI, an agent — and a product can be managed by an admin it has never heard of. |
| **高自由** | No fixed screens per resource. Views are **queries over the contract** ("accounts expiring this week", "tenants on Free above 80 %"); any query can be saved as a view or turned into a policy. Every UI action *is* an API call and shows it (copy as curl). A raw action console exists for what the UI has not caught up with. | An operator can express a need the designer did not anticipate without a code change. |
| **AI 原生** | The contract is exposed as **MCP tools** (`packages/ai/mcp`): each resource a read tool, each action a plan/apply tool, each signal a probe. The ⌘K bar is a conversation over those tools. Inbox items are **written by the model** from raw signals: what happened, who is affected, the recommended plan, one button to apply. **Policies are natural-language intents** ("keep Codex capacity above 20 %", "never let a Pro tenant hit 100 % without a notice") compiled to actions and run by an agent with a capped staff role (`platform_operator`), every step audited as `agent:<name> on behalf of <user>`. The same tools let the digital employees behind contact@ act on the platform with the same limits. | Removing the LLM leaves a working but duller admin; adding it adds no new permissions. |
| **不堆设置** | **If it is in the repo, it is not a setting.** Fleet reads `brand.domains` and deploy targets; entitlements read plan definitions; nothing is duplicated into a form. What remains configurable is either an **intent** (policy with a default) or a **fact the system cannot infer** (a domain, a payment key). Settings appear only when a signal needs them ("domain not verified → verify here"), never as a tab to browse. | The Settings area has fewer than a dozen fields per product and none of them mirror a value that exists in code. |

Boundaries that keep AI-native safe: the model proposes, the contract executes; plan→apply is mandatory for agents as for humans; destructive actions need a human apply; the agent's role is a real `PlatformStaff` grant with a real revocation; nothing the agent reads from tenants is instructions.

Navigation after these principles: **Inbox · Fleet · Customers · Money · Supply · Catalog · Trust · Staff** — no Settings tab. Configuration lives inside the domain that needs it and inside policies.

## 8. Rollout (within the closure contract: no new packages, no new nouns)

1. **Contract** — manifest schema, action envelope, status enum, role ladder
   in `packages/commerce/contracts`; audit schema is `@nebutra/audit` as is.
2. **First manifests** — router (supply, catalog, usage) served by the
   gateway; kuanlan (commerce, usage) reusing its existing admin routes.
3. **Renderer + Inbox** in `apps/admin` on the v2 visual system; Fleet and
   Supply are the first two domains rendered from manifests.
4. **Policies** on Inngest (`backends/gateway/src/inngest`), starting with
   `shelf.autosync` and `account.expired → inbox`.
5. **create-sailor** emits the manifest for the packages a scaffold picks.

6. **MCP surface** — the manifest doubles as tool definitions in
   `packages/ai/mcp`; the ⌔K bar and the policy agent consume it. Ships after
   step 3 so the first agent actions run against a rendered, audited surface.

Batch 1 of task `09-08-admin-console-vercel-grade` becomes steps 1 + 3
(contract; Inbox, Fleet, Supply rendered from manifests), with step 6
following as soon as two manifests exist.
