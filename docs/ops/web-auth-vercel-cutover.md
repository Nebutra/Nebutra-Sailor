# web / auth → Vercel cutover checklist

**Status:** not cut over. Production traffic for `app.nebutra.com` and
`auth.nebutra.com` still terminates on ECS (PM2). Vercel projects
`nebutra-web` / `nebutra-auth` are reserved for this cutover.

**Do not change DNS until every box below is green.**

## Preconditions

- [ ] Vercel project `nebutra-web` builds `apps/web` from monorepo root (or
      documented root directory) and deploys successfully on `main`.
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
