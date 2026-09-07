# Nebutra-Owned SSO Runbook

`sso.nebutra.com` is Nebutra's own OIDC issuer for first-party and internal
relying parties. It is not a replacement for Clerk Enterprise SSO, Auth0, Ory,
or an OIDC certification program.

## Public Contract

- Issuer: `https://sso.nebutra.com`
- Discovery: `https://sso.nebutra.com/.well-known/openid-configuration`
- JWKS: `https://sso.nebutra.com/jwks`
- Authorization: `https://sso.nebutra.com/auth`
- Token: `https://sso.nebutra.com/token`
- UserInfo: `https://sso.nebutra.com/userinfo`
- Health: `https://sso.nebutra.com/health`
- Readiness: `https://sso.nebutra.com/ready`

The legacy `/api/oidc/*` mount remains available for old internal probes, but
new clients must use the standard root OIDC endpoints published by discovery.

## Required Runtime Environment

```env
NODE_ENV=production
PORT=3100
DATABASE_URL=postgresql://...
REDIS_URL=redis://...
OIDC_ISSUER=https://sso.nebutra.com
OIDC_COOKIE_KEYS=<base64-48+>,<rotated-base64-48+>
OIDC_ENABLE_CLIENT_CREDENTIALS=false
```

`OIDC_COOKIE_KEYS` must contain at least two high-entropy values. The first key
signs new cookies; the remaining keys verify rotated cookies. Rotate by
prepending the new value, keeping the previous value until old sessions expire.

`REDIS_URL` must be compatible with `ioredis`. Upstash REST environment values
are not interchangeable.

## Deployment Checklist

1. Point `sso.nebutra.com` DNS at the VM, container platform, or edge that
   terminates TLS for `apps/idp`.
2. Issue a certificate that includes `sso.nebutra.com`.
3. Configure `OIDC_ISSUER=https://sso.nebutra.com`.
4. Configure `OIDC_COOKIE_KEYS` with two or more production secrets.
5. Configure `DATABASE_URL` and `REDIS_URL`.
6. Deploy `apps/idp` and verify `/health` returns 200.
7. Verify `/ready` returns 200 after Postgres and Redis are reachable.
8. Verify discovery:

```bash
curl -fsS https://sso.nebutra.com/.well-known/openid-configuration
```

9. Confirm `issuer` is exactly `https://sso.nebutra.com`.
10. Confirm `grant_types_supported` does not include `client_credentials`
    unless an approved ADR enables machine-to-machine clients.

## Current Hold

The IdP can expose discovery, JWKS, health, and protocol endpoints, but the
first-party login and consent interaction UI is intentionally blocked in
production until it is wired to Nebutra's canonical user session. Do not onboard
new relying parties until the auth-code + PKCE flow is covered by smoke tests.

Minimum flow tests before opening production traffic:

- discovery and JWKS are stable across deploys
- authorization-code + PKCE reaches `/oauth/login`
- login resolves the real Nebutra user session
- consent reads `provider.interactionDetails`
- approve calls `provider.interactionFinished` with a Grant
- deny returns `access_denied`
- token exchange succeeds exactly once for an authorization code
- userinfo returns scoped Nebutra claims
