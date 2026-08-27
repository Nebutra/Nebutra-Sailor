# Nebutra Admin — Ecosystem Control Plane (PRD)

**Date:** 2026-07-28
**Status:** Approved (scope & auth model); Phase 1 landing
**Host:** `admin.nebutra.com`
**App:** `apps/admin` (`@nebutra/admin`)
**Tracking:** [#344](https://github.com/Nebutra/Nebutra-Sailor/issues/344)
**Related:** `docs/DOMAINS.md`, `backends/gateway/src/routes/admin/index.ts`, `docs/admin/README.md`, ADR 2026-06-04 (production runtime closure)

---

## 1. Problem

The ecosystem is now 13 apps, one gateway, and three runtimes (Vercel, Cloudflare Workers, ECS PM2). There is no single place that answers the questions an operator asks daily:

| Question | How it is answered today | Cost |
|---|---|---|
| Is `router` reaching its upstreams? | SSH to ECS, `pm2 logs router`, or hand-curl an upstream | minutes, no history |
| Is the Forge job queue backed up? | `curl -H 'X-Admin-Key' api.nebutra.com/api/v1/admin/dlq` | requires the shared secret in a shell |
| Which tenant should be suspended? | `GET /api/v1/admin/tenants` by hand, decide, POST suspend | no UI, no audit narrative |
| Does `app.nebutra.com` run on ECS or Vercel? | read `docs/DOMAINS.md` and hope it is current | doc drift is the only guard |
| What shipped where, when? | GitHub Actions run list per workflow | no cross-app view |

Every answer is a different tool, and none of them leaves an audit trail attached to a **person**.

### 1.1 Ecosystem inventory (as of 2026-07-28)

| App | Package | Host | Runtime today | Deploy target key |
|---|---|---|---|---|
| landing | `@nebutra/landing` | `nebutra.com`, `www` | Vercel | `DEPLOY_TARGET_LANDING` |
| web | `@nebutra/web` | `app.nebutra.com` | ECS PM2 :3000 | `DEPLOY_TARGET_WEB` |
| auth-center | `@nebutra/auth-center` | `auth.nebutra.com` | ECS PM2 :3101 | `DEPLOY_TARGET_AUTH` |
| idp | `@nebutra/idp` | `sso.nebutra.com` | ECS PM2 :3100 | — |
| gateway | `backends/gateway` | `api.nebutra.com` | ECS PM2 :3002 | `DEPLOY_TARGET_GATEWAY` |
| router | `@nebutra/router` | `router.nebutra.com` | ECS PM2 :3106 | `DEPLOY_TARGET_ROUTER` |
| forge | `@nebutra/forge` | `forge.nebutra.com` | ECS PM2 :3105 | `DEPLOY_TARGET_FORGE` |
| sailor-docs | `@nebutra/sailor-docs` | `docs.nebutra.com` | CF Worker (OpenNext) | `DEPLOY_TARGET_SAILOR_DOCS` |
| design-docs | `@nebutra/design-docs` | `design.nebutra.com` | ECS PM2 :3004 | `DEPLOY_TARGET_DESIGN_DOCS` |
| studio | `@nebutra/studio` | `nebutra.sanity.studio`, `studio.` | Sanity-hosted | — |
| typelens | `@nebutra/typelens` | `typelens.nebutra.com` | Vercel | `DEPLOY_TARGET_TYPELENS` |
| sleptons | `@nebutra/sleptons` | — | not published | — |
| storybook / mail-preview | — | — | internal only | — |
| **admin (new)** | `@nebutra/admin` | `admin.nebutra.com` | ECS PM2 :3108 | `DEPLOY_TARGET_ADMIN` |

Pre-existing drift this PRD partially closes: `DEPLOY_TARGET_AUTH` and `DEPLOY_TARGET_SAILOR_DOCS` are documented in `docs/DOMAINS.md` but `auth`, `router`, `forge`, and `typelens` were never registered in `DEPLOYABLE_SERVICES` (`packages/ops/preset/src/deploy-target.ts`), so those keys resolved to a thrown error. Phase 1 registers all of them alongside `admin` rather than adding `admin` to a list that is already wrong.

---

## 2. Decision record — first-party control plane

`apps/web/src/app/(app)/admin/page.tsx` carries a standing decision in its header comment:

> *"This page is deliberately thin. […] full user/org CRUD and customer-support flows belong in Retool/Metabase wired to the internal API, not in self-built UI. See docs/admin/retool-recipe.md."*

**That decision is superseded by this PRD.** The reasoning that made it correct — do not hand-build CRUD screens for one product — does not extend to what is needed now:

1. **The unit of work is the ecosystem, not a table.** "Which of 13 apps is degraded, on which runtime, at which version" is not a CRUD screen; it is a domain model (fleet, supply, queue) that Retool cannot express without becoming an unversioned second codebase.
2. **The data already lives in typed repo artifacts** — `brand.domains`, `infra/iac/ecs/ecosystem.config.cjs`, `packages/platform/router-supply`, `packages/ai/forge-runtime` — reachable from TypeScript, not from SQL. A SQL-first tool sees none of it.
3. **Identity and audit.** Retool wired to `X-Admin-Key` produces audit rows that say "someone used the key". Staff-scoped OIDC produces rows that name a person.
4. **Tenant-context contamination.** Anything hosted inside `apps/web` inherits an active-tenant context and the product navigation. A cross-tenant, cross-product view fights that on every page.

**New positioning of the third-party tools** (`docs/admin/retool-recipe.md`, `metabase-setup.md`, `hex-setup.md`): ad-hoc data exploration, one-off SQL, and analyst self-service. They are no longer the operator entry point. Those docs get a positioning header when this PRD lands; their content stays valid.

`apps/web/(app)/admin` disposition is deliberately deferred to Phase 3 (see §8) so this work does not touch the product app before the control plane can replace it.

---

## 3. Users

Staff roles are **orthogonal to tenant roles**. `packages/iam/permissions/src/roles.ts` (`owner` / `admin` / `member` / `viewer` / `billing_admin`) is entirely tenant-scoped and is not extended.

| Staff role | Job stories |
|---|---|
| `platform_owner` | "Flip a feature flag for one tenant without a deploy." · "See what shipped to which host in the last 24h before I approve a release." · "Grant and revoke staff access." |
| `platform_operator` | "Router upstream started 5xx-ing — see which engine and which alias is affected." · "Forge DLQ has entries — replay the recoverable ones." · "Confirm every app is on the runtime `docs/DOMAINS.md` claims." |
| `platform_support` | "A customer cannot log in — find their tenant, check plan and suspension state." · "Impersonate a user for 15 minutes to reproduce, with the session on record." · "Issue an access invite." |
| `platform_readonly` | "Read the fleet and tenant dashboards without being able to change anything." |

---

## 4. Information architecture

Five top-level areas. No tenant switcher, no product navigation.

| Area | Panels | Data sources | Write actions |
|---|---|---|---|
| **Fleet** | app matrix (host · runtime · deploy target · version · health · last deploy); DNS/runtime consistency check | `brand.domains`; `infra/iac/ecs/ecosystem.config.cjs`; per-app `/api/health`; GitHub Actions API | none in P0 |
| **Tenants** | directory (users + orgs, paginated search); tenant detail (plan, usage, suspension); impersonation; access invites | gateway `/v1/admin/tenants*`; logic lifted from `apps/web/src/components/admin/admin-directory-data.ts` and `apps/web/src/app/api/admin/*` | suspend · unsuspend · impersonate · invite · feature-flag override |
| **Router** | engine inventory & health; alias table; model catalog; wallet/quota | `packages/platform/router-supply/src/{engines,inventory,alias,resolve}.ts`; `packages/platform/prepaid-wallet`; `@nebutra/ai-providers/catalog` | none in P0 (read-first) |
| **Forge** | tool-catalog consistency (`/tools.json` vs `forge-runtime/registry.ts`); job queue; DLQ | `packages/ai/forge-runtime/src/{registry,jobs}.ts`; gateway `/v1/admin/dlq` | DLQ replay |
| **Audit** | staff action log, filterable by actor / action / target | `@nebutra/audit` → `queryAuditLogs()` | none |

Every write action emits an audit event before responding (§6.2).

---

## 5. P0 functional specification

All four areas are P0. What is *not* P0 is depth: each area ships its read surface plus the listed write actions, nothing more.

### 5.1 Fleet

- **App matrix** — one row per deployable service. Columns: app, host, expected runtime (from `resolveDeployTarget`), observed health, version/commit, last successful deploy.
- **Health** — `GET /api/health` on each app, returning `{ status, version, commit, checks: [{name, ok, ms}] }`. **Gap:** most apps have no health endpoint today. Phase 1 renders configuration state only and labels it as such; Phase 2 adds the endpoints and switches the column to live probing. A health column that shows green because nothing was probed is worse than no column — hence the explicit phase split.
- **Consistency check** — flag any app whose observed runtime disagrees with its `DEPLOY_TARGET_*`, and any host in `brand.domains` with no owning app (or vice versa). This is the mechanism that keeps `docs/DOMAINS.md` from silently rotting.

### 5.2 Tenants

Consumes the existing gateway surface; no new tenant logic:

- `GET /v1/admin/tenants` — list with plan + usage
- `GET /v1/admin/tenants/:id` — detail
- `POST /v1/admin/tenants/:id/suspend` · `/unsuspend`
- `GET /v1/admin/usage/report` — cross-tenant aggregation
- `GET|POST /v1/admin/feature-flags` — runtime override records

Directory search, impersonation, and access invites exist today in `apps/web` (`/api/admin/{directory,users,organizations,impersonate,access-invites}`). Phase 3 lifts them into the gateway so admin and web share one implementation. Impersonation is capped at 15 minutes, writes an audit event on issue *and* on use, and is restricted to `platform_support` and above.

### 5.3 Router

Read-only in P0: engine inventory and reachability, alias → model resolution table, catalog freshness (`@nebutra/ai-providers/catalog` vs what the router advertises), wallet balances and quota consumption. Supply mutations stay in the engines' own consoles until the read surface has proven correct.

### 5.4 Forge

Tool-catalog drift check (the published `/tools.json` against `forge-runtime` registry), job queue depth and failure rate, DLQ listing with per-entry replay through the existing `POST /v1/admin/dlq/:id/replay`.

---

## 6. Auth & security

### 6.1 Three layers, all required

1. **Edge — Cloudflare Access.** Protects every path on `admin.nebutra.com`, including `/api/*`. Policy: internal email domain + hardware key. The application never treats CF Access as authorization; it is the outer door.
2. **Identity — OIDC against `sso.nebutra.com`.** `apps/admin` is a relying party of the existing IdP (`apps/idp`). Clients are DB-backed rows in `OAuthClient`, so onboarding admin is a seeded row with `redirect_uris = ["https://admin.nebutra.com/api/auth/callback/oidc"]` — **the issuer is not modified** (`sso.nebutra.com` is a permanent issuer per `docs/DOMAINS.md`).
3. **Authorization — `PlatformStaff`.** A new table keyed on `userId`, orthogonal to tenant membership:

   ```prisma
   model PlatformStaff {
     userId     String   @id @map("user_id")
     role       PlatformStaffRole
     grantedById String? @map("granted_by_id")
     grantedAt  DateTime @default(now()) @map("granted_at")
     revokedAt  DateTime? @map("revoked_at")
     note       String?  @db.Text
   }
   ```

   `PlatformStaffRole ∈ platform_owner | platform_operator | platform_support | platform_readonly`. CASL abilities come from a new `platformAbilityFor(role)` in `packages/iam/permissions/src/platform.ts`. `DEFAULT_ROLES` is untouched — mixing platform and tenant roles in one map is exactly how a staff capability leaks into a tenant session.

**`X-Admin-Key` is retained but demoted** to machine-to-machine callers (ops Slack bot, cron). It is no longer a human entry point. The admin server calls the gateway with a short-lived S2S JWT (`jose`) carrying the staff subject and role, so gateway-side audit records the person.

### 6.2 Minimum role per write action

| Action | Minimum role | Audit event |
|---|---|---|
| read any panel | `platform_readonly` | — |
| DLQ replay | `platform_operator` | `admin.dlq.replay` |
| feature-flag override | `platform_operator` | `admin.feature_flag.override` |
| tenant suspend / unsuspend | `platform_operator` | `admin.tenant.suspend` / `.unsuspend` |
| impersonate | `platform_support` | `admin.impersonate.issue`, `admin.impersonate.use` |
| access invite | `platform_support` | `admin.invite.issue` |
| grant / revoke staff | `platform_owner` | `admin.staff.grant` / `.revoke` |

Every event carries `actor` (OIDC `sub`), `actorRole`, `target`, and before/after state where applicable.

---

## 7. Non-goals

- No tenant-visible functionality on `admin.nebutra.com`. Not a customer portal.
- No second API gateway. Every server call goes through `api.nebutra.com/v1/admin/*`.
- No log aggregation or APM. Sentry and the existing observability stack own that; Fleet links out.
- No replacement for SQL exploration. Metabase/Hex/Retool keep that job.
- No supply mutation in P0 (Router panels are read-first).

---

## 8. Phased roadmap

### Phase 1 — Scaffold and foundations (this change)

1. `admin` key in the domain SSOT (`scripts/brand-types.ts`) → `pnpm dns:render` picks it up.
2. `docs/DOMAINS.md`: domain table, production-truth table, DNS reference block, repo-variable table, origin-TLS SAN list.
3. `apps/admin` scaffold modeled on `apps/typelens` (Next 16 + `@nebutra/tokens` + `@nebutra/ui` + OpenNext-capable), dev port **3108**.
4. `DEPLOY_TARGET_ADMIN` — plus registration of the previously-missing `auth`, `router`, `forge`, `typelens` services.
5. PM2 entry in `infra/iac/ecs/ecosystem.config.cjs` (PORT 3108).
6. `PlatformStaff` + `PlatformStaffRole` in the Prisma schema, migration **generated, not applied**.
7. `platformAbilityFor()` + `PLATFORM_STAFF_ROLES` in `packages/iam/permissions`, with tests.
8. One read-only Fleet page rendering the app matrix from configuration, proving the scaffold/tokens/DS path.

**Phase 1 explicitly does not**:

- **Authenticate anyone.** No OIDC, no Cloudflare Access. Nothing in the app is safe to expose.
- **Wire deployment or DNS.** `admin` is absent from `.github/workflows/deploy-ecs.yml` and has no nginx vhost; the DNS record is recorded as *not yet created* in `docs/DOMAINS.md`. The PM2 slot is reserved, not deployed. Wiring lands with the Access policy, not before — a reachable unauthenticated control plane is worse than no control plane.
- **Probe live health**, or expose any write action.
- **Add a `vercel.json`.** A Vercel project would give the app a second public origin that Cloudflare Access does not cover.

The control plane is not "live" at the end of Phase 1.

### Phase 2 — Identity and live Fleet
OIDC RP wiring + staff-gated middleware; CF Access policy documented; unified `/api/health` across apps; GitHub Actions deploy history; `deploy-ecs.yml` + nginx vhost + the DNS record, all gated on the Access policy existing first.

### Phase 3 — Tenants and Audit
Lift `apps/web/api/admin/*` into the gateway; admin consumes it; web-side surface reduced to a thin shell or redirect (decision made here, not before). Audit area with impersonation trail.

### Phase 4 — Router and Forge
Supply/inventory/alias/wallet panels; Forge catalog-drift check, queue, DLQ replay.

---

## 9. Risks

| Risk | Mitigation |
|---|---|
| Fleet shows green without probing anything | Phase 1 labels the matrix as configuration state; live health is a Phase 2 gate, not a nice-to-have |
| A staff capability leaks into a tenant session | `PlatformStaff` is a separate table and a separate ability builder; add an architecture test asserting `DEFAULT_ROLES` contains no `platform_*` role and that tenant ability builders never read `PlatformStaff` |
| Cloudflare Access as a single point of entry | OIDC + staff role remain enforced in-app, so losing CF Access degrades defense-in-depth without opening the door |
| Dual-track drift between `admin` and web `/admin` | No new functionality may be added to web `/admin`; it converges on-touch and is resolved in Phase 3 |
| ECS box growing another Node process | admin is a low-traffic internal surface; PM2 entry capped at 350M, and it is the last app to be added before the Vercel cutover reduces ECS residency |

---

## 10. Acceptance

**Documentation**
- This PRD exists; `docs/DOMAINS.md` mentions `admin` in the domain table, production-truth table, DNS block, variable table, and TLS SAN list.
- `docs/admin/README.md` states the new positioning of Retool/Metabase/Hex.

**Phase 1 code**
```bash
pnpm install
pnpm --filter @nebutra/admin typecheck
pnpm --filter @nebutra/admin test
pnpm --filter @nebutra/permissions test        # platformAbilityFor
pnpm --filter @nebutra/preset test             # DEPLOYABLE_SERVICES contract
pnpm --filter @nebutra/admin dev               # http://localhost:3108 → fleet matrix
pnpm dns:render && git diff infra/ops/dns/     # admin record appears
pnpm lint                                      # governance ratchets
```
- `prisma validate` passes; migration SQL generated under `packages/platform/db/prisma/migrations/`, not applied to production.
- New pages: no hardcoded hex, tokens only, icons from `@nebutra/icons`, separation by spacing and background tint rather than borders.
