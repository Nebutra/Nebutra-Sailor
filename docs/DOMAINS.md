# Domain Configuration

## Domain Structure

| Subdomain | App | Purpose |
|-----------|-----|---------|
| `nebutra.com` | landing | Marketing site |
| `www.nebutra.com` | landing | Redirect to apex |
| `auth.nebutra.com` | auth-center | **Login center** (Better Auth UX + session authority for multi-app RPs) |
| `nebutra.com/docs` (path, not a host) | sailor-docs (Fly Next Machine) | Sailor product docs as a **Next.js zone**: the bundle sets `basePath: "/docs"` and landing forwards `/docs/*` to it unchanged, so the bundle's own asset, link and sitemap URLs are already in this path space. Default locale hidden (`/docs/<slug>`, `/docs/zh/<slug>`). Each product app serves its own `/docs` on its own host |
| `app.nebutra.com` | web | Main SaaS dashboard (RP — redirects unauthenticated users to auth) |
| `api.nebutra.com` | api-gateway | BFF API endpoints |
| `sso.nebutra.com` | idp | **OIDC IdP** — issuer URL permanent; used for SSO / internal tools |
| `design.nebutra.com` | design-docs | Design system docs (ECS PM2 :3004) |
| `status.nebutra.com` | landing (host alias) | Public status page — Fly `nebutra-landing`, rewrite `/` → `/status` |
| `open.nebutra.com` | landing (host alias) | **云毓开放平台** — public catalog; `/` rewrites to `/open`. Console is `app` `/settings/developers` |
| `nebutra.sanity.studio` | studio | Canonical Sanity-hosted Studio |
| `studio.nebutra.com` | studio | Optional branded Studio alias — **not provisioned** (no DNS record as of 2026-09-02); canonical host is `nebutra.sanity.studio`. Not in the public URL sweep until it exists |
| `router.nebutra.com` | router | **Nebutra Router** — model fabric / OpenAI-compatible product edge (ECS PM2) |
| `forge.nebutra.com` | forge | **Nebutra Forge** — tool station + Agent tool API (Fly `nebutra-forge`; ECS PM2 fallback :3105) |
| `leak.nebutra.com` | forge-dns-leak | **DNS leak authority zone** — NS → `ns1.leak.nebutra.com` (UDP/TCP 53 on Fly dedicated IPv4; DNS-only glue) |
| `admin.nebutra.com` | admin | **Ecosystem control plane** — staff-only (Cloudflare Access + `sso` OIDC + platform-staff role). Never tenant-visible. See [PRD](./plans/2026-07-28-nebutra-admin-control-plane-design.md) |
| `pebble.nebutra.com` | `apps/pebble` + external repo `Nebutra/pebble` | **Pebble brand front** — landing / download / feeds on the Fly Machine `nebutra-pebble`; product API on shared gateway |
| `carina.nebutra.com` | (external repo `Nebutra/carina` → `apps/docs`) | **Carina product docs** — Astro + Starlight static site. No backend of its own. |

> Router/Forge: product hosts; supply engines (New-API, CLIProxyAPI, Sub2API) stay **internal** — see `infra/nebutra-router/`.

### Open Platform — catalog on landing, console on app

`open.nebutra.com` is a **host alias**, not a new app. Same pattern as `status.nebutra.com`.

| Capability | Host + path |
|---|---|
| Public catalog | `open.nebutra.com` → landing `/open` |
| Developer console | `app.nebutra.com/settings/developers` |
| API keys / webhooks / provider keys | `app.nebutra.com/settings/{api-keys,webhooks,provider-keys}` |
| Docs / API / SSO | `docs` / `api` / `sso` — existing hosts |

Do not add `apps/open`, `api.open.*`, or a second landing origin. Bring-up: land `/open` on landing, then run **Point DNS** (`point-dns.yml`, host=`open`, target=`fly`) — it upserts the proxied CNAME `open.nebutra.com → nebutra-landing.fly.dev` (issue the Fly cert first). Smoke `/` on the alias (must rewrite, must not 301 to apex).

Sign-in-with-Nebutra client registration is **not** self-serve yet. The catalog links the existing OIDC issuer and docs.

### Pebble — brand front, platform backend

Pebble is a separate repo but is **not** allowed a parallel origin stack. Only the
brand front gets a host; everything transactional runs on the shared platform hosts.

| Capability | Host + path |
|---|---|
| Landing / download | `pebble.nebutra.com` (CF CNAME → Fly `nebutra-pebble`) |
| Docs | `pebble.nebutra.com/docs/*` — served by the pebble app itself; no docs subdomain exists |
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

Legacy Vercel experiment (`deploy-vercel.yml` `app=carina`, dispatch only)
and ECS rsync (`deploy-carina-ecs.yml`) are superseded.

**Bring-up order:** (1) Fly Machine healthy on `nebutra-carina.fly.dev`
(2) `fly certs add carina.nebutra.com` + ACME CNAME (3) grey CNAME then
orange-cloud (4) smoke `/` + `/llms.txt` (must not 301 to apex).

## Production truth (as of 2026-07-22)

Single source of truth for *where traffic lands today*. Do not invent a second story in other docs without updating this table.

| Host | DNS (Cloudflare) | Runtime | Notes |
|------|------------------|---------|-------|
| `nebutra.com` / `www` | CNAME `nebutra-landing.fly.dev` **proxied** (apex uses CNAME flattening) | **Fly** `nebutra-landing` | Marketing. Deploy: `deploy-fly.yml` app=`landing`; cutover: `point-landing-dns-fly.sh`. `www` 308s to the apex in `next.config.ts` |
| `nebutra.com/docs` | **no record** — a path, rewritten by the landing proxy | **Fly** `nebutra-docs` (origin only, no custom domain) | `deploy-fly.yml` app=`sailor-docs`. The landing app needs `DOCS_UPSTREAM_ORIGIN` = the Fly app's `.fly.dev` origin, set as a **Fly secret / GitHub repo var** — deliberately not committed, since a Fly app name is instance infrastructure, not brand identity. Unset ⇒ `/docs` 404s |
| `app.nebutra.com` | A `106.15.4.31` proxied | **ECS PM2** `web` | Target: Vercel (`nebutra-web`) when builds are green |
| `auth.nebutra.com` | Worker **custom domain** only (`workers_dev: false`) | **Auth edge**: `/api/auth/*` + Hyperdrive; UI → ECS. No `*.workers.dev` test URL. | Rollback: `point-dns.yml` host=`auth` target=`ecs`; emergency Vercel only |
| `api.nebutra.com` | A `106.15.4.31` proxied | **ECS PM2** `api-gateway` | Stay on ECS origin |
| `sso.nebutra.com` | CNAME → Fly unique host **proxied** | **Fly** `nebutra-idp` | **Permanent OIDC issuer** `https://sso.nebutra.com` |
| `router.nebutra.com` | CNAME → Fly unique host **proxied** | **Fly** `nebutra-router` | Product edge. Deploy: `deploy-fly.yml` app=`router` |
| `forge.nebutra.com` | CNAME → Fly unique host **proxied** | **Fly** `nebutra-forge` | Product edge. Deploy: `deploy-fly.yml` app=`forge` |
| `ns1.leak.nebutra.com` | A Fly dedicated IPv4 **DNS only** | **Fly** `nebutra-dns-leak` | Glue for leak zone — never orange-cloud |
| `leak.nebutra.com` | NS → `ns1.leak.nebutra.com` | **Fly** authoritative | Session probes `{n}.{sid}.s.leak.nebutra.com`; see `packages/ai/forge-dns-leak/README.md` |
| `admin.nebutra.com` | CNAME → Fly unique host **proxied** | **Fly** `nebutra-admin` | Staff-only: Cloudflare Access in front of the Machine |
| `pebble.nebutra.com` | CNAME → Fly unique host **proxied** | **Fly** `nebutra-pebble` | Brand front. Deploy: `deploy-fly.yml` app=`pebble`. Legacy `POST /v1/feedback` + `/diagnostics/*` reverse-proxy to api-gateway `/pebble/*`. |
| `carina.nebutra.com` | CNAME → Fly unique host **proxied** | **Fly** `nebutra-carina` nginx static | Product docs (Astro) from `Nebutra/carina` `apps/docs`. Deploy: `deploy-carina-fly.yml`. ECS rsync is `rollback-carina-ecs` only. |
| `status.nebutra.com` | CNAME `nebutra-landing.fly.dev` **proxied** | **Fly landing** host alias | `point-dns.yml` host=`status` target=`fly`. Rewrite `/` → `/status` (no 301 to apex). |
| `open.nebutra.com` | CNAME `nebutra-landing.fly.dev` **proxied** | **Fly landing** host alias | `point-dns.yml` host=`open` target=`fly`. Rewrite `/` → `/open`. Console: `https://app.nebutra.com/settings/developers`. Do not add `apps/open` or `api.open.*`. |
| `design.nebutra.com` | A `106.15.4.31` proxied | **ECS PM2** `design-docs` :3004 | nginx `conf.d/design.nebutra.com.conf`. Deploy: `deploy-ecs.yml` apps=`design-docs`. Without PM2 → CF 502; without vhost → 301 apex. DNS: `point-design-dns-ecs.sh`. |

### Topology layers

| Layer | Role | Apps |
|-------|------|------|
| **Cloudflare** | DNS, CDN, WAF, edge Workers | All public hostnames; gateway Workers for edge API |
| **Fly (sin)** | Product edges as Machines | landing, web, auth (private origin), router, forge, pebble, kuanlan, admin, sso, docs, para, carina |
| **ECS (slim)** | Origin processes | web*, auth*, api, sso/idp |

The Vercel deploy surface was retired on 2026-09-22; every product edge ships through [deploy-fly.yml](../../.github/workflows/deploy-fly.yml). See [fly-origin.md](./ops/nebutra/fly-origin.md) for the Machine map and secrets, and [fly-global-china-ecs-origin.md](./architecture/2026-08-31-fly-global-china-ecs-origin.md) for what stays on ECS.

### Repo variables (no drift)

| Variable | Production value | Meaning |
|----------|------------------|---------|
| `HA_TOPOLOGY` | `cf-edge + fly-machines(landing,product-edges) + ecs-origin(issuer,leak,rollback)` | Describe *actual* routing |
| `DEPLOY_TARGET_LANDING` | `fly` | Primary deploy path (`deploy-fly.yml` app=`landing`) |
| `DEPLOY_TARGET_SAILOR_DOCS` | `fly` (production) / `cloudflare-workers` (alternate) | Production is the Fly Machine (`deploy-fly.yml` app=`sailor-docs`). Set `cloudflare-workers` to also push-deploy `deploy-sailor-docs.yml` (needs **Workers Scripts Edit**). Token ops: [ops/cloudflare-ci-token.md](./ops/cloudflare-ci-token.md) |
| `DEPLOY_TARGET_WEB` | `fly` | Production is the Fly Machine `nebutra-web` |
| `DEPLOY_TARGET_AUTH` | `cloudflare-workers` | Thin auth-edge Worker (`wrangler.edge.jsonc`); UI origin is the Fly Machine `nebutra-auth` |
| `DEPLOY_TARGET_ADMIN` | `standalone` | Control plane — Fly Machine behind Cloudflare Access; never a second public origin |
| `DEPLOY_TARGET_GATEWAY` | `cloudflare-workers` | Edge API |
| `NEXT_PUBLIC_AUTH_URL` | `https://auth.nebutra.com` | Login center origin |
| `ECS_HOST` | `106.15.4.31` | Cloud VM origin |

`deploy-ecs.yml` remains the **manual fallback** for ECS apps (`web` `auth` `api` `idp`, and optionally `landing` / `sailor-docs` / `design-docs`). The docs bundle runs on **Fly** (`nebutra-docs`) as an origin only; `nebutra.com/docs` reaches it through the landing proxy's rewrite, so there is no docs DNS record to point anywhere. Marketing (`nebutra.com`) is the **Fly** Machine `nebutra-landing`.

PM2 release / preflight gotchas (sibling wipe, webpack `build:vm`, explicit `apps=`): [ops/ecs-pm2-release-lessons.md](./ops/nebutra/ecs-pm2-release-lessons.md).

## DNS records (reference)

Hostnames dogfood `brand.domains` (`pnpm brand:apply`). Zone files: `pnpm dns:render` → `infra/ops/dns/`. See [brand-hardcode-governance.md](./design-system/brand-hardcode-governance.md).


```
Type    Name      Value                    Proxy        Notes
----    ----      -----                    -----        -----
CNAME   @         nebutra-landing.fly.dev  ✅           Fly landing (apex CNAME flattening)
CNAME   www       nebutra-landing.fly.dev  ✅           308 → apex in next.config.ts
A       app       106.15.4.31              ✅           ECS (interim)
A       auth      106.15.4.31              ✅           ECS (interim)
A       api       106.15.4.31              ✅           ECS
CNAME   sso       d66pwdj.nebutra-idp.fly.dev ✅        Fly OIDC issuer
A       router    106.15.4.31              ✅           ECS PM2 @nebutra/router
A       forge     106.15.4.31              ✅           ECS PM2 @nebutra/forge
CNAME   admin     w00nrye.nebutra-admin.fly.dev ✅      Fly staff control plane (Access)
CNAME   docs      999625y.nebutra-docs.fly.dev ✅       Fly sailor-docs
CNAME   pebble    nebutra-pebble.fly.dev  ✅           Pebble brand front (Fly Machine)
CNAME   carina    nebutra-carina.fly.dev   ✅           Carina product docs (Fly static)
CNAME   open      nebutra-landing.fly.dev  ✅           Landing host alias (fly cert add open.nebutra.com)
```

Every product edge above is a proxied CNAME onto its Fly Machine's unique `.fly.dev` host, or an A record to the ECS origin where the row says so. The Vercel surface was retired on 2026-09-22.

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

## Fly Machines

The Vercel projects were retired on 2026-09-22. Product edges are Fly Machines in `sin`,
declared in `infra/fly/*.toml` and shipped by `.github/workflows/deploy-fly.yml`:

| Machine | App | Host |
|---------|-----|------|
| `nebutra-landing` | `apps/landing` | `nebutra.com`, `www`, `status.nebutra.com`, `open.nebutra.com` |
| `nebutra-docs` | `apps/sailor-docs` | origin only — `nebutra.com/docs` (rewritten) |
| `nebutra-web` | `apps/web` | `app.nebutra.com` |
| `nebutra-auth` | `apps/auth` | private origin behind the auth Worker |

Runbook and secret import: [fly-origin.md](./ops/nebutra/fly-origin.md).

## Origin TLS

Cloudflare Origin Certificate on ECS must include at least:

`*.nebutra.com`, `nebutra.com`, `app`, `auth`, `api`, `sso`, `docs`, `status`, `open`, `design`, `admin`, `www`

Path on VM: `/etc/ssl/nebutra/fullchain.pem` + `privkey.pem`.

## OAuth / IdP consoles

Prefer auth-center callbacks:

- Google: `https://auth.nebutra.com/api/auth/callback/google`
- GitHub: `https://auth.nebutra.com/api/auth/callback/github`

Do **not** keep product-app-only sign-in URLs as the only production login entry once the login center is live.
