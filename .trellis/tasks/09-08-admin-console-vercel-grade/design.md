# Design — Admin Contract, first manifests, admin renderer

Model: see `model.md` (docs/plans/2026-09-08-admin-of-admins-model.md). This
file is the engineering cut for batch 1: **contract · router manifest · admin
renderer (Inbox, Fleet, Supply) · infra completion**.

## 0. Infra audit (2026-09-08) and what we complete

| Gap found | Completion in this batch |
|---|---|
| No admin/manifest/action contract anywhere | `@nebutra/contracts` gains `admin.ts` (zod): manifest, resource, action envelope (plan→apply), signal, policy, status enum, staff role ladder. Subpath export `@nebutra/contracts/admin`. |
| `@nebutra/health` exists but Next apps return ad-hoc shapes or only `/api/e2e/health` | Every Fly Next app gets `GET /api/health` on the package's `HealthCheckResult` shape (router, admin, forge, web, idp, auth, sailor-docs, pebble, design, kuanlan). One shared route body; `version` = package version. |
| Gateway admin routes guarded by shared `x-admin-key`, no role | Not touched in batch 1 (kuanlan manifest is batch 2). Design decision recorded: product manifests are guarded by `x-service-token` (`verifyServiceToken`, HS256 `SERVICE_SECRET`) whose `role` claim must be on the staff ladder. |
| No service-token helper outside `apps/web` | `apps/admin/src/lib/contract-client.ts` signs with `signServiceToken` (`role` = caller's PlatformStaff role, `userId`). |
| No MCP-over-HTTP in gateway; forge hand-rolls one | Deferred to step 6; the manifest is written so tools derive mechanically (`resource.list` → read tool, `action` → plan/apply tools). |
| Inngest exists, no admin events | Event names reserved: `nebutra/admin.signal.raised`, `nebutra/admin.action.applied`. Policy `supply.autosync` in batch 2. |

## 1. Contract (`packages/commerce/contracts/src/admin.ts`)

```ts
AdminStatus       = "healthy" | "degraded" | "down" | "unknown"
StaffRole         = "platform_readonly" | "platform_support" | "platform_operator" | "platform_owner"
Severity          = "info" | "warn" | "critical"

AdminResource     { id, label, list: url, detail?: url, columns: [{key,label,kind}], search: bool, actions: actionId[] }
AdminAction       { id, verb, resource?: id, role: StaffRole, plan: bool, destructive: bool, input?: JSONSchema, url }
AdminSignal       { id, label, severity, probe: url, resource?: id, action?: actionId }
AdminPolicy       { id, label, on: eventName, runs: actionId, enabled: bool }
AdminDomain       { id: DomainId(11), resources[], actions[], signals[], policies[], slot?: url }
AdminManifest     { contract: "nebutra.admin/v1", product, version, origin, graph, status, health: url, audit?: url, domains: Record<DomainId, AdminDomain> }

ActionPlanRequest { mode: "plan", input }            → ActionPlan   { planId, summary, diff: [{op,path,from,to}], affected: [{resource,id,label}], warnings[] }
ActionApplyRequest{ mode: "apply", input, planId? }  → ActionResult { auditId, summary, result? }
SignalReading     { id, status: "ok"|"raised", severity, probedAt, title?, detail?, resource?, action?, data? }
ResourceList<T>   { items: T[], total, probedAt? }
```

Envelope rules live as zod refinements: a `destructive` action apply must carry `planId`; `SignalReading.probedAt` is required; `status` never defaults.

## 2. Router manifest (the product owns its admin domain)

`apps/router` serves, guarded by `requireStaffServiceToken()` (verifies `x-service-token`, role on ladder, 5-minute expiry):

| Path | What |
|---|---|
| `GET /.well-known/nebutra-admin.json` | manifest (public, no secrets: only URLs and schemas) |
| `GET /api/admin/v1/supply/engines` | resource list: cliproxyapi + new-api reachability, version, latency |
| `GET /api/admin/v1/supply/accounts` | resource list from CLIProxyAPI `GET /v0/management/auth-files` (provider, account, status, lastUsed) |
| `GET /api/admin/v1/supply/shelf` | New-API `/v1/models` ∩ catalog with supply class |
| `POST /api/admin/v1/supply/actions/channel.sync` | plan → `{ diff: +models/−models, affected: channel }`; apply → upsert channel, audit |
| `GET /api/admin/v1/supply/signals/{channel.drift,account.expired,engine.down}` | SignalReading |

Supply logic moves from `apps/admin/src/lib/supply.ts` into `apps/router/src/lib/supply/*` (cohesion). `apps/admin` keeps only the management-UI proxy (`/management.html`, `/v0/management/*`) because it is a browser surface, not a contract call — the manifest's `slot` for the supply domain points at it.

Secrets move with the logic: `CLIPROXY_API_KEY`, `CLIPROXY_MANAGEMENT_KEY`, `NEW_API_ROOT_PASSWORD` on `nebutra-router` (it already holds `NEW_API_*`); admin keeps `CLIPROXY_MANAGEMENT_KEY` for the proxy. Both get `SERVICE_SECRET`.

## 3. Admin app

- `lib/contract-client.ts`: `loadManifests()` (from `FLEET` entries with `manifest: true`, cached 60 s), `listResource`, `probeSignal`, `planAction`, `applyAction` — all signed with the caller's staff role.
- `lib/inbox.ts`: union of raised signals across manifests → items `{ product, signal, severity, title, detail, action?, probedAt }`, sorted severity × product.
- Pages (v2 visual system, no Settings tab): `/` Inbox (hero) + metrics strip + fleet cards; `/fleet` probes every `FLEET` health URL in parallel (4 s timeout, 30 s cache) and shows `probedAt`; `/supply` renders router's supply domain from the manifest with the generic renderer; `/tenants` stays on the current directory (batch 2).
- Generic renderer: `ResourceTable` (columns from manifest), `ActionButton` (plan dialog → apply), `SignalStrip`. Role gating from `getStaffContext()`; actions whose `role` outranks the caller are not rendered.
- Every apply writes one audit event via `@nebutra/audit` **on the product side** (the product owns the write); admin only displays.

## 4. Health completion

`packages/platform/health` gains `nextHealthRoute({ service, version, checks })` returning a Next `GET` handler on `HealthCheckResult`. Each app's `src/app/api/health/route.ts` is three lines. Fleet reads it.

## 5. Tests

- contracts: schema round-trips, destructive-apply-needs-plan refinement.
- router: manifest validates against schema; signals return `probedAt`; plan produces diff from stubbed engines; apply rejected without staff token.
- admin: inbox ranking; renderer hides actions above role; fleet probe marks `unknown` on timeout, never green.
