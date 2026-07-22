# web / auth → Vercel cutover checklist

**Status:** **production is fine on ECS** — not blocked by Vercel billing.
`app.nebutra.com` / `auth.nebutra.com` still terminate on ECS (PM2).
Vercel projects `nebutra-web` / `nebutra-auth` are an *optional* edge
hosting target. Domains are **verified** on those projects; DNS A records
still point at ECS on purpose.

**You are not stuck because you are “poor”.** Hobby free tier only limits
*how often you can create Vercel deployments*, not whether users can use
the product. Product path = ECS + Cloudflare DNS/CDN (already free).

**Live check (2026-07-22):** `https://app.nebutra.com/` returns
`x-powered-by: Next.js` and Next RSC/`_next/static` headers — production
web origin is **Next (ECS standalone path)**, not a Vite SPA.

**Do not change DNS until every box below is green** (and only if you
still want the optional cutover).

Automated preflight (no DNS mutation):

```bash
node scripts/preflight-web-auth-vercel.mjs
```

## Build note (`@nebutra/web`)

`pnpm build` / turbo `build` for web runs **Vite** (`dist/`). Vercel is
Next.js and must use turbo `build:next` so `.next` is produced:

```bash
cd ../.. && pnpm turbo run build:next --filter=@nebutra/web
```

(Project dashboard build command must match `apps/web/vercel.json`.)

Local proof (2026-07-22): `pnpm --filter @nebutra/web run build:next` emits
`apps/web/.next` + `standalone` successfully.

## Hobby plan constraints (team `nebutra`)

- Plan: **Hobby** — `api-deployments-free-per-day` **100**,
  `concurrentBuilds: 1`.
- On 2026-07-22 the daily quota was exhausted mainly by
  `nebutra-sailor-landing-page` + `tsekaluk-dev` auto-deploys on every main
  push (ignore step still creates a deployment slot).
- Mitigations applied: dashboard buildCommand → `build:next`; deploy hooks
  `manual-main` on web/auth; **auto-deploy disabled** on non-cutover
  projects (landing, tsekaluk-dev, studio, persona-blindbox) so web/auth
  can use the next day's quota.
- Re-enable auto-deploy on marketing apps after cutover, or upgrade the
  team off Hobby if monorepo velocity needs more than ~100 deploys/day.

## Free unblocking playbook (recommended order)

1. **Ship product on ECS** — always works; no Vercel quota involved.
   ```bash
   # already production today
   node scripts/preflight-web-auth-vercel.mjs   # ECS health + topology
   ```
2. **After Hobby quota resets (~24h)** — one green web deploy (code already fixed):
   ```bash
   node scripts/redeploy-web-auth-vercel.mjs
   ```
3. **Only then** consider DNS flip (still optional). Rollback = point A
   records back at ECS `106.15.4.31`.
4. **Do not** start a Cloudflare Pages Next rewrite just to avoid Hobby
   limits — CF already fronts DNS/CDN for free; origin stays ECS.
5. **If you later want unlimited Vercel deploys** — Pro is convenience,
   not a production requirement.

## Preconditions

- [ ] Vercel project `nebutra-web` builds `apps/web` via `build:next` and
      deploys successfully on `main`.
- [ ] Vercel project `nebutra-auth` builds `apps/auth` successfully on `main`.
- [ ] Production env on both projects matches ECS (see matrix below).
- [ ] `BETTER_AUTH_SECRET` **identical** on auth + web (+ any other RPs).
- [ ] `BETTER_AUTH_URL` / `NEXT_PUBLIC_AUTH_URL` = `https://auth.nebutra.com`.
- [ ] `AUTH_COOKIE_DOMAIN` = `.nebutra.com`.
- [ ] Google / GitHub OAuth redirect URIs include auth-center callbacks.
- [ ] Cloudflare: prepare CNAME (or ANAME) to Vercel; plan SSL mode
      (prefer grey-cloud or Full strict with valid certs — avoid 525).

## Env matrix (minimum)

| Variable | auth | web |
|----------|------|-----|
| `DATABASE_URL` | ✓ | ✓ |
| `BETTER_AUTH_SECRET` | ✓ same | ✓ same |
| `BETTER_AUTH_URL` | `https://auth.nebutra.com` | same |
| `NEXT_PUBLIC_AUTH_URL` | `https://auth.nebutra.com` | same |
| `AUTH_COOKIE_DOMAIN` | `.nebutra.com` | same |
| `NEXT_PUBLIC_APP_URL` | `https://app.nebutra.com` | same |
| `GOOGLE_CLIENT_ID` / `SECRET` | ✓ | as needed |
| `GITHUB_CLIENT_ID` / `SECRET` | if enabled | as needed |

## Smoke after DNS flip (same window)

1. `https://auth.nebutra.com/health` → 200  
2. `https://app.nebutra.com/sign-in` → 307 → auth with correct `returnTo`  
3. Email + Google One Tap login → session cookie on `.nebutra.com`  
4. App dashboard authenticated request → API still healthy  
5. Logout clears session across app + auth  

## Rollback

1. Revert CF DNS `app` / `auth` A records to ECS `106.15.4.31` (proxied as today).  
2. Confirm PM2 `web` / `auth-center` still online on ECS.  
3. Re-run smoke steps against ECS origin.

## Out of scope for this cutover

- `api.nebutra.com` / `sso.nebutra.com` stay on ECS.  
- Marketing + docs stay on Vercel (already).  
- Full web Vite-only migration (separate track).
