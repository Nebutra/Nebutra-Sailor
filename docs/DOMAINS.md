# Domain Configuration

## Domain Structure

| Subdomain | App | Purpose |
|-----------|-----|---------|
| `nebutra.com` | landing | Marketing site |
| `www.nebutra.com` | landing | Redirect to apex |
| `auth.nebutra.com` | auth-center | **Login center** (Better Auth UX + session authority for multi-app RPs) |
| `app.nebutra.com` | web | Main SaaS dashboard (RP — redirects unauthenticated users to auth) |
| `api.nebutra.com` | api-gateway | BFF API endpoints |
| `sso.nebutra.com` | idp | **OIDC IdP** — issuer URL permanent; used for SSO / internal tools |
| `design.nebutra.com` | design-docs | Design system docs (ECS PM2 :3004) |
| `status.nebutra.com` | landing (host alias) | Public status page — Vercel landing, rewrite `/` → `/status` |
| `open.nebutra.com` | landing (host alias) | **云毓开放平台** — public catalog; `/` rewrites to `/open`. Console is `app` `/settings/developers` |
| `docs.nebutra.com` | sailor-docs (Fly Next Machine) | Product/docs site |
| `nebutra.sanity.studio` | studio | Canonical Sanity-hosted Studio |
| `studio.nebutra.com` | studio | Optional branded Studio alias |
| `router.nebutra.com` | router | **Nebutra Router** — model fabric / OpenAI-compatible product edge (ECS PM2) |
| `forge.nebutra.com` | forge | **Nebutra Forge** — tool station + Agent tool API (Vercel; ECS PM2 fallback :3105) |
| `leak.nebutra.com` | forge-dns-leak | **DNS leak authority zone** — NS → `ns1.leak.nebutra.com` (UDP/TCP 53 on Fly dedicated IPv4; DNS-only glue) |
| `admin.nebutra.com` | admin | **Ecosystem control plane** — staff-only (Cloudflare Access + `sso` OIDC + platform-staff role). Never tenant-visible. See [PRD](./plans/2026-07-28-nebutra-admin-control-plane-design.md) |
| `pebble.nebutra.com` | `apps/pebble` + external repo `Nebutra/pebble` | **Pebble brand front** — landing / download / feeds on ECS; product API on shared gateway |
| `carina.nebutra.com` | (external repo `Nebutra/carina` → `apps/docs`) | **Carina product docs** — Astro + Starlight static site. No backend of its own. |

> Router/Forge: product hosts; supply engines (New-API, Sub2API) stay **internal** — see `infra/nebutra-router/`.

### Open Platform — catalog on landing, console on app

`open.nebutra.com` is a **host alias**, not a new app. Same pattern as `status.nebutra.com`.

| Capability | Host + path |
|---|---|
| Public catalog | `open.nebutra.com` → landing `/open` |
| Developer console | `app.nebutra.com/settings/developers` |
| API keys / webhooks / provider keys | `app.nebutra.com/settings/{api-keys,webhooks,provider-keys}` |
| Docs / API / SSO | `docs` / `api` / `sso` — existing hosts |

Do not add `apps/open`, `api.open.*`, or a second Vercel project. Bring-up: land `/open` on landing, then run **Point DNS** (`point-dns.yml`, host=`open`, target=`vercel`) — it upserts the Cloudflare CNAME and attaches `open.nebutra.com` on `nebutra-landing`. Smoke `/` on the alias (must rewrite, must not 301 to apex).

Sign-in-with-Nebutra client registration is **not** self-serve yet. The catalog links the existing OIDC issuer and docs.

### Pebble — brand front, platform backend

Pebble is a separate repo but is **not** allowed a parallel origin stack. Only the
brand front gets a host; everything transactional runs on the shared platform hosts.

| Capability | Host + path |
|---|---|
| Landing / download | `pebble.nebutra.com` (CF A → ECS PM2 `pebble` :3017) |
| Docs | `docs.nebutra.com/pebble/*` — canonical; `pebble.nebutra.com/docs/*` redirects here |
| Feedback | `POST api.nebutra.com/pebble/v1/feedback` |
| Diagnostics | `POST api.nebutra.com/pebble/diagnostics/{token,upload,delete/:ticketId}` |
| Status | `status.nebutra.com` |
| Staging | **no host** — env / project isolation only |

Handlers live in `backends/gateway/src/routes/pebble/`. They are unauthenticated
by design — Pebble users have no Nebutra account — and bounded by per-IP rate
limits, exact-size body caps, and single-use 10-minute upload tokens instead of
identity. Baseline policy: 4 MiB cap, 30-day retention, swept hourly by the
`pebble-diagnostics-retention` Inngest function.

Config: `PEBBLE_DIAGNOSTICS_TOKEN_SECRET` (falls back to `SERVICE_SECRET`) and
`PEBBLE_DIAGNOSTICS_BUCKET` (defaults to `nebutra-pebble-diagnostics`).

**Frozen decision (2026-07-27):** the API namespace is **prefixed**, not flat.
`api.nebutra.com` is shared across every product, so `/v1/*` stays unclaimed and
each product owns `/<product>/v1/*`. Do not add `api.pebble.*`, `status.pebble.*`,
or `staging.pebble.*`. Client-side origins are build-time configurable
(`DOCS_ORIGIN` / `API_ORIGIN` / `STATUS_ORIGIN`) — see the Pebble repo's
`docs/reference/infra-index.md`.

### Carina — product docs front, local-first runtime

Carina is a separate repo (`Nebutra/carina`). The public host is **docs only**
(Astro + Starlight under `apps/docs`). The runtime itself stays local-first;
identity/cloud boundaries are documented in Carina's `docs/nebutra-cloud-boundary.md`
and do **not** get a parallel `api.carina.*` origin.

| Capability | Host + path |
|---|---|
| Product docs / LLM surface | `carina.nebutra.com` (**CF CNAME → Fly** `nebutra-carina`, proxied) |
| Skills / catalog URLs | `carina.nebutra.com/llms.txt`, `/data/rpc-catalog-*.json` |
| Agent **execution** (Track B) | **Not this host.** Self-deployed Carina daemon; Sailor docks via private JSON-RPC (`CARINA_JSONRPC_URL`). See ADR 2026-08-03 + issue #384 |
| Staging | **no host** — preview deploys / project isolation only |

**Owner topology (2026-09-01):** DNS is a proxied CNAME to the Fly unique
host for `nebutra-carina` (static nginx, `sin`). Do **not** point carina
at Vercel. The ECS nginx vhost + rsync script stay as
`rollback-carina-ecs` only.

**Deploy:** `deploy-carina-fly.yml` (checks out `Nebutra/carina`, builds
`apps/docs`, ships `dist/` as `infra/fly/Dockerfile.carina`).

Legacy Vercel experiment (`deploy-carina-vercel.yml`) and ECS rsync
(`deploy-carina-ecs.yml`) are superseded.

**Bring-up order:** (1) Fly Machine healthy on `nebutra-carina.fly.dev`
(2) `fly certs add carina.nebutra.com` + ACME CNAME (3) grey CNAME then
orange-cloud (4) smoke `/` + `/llms.txt` (must not 301 to apex).

## Production truth (as of 2026-07-22)

Single source of truth for *where traffic lands today*. Do not invent a second story in other docs without updating this table.

| Host | DNS (Cloudflare) | Runtime | Notes |
|------|------------------|---------|-------|
| `nebutra.com` / `www` | Vercel anycast / CNAME | **Vercel** landing | Marketing |
| `docs.nebutra.com` | CNAME → Fly unique host **proxied** | **Fly** `nebutra-docs` | `deploy-fly.yml` app=`sailor-docs` |
| `app.nebutra.com` | A `106.15.4.31` proxied | **ECS PM2** `web` | Target: Vercel (`nebutra-web`) when builds are green |
| `auth.nebutra.com` | Worker **custom domain** only (`workers_dev: false`) | **Auth edge**: `/api/auth/*` + Hyperdrive; UI → ECS. No `*.workers.dev` test URL. | Rollback: `point-dns.yml` host=`auth` target=`ecs`; emergency Vercel only |
| `api.nebutra.com` | A `106.15.4.31` proxied | **ECS PM2** `api-gateway` | Stay on ECS origin |
| `sso.nebutra.com` | CNAME → Fly unique host **proxied** | **Fly** `nebutra-idp` | **Permanent OIDC issuer** `https://sso.nebutra.com` |
| `router.nebutra.com` | A `106.15.4.31` proxied | **ECS PM2** `router` | Product edge :3106; Vercel project `nebutra-router` exists for future cutover |
| `forge.nebutra.com` | A `106.15.4.31` proxied | **ECS PM2** `forge` | Product edge :3105; Vercel project `nebutra-forge` exists (Hobby deploy cap) |
| `ns1.leak.nebutra.com` | A Fly dedicated IPv4 **DNS only** | **Fly** `nebutra-dns-leak` | Glue for leak zone — never orange-cloud |
| `leak.nebutra.com` | NS → `ns1.leak.nebutra.com` | **Fly** authoritative | Session probes `{n}.{sid}.s.leak.nebutra.com`; see `packages/ai/forge-dns-leak/README.md` |
| `admin.nebutra.com` | CNAME → Fly unique host **proxied** | **Fly** `nebutra-admin` | Staff-only: Cloudflare Access in front of the Machine |
| `pebble.nebutra.com` | A `106.15.4.31` proxied | **ECS PM2** `pebble` :3017 | Brand front. Owner topology 2026-07-30: same ECS A pattern as app/api (not Vercel). nginx `conf.d/pebble.nebutra.com.conf`. Deploy: `deploy-ecs.yml` apps=`pebble`. Legacy `POST /v1/feedback` + `/diagnostics/*` reverse-proxy to api-gateway `/pebble/*`. |
| `carina.nebutra.com` | CNAME → Fly unique host **proxied** | **Fly** `nebutra-carina` nginx static | Product docs (Astro) from `Nebutra/carina` `apps/docs`. Deploy: `deploy-carina-fly.yml`. ECS rsync is `rollback-carina-ecs` only. |
| `status.nebutra.com` | A `106.15.4.31` proxied | **ECS nginx** reverse-proxy → landing `/status` | vhost `conf.d/status.nebutra.com.conf` (no 301 to apex). Content from Vercel landing. Future: pure Vercel CNAME when CF token has DNS Edit + landing prod green (`point-status-dns-vercel.sh`). |
| `open.nebutra.com` | CNAME `cname.vercel-dns.com` **proxied** | **Vercel landing** host alias | Bind on project `nebutra-landing` (`point-dns.yml` host=`open` target=`vercel`). Rewrite `/` → `/open`. Console: `https://app.nebutra.com/settings/developers`. Do not add `apps/open` or `api.open.*`. |
| `design.nebutra.com` | A `106.15.4.31` proxied | **ECS PM2** `design-docs` :3004 | nginx `conf.d/design.nebutra.com.conf`. Deploy: `deploy-ecs.yml` apps=`design-docs`. Without PM2 → CF 502; without vhost → 301 apex. DNS: `point-design-dns-ecs.sh`. |

### Topology layers

| Layer | Role | Apps |
|-------|------|------|
| **Cloudflare** | DNS, CDN, WAF, edge Workers | All public hostnames; gateway Workers for edge API |
| **Vercel** | Git-native frontends | landing, docs (+ web/auth when cut over) |
| **ECS (slim)** | Origin processes | web*, auth*, api, sso/idp |

\* web/auth currently origin on ECS; Vercel Git auto-deploy for those two is off in `vercel.json`. kuanlan stays Git-linked and is skipped until `package.json` lands — [vercel-spend.md](./ops/vercel-spend.md). Product-edge Fly Machines: [fly-origin.md](./ops/fly-origin.md) (DNS still ECS until `FLY_API_TOKEN` + cutover).

### Repo variables (no drift)

| Variable | Production value | Meaning |
|----------|------------------|---------|
| `HA_TOPOLOGY` | `cf-edge + vercel-marketing/docs + ecs-origin(app,auth,api,sso)` | Describe *actual* routing |
| `DEPLOY_TARGET_LANDING` | `vercel` | Primary deploy path |
| `DEPLOY_TARGET_SAILOR_DOCS` | `vercel` (temp) / `cloudflare-workers` (target) | Push path for `deploy-sailor-docs.yml`. Prefer CF Workers when token has **Workers Scripts Edit**; until then set `vercel`. Token ops: [ops/cloudflare-ci-token.md](./ops/cloudflare-ci-token.md) |
| `DEPLOY_TARGET_WEB` | `vercel` | *Target* platform; production traffic still ECS until DNS cutover |
| `DEPLOY_TARGET_AUTH` | `cloudflare-workers` | Thin auth-edge Worker (`wrangler.edge.jsonc`); ECS UI origin; Vercel emergency-only |
| `DEPLOY_TARGET_ADMIN` | `standalone` | Control plane — ECS origin only; a Vercel project would create a second origin outside Cloudflare Access |
| `DEPLOY_TARGET_GATEWAY` | `cloudflare-workers` | Edge API |
| `NEXT_PUBLIC_AUTH_URL` | `https://auth.nebutra.com` | Login center origin |
| `ECS_HOST` | `106.15.4.31` | Cloud VM origin |

`deploy-ecs.yml` remains the **manual fallback** for ECS apps (`web` `auth` `api` `idp`, and optionally `landing` / `sailor-docs` / `design-docs`). Prefer **Cloudflare Workers (OpenNext)** for docs (`docs.nebutra.com`); Vercel is quota-limited Hobby fallback. Marketing (`nebutra.com`) stays on Vercel. Do **not** point `docs.nebutra.com` DNS at ECS in steady state — ECS sailor-docs is emergency-only.

PM2 release / preflight gotchas (sibling wipe, webpack `build:vm`, explicit `apps=`): [ops/ecs-pm2-release-lessons.md](./ops/ecs-pm2-release-lessons.md).

## DNS records (reference)

Hostnames dogfood `brand.domains` (`pnpm brand:apply`). Zone files: `pnpm dns:render` → `infra/ops/dns/`. See [brand-hardcode-governance.md](./architecture/brand-hardcode-governance.md).


```
Type    Name      Value                    Proxy        Notes
----    ----      -----                    -----        -----
A       @         76.76.21.21              ✅           Vercel apex
CNAME   www       cname.vercel-dns.com     ✅
A       app       106.15.4.31              ✅           ECS (interim)
A       auth      106.15.4.31              ✅           ECS (interim)
A       api       106.15.4.31              ✅           ECS
CNAME   sso       d66pwdj.nebutra-idp.fly.dev ✅        Fly OIDC issuer
A       router    106.15.4.31              ✅           ECS PM2 @nebutra/router
A       forge     106.15.4.31              ✅           ECS PM2 @nebutra/forge
CNAME   admin     w00nrye.nebutra-admin.fly.dev ✅      Fly staff control plane (Access)
CNAME   docs      999625y.nebutra-docs.fly.dev ✅       Fly sailor-docs
A       pebble    106.15.4.31              ✅           Pebble brand front (ECS PM2 :3017); not Vercel
CNAME   carina    nebutra-carina.fly.dev   ✅           Carina product docs (Fly static); not Vercel
CNAME   open      cname.vercel-dns.com     ✅           Landing host alias — create with the Vercel domain
```

When cutting `app` / `auth` to Vercel: switch to `CNAME … cname.vercel-dns.com` (grey or orange per SSL plan) and remove the ECS A records.

## Auth multi-app model

| Role | Host | App |
|------|------|-----|
| Login center (session authority) | `auth.nebutra.com` | `apps/auth` + Better Auth |
| Product RP | `app.nebutra.com` | `apps/web` — redirects unauthenticated users to auth |
| OIDC issuer (permanent) | `sso.nebutra.com` | `apps/idp` — never path-prefix issuer |

Required env:

```
# auth-center + web (shared session)
BETTER_AUTH_URL=https://auth.nebutra.com
NEXT_PUBLIC_AUTH_URL=https://auth.nebutra.com
AUTH_COOKIE_DOMAIN=.nebutra.com
BETTER_AUTH_SECRET=<same secret on auth and web>
NEXT_PUBLIC_APP_URL=https://app.nebutra.com

# Enterprise SSO discovery (domain → IdP mapping; empty = disabled)
# See docs/ops/enterprise-sso.md and apps/web/.env.example
AUTH_SSO_DISCOVERY_PROVIDERS=""

# idp (sso.nebutra.com) — OIDC issuer permanent; cookie encryption keys required in prod
OIDC_ISSUER=https://sso.nebutra.com
OIDC_COOKIE_KEYS=""
```

Also document Feishu OAuth when China enterprise SSO is enabled: `FEISHU_APP_ID`,
`FEISHU_APP_SECRET`, `FEISHU_REDIRECT_URI` (see `docs/ops/enterprise-sso.md`).

Unauthenticated product routes: `auth.nebutra.com/sign-in?returnTo=https://app.nebutra.com/…`

## Vercel projects

| Project | Root | Domain(s) |
|---------|------|-----------|
| landing | `apps/landing` | `nebutra.com`, `www`, `open.nebutra.com` |
| docs | `apps/sailor-docs` | `docs.nebutra.com` |
| ~~nebutra-pebble~~ | `apps/pebble` | Superseded by ECS PM2 (kept only if Hobby quota is free for experiments) |
| nebutra-auth | `apps/auth` | `auth.nebutra.com` (ready; DNS may still be ECS) |
| nebutra-web | `apps/web` | `app.nebutra.com` (ready; DNS may still be ECS) |

## Origin TLS

Cloudflare Origin Certificate on ECS must include at least:

`*.nebutra.com`, `nebutra.com`, `app`, `auth`, `api`, `sso`, `docs`, `status`, `open`, `design`, `admin`, `www`

Path on VM: `/etc/ssl/nebutra/fullchain.pem` + `privkey.pem`.

## OAuth / IdP consoles

Prefer auth-center callbacks:

- Google: `https://auth.nebutra.com/api/auth/callback/google`
- GitHub: `https://auth.nebutra.com/api/auth/callback/github`

Do **not** keep product-app-only sign-in URLs as the only production login entry once the login center is live.
