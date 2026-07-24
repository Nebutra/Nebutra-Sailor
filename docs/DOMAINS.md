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
| `design.nebutra.com` | design-docs | Design system docs (optional) |
| `docs.nebutra.com` | sailor-docs (Vercel project `docs`) | Product/docs site |
| `nebutra.sanity.studio` | studio | Canonical Sanity-hosted Studio |
| `studio.nebutra.com` | studio | Optional branded Studio alias |
| `router.nebutra.com` | router | **Nebutra Router** — model fabric / OpenAI-compatible product edge (ECS PM2) |
| `forge.nebutra.com` | forge | **Nebutra Forge** — tool station + Agent tool API (Vercel; ECS PM2 fallback :3105) |

> Router/Forge: product hosts; supply engines (New-API, Sub2API) stay **internal** — see `infra/nebutra-router/`.

## Production truth (as of 2026-07-22)

Single source of truth for *where traffic lands today*. Do not invent a second story in other docs without updating this table.

| Host | DNS (Cloudflare) | Runtime | Notes |
|------|------------------|---------|-------|
| `nebutra.com` / `www` | Vercel anycast / CNAME | **Vercel** landing | Marketing |
| `docs.nebutra.com` | CNAME `331816c5997d8344.vercel-dns-017.com` **DNS only** | **Vercel** `docs` | Project-specific target; grey-cloud (not orange) |
| `app.nebutra.com` | A `106.15.4.31` proxied | **ECS PM2** `web` | Target: Vercel (`nebutra-web`) when builds are green |
| `auth.nebutra.com` | A `106.15.4.31` proxied | **ECS PM2** `auth-center` | Target: Vercel (`nebutra-auth`) |
| `api.nebutra.com` | A `106.15.4.31` proxied | **ECS PM2** `api-gateway` | Stay on ECS origin |
| `sso.nebutra.com` | A `106.15.4.31` proxied | **ECS PM2** `idp` | **Permanent OIDC issuer** — do not move lightly |
| `router.nebutra.com` | A `106.15.4.31` proxied | **ECS PM2** `router` | Product edge :3106; Vercel project `nebutra-router` exists for future cutover |
| `forge.nebutra.com` | A `106.15.4.31` proxied | **ECS PM2** `forge` | Product edge :3105; Vercel project `nebutra-forge` exists (Hobby deploy cap) |

### Topology layers

| Layer | Role | Apps |
|-------|------|------|
| **Cloudflare** | DNS, CDN, WAF, edge Workers | All public hostnames; gateway Workers for edge API |
| **Vercel** | Git-native frontends | landing, docs (+ web/auth when cut over) |
| **ECS (slim)** | Origin processes | web*, auth*, api, sso/idp |

\* web/auth currently origin on ECS while Vercel projects exist for future cutover.

### Repo variables (no drift)

| Variable | Production value | Meaning |
|----------|------------------|---------|
| `HA_TOPOLOGY` | `cf-edge + vercel-marketing/docs + ecs-origin(app,auth,api,sso)` | Describe *actual* routing |
| `DEPLOY_TARGET_LANDING` | `vercel` | Primary deploy path |
| `DEPLOY_TARGET_SAILOR_DOCS` | `vercel` | Primary deploy path |
| `DEPLOY_TARGET_WEB` | `vercel` | *Target* platform; production traffic still ECS until DNS cutover |
| `DEPLOY_TARGET_AUTH` | `vercel` | *Target* platform; production traffic still ECS until DNS cutover |
| `DEPLOY_TARGET_GATEWAY` | `cloudflare-workers` | Edge API |
| `NEXT_PUBLIC_AUTH_URL` | `https://auth.nebutra.com` | Login center origin |
| `ECS_HOST` | `106.15.4.31` | Cloud VM origin |

`deploy-ecs.yml` remains the **manual fallback** for ECS apps (`web` `auth` `api` `idp`, and optionally `landing` / `sailor-docs` / `design-docs`). Prefer **Vercel Git deploys** for marketing (`nebutra.com`) and docs (`docs.nebutra.com`). Do **not** point `docs.nebutra.com` DNS at ECS in steady state — ECS sailor-docs is emergency-only.

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
A       sso       106.15.4.31              ✅           ECS permanent issuer
A       router    106.15.4.31              ✅           ECS PM2 @nebutra/router
A       forge     106.15.4.31              ✅           ECS PM2 @nebutra/forge
CNAME   docs      331816c5997d8344.vercel-dns-017.com  DNS only  # project-specific     Vercel (grey cloud)
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
| landing | `apps/landing` | `nebutra.com`, `www` |
| docs | `apps/sailor-docs` | `docs.nebutra.com` |
| nebutra-auth | `apps/auth` | `auth.nebutra.com` (ready; DNS may still be ECS) |
| nebutra-web | `apps/web` | `app.nebutra.com` (ready; DNS may still be ECS) |

## Origin TLS

Cloudflare Origin Certificate on ECS must include at least:

`*.nebutra.com`, `nebutra.com`, `app`, `auth`, `api`, `sso`, `docs`, `status`, `design`, `www`

Path on VM: `/etc/ssl/nebutra/fullchain.pem` + `privkey.pem`.

## OAuth / IdP consoles

Prefer auth-center callbacks:

- Google: `https://auth.nebutra.com/api/auth/callback/google`
- GitHub: `https://auth.nebutra.com/api/auth/callback/github`

Do **not** keep product-app-only sign-in URLs as the only production login entry once the login center is live.
