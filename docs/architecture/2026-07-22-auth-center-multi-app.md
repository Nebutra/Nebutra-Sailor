# Auth Center + Multi-App RP Model

**Status:** Accepted  
**Date:** 2026-07-22

## Decision

Nebutra separates:

| Layer | Host | Role |
|-------|------|------|
| Login center (Auth UX + session authority) | `auth.nebutra.com` | `apps/auth` + Better Auth |
| OIDC IdP (issuer permanent) | `sso.nebutra.com` | `apps/idp` |
| Product apps (RPs) | `app.nebutra.com`, future apps | Redirect unauthenticated users to auth |

SSO is the **pattern** of multiple RPs trusting the auth center session and/or the sso issuer — not a third product domain.

## Rules

1. **Do not** rename or move `OIDC_ISSUER` off `https://sso.nebutra.com`.
2. **Do not** implement full login UI inside product apps; redirect to auth.
3. Cross-subdomain session cookies use `AUTH_COOKIE_DOMAIN=.nebutra.com` in production.
4. `returnTo` / `returnUrl` must pass `sanitizeReturnUrl` with `getAuthReturnAllowedHosts()`.
5. Future apps only add allowlisted hosts + client config — no forked login stacks.

## Env (production)

```bash
NEXT_PUBLIC_AUTH_URL=https://auth.nebutra.com
BETTER_AUTH_URL=https://auth.nebutra.com
AUTH_COOKIE_DOMAIN=.nebutra.com
OIDC_ISSUER=https://sso.nebutra.com
```
