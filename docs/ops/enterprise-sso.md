# Enterprise SSO Runbook

This runbook governs Enterprise SSO discovery for `nebutra.com` and
`app.nebutra.com`.

It does not govern Nebutra acting as an OIDC issuer. The self-hosted issuer
served from `sso.nebutra.com` is documented separately in
[`docs/ops/nebutra/nebutra-owned-sso.md`](./nebutra/nebutra-owned-sso.md)
(source repo only — stripped from the Sailor template).

> **Clerk removed (ADR 2026-09-24 Sailor convergence).** Auth converged on
> Better Auth as the only production provider; Clerk, NextAuth, and the
> Supabase auth adapter were deleted. The Clerk Enterprise SSO handoff
> (`/sign-in/sso`, `clerk-enterprise-sso-handoff.tsx`) was deleted in the same
> change. `AUTH_PROVIDER` accepts only `better-auth` in production (`dev` for
> local fixtures). The discovery route's `SsoProvider` schema still accepts a
> `"clerk"` enum value for backward compatibility with old
> `AUTH_SSO_DISCOVERY_PROVIDERS` payloads, but it resolves to a dead handoff
> path — there is no `/sign-in/sso` page anymore. Do not configure new
> discovery entries with `"provider": "clerk"`.

## Current State

The web app supports Enterprise SSO discovery with one production path:

- Better Auth generic OAuth for non-Clerk providers, starting with Feishu/Lark.

The user types an email on `/sign-in`; `/api/auth/sso/discovery` checks only the
email domain against `AUTH_SSO_DISCOVERY_PROVIDERS`. Matching Feishu providers
handoff to `/api/auth/oauth/feishu`, which starts Better Auth's generic OAuth
flow. A `"generic"` provider entry hands off to an internal `loginUrl` you
supply — useful for a future external broker, but nothing in this repo wires
one today.

The route intentionally does not look up users. A non-matching or invalid email
gets the same `{ "provider": null }` response, preserving anti-enumeration
behavior.

## Provider Configuration

Use Feishu/Lark for China-market SSO via Better Auth's generic OAuth plugin, or
a `"generic"` entry with an explicit internal `loginUrl` for a broker you build
yourself. There is no first-class SAML broker in this repo since Clerk was
removed — a SAML IdP needs a `"generic"` entry pointing at a route you add.

```json
[
  {
    "domain": "example.cn",
    "id": "example-feishu",
    "name": "Example Feishu",
    "type": "oidc",
    "provider": "feishu"
  }
]
```

Fields:

| Field | Required | Notes |
| --- | --- | --- |
| `domain` | Yes | Lowercase email domain that owns the SSO connection. |
| `id` | Yes | Stable internal identifier for support and audit notes. |
| `name` | Yes | Human-readable provider name shown during handoff. |
| `type` | Yes | `saml` or `oidc`. |
| `provider` | No | `feishu` or `generic`; defaults to `generic` for legacy explicit `loginUrl` entries. `clerk` is still accepted by the schema but resolves to a deleted route — do not use it. |
| `loginUrl` | Generic only | Internal path for an external broker handoff. Absolute URLs are rejected. |
| `allowSubdomains` | No | Defaults to `false`. Set to `true` only when the IdP connection also allows subdomains. |

## Feishu/Lark Checklist

Use this path when the customer wants Feishu or Lark login.

1. Create or open the Feishu/Lark app in the developer console.
2. Add the login-center redirect URI:
   `https://auth.nebutra.com/api/auth/oauth2/callback/feishu`.
3. Grant the scopes needed to read a stable user id, name, avatar, and email.
   Recommended default: `contact:user.email contact:user.base:readonly`.
4. Set these runtime variables on auth-center and web (shared session secret):

```env
AUTH_PROVIDER=better-auth
NEXT_PUBLIC_AUTH_PROVIDER=better-auth
BETTER_AUTH_SECRET=...
BETTER_AUTH_URL=https://auth.nebutra.com
NEXT_PUBLIC_AUTH_URL=https://auth.nebutra.com
AUTH_COOKIE_DOMAIN=.nebutra.com
NEXT_PUBLIC_APP_URL=https://app.nebutra.com
FEISHU_APP_ID=cli_xxx
FEISHU_APP_SECRET=...
FEISHU_OAUTH_SCOPES="contact:user.email contact:user.base:readonly"
FEISHU_ALLOWED_TENANT_KEYS=
AUTH_SSO_DISCOVERY_PROVIDERS='[{"domain":"example.cn","id":"example-feishu","name":"Example Feishu","type":"oidc","provider":"feishu"}]'
```

`FEISHU_ALLOWED_TENANT_KEYS` is optional. Set it when one Feishu app is reused
across multiple tenants and the deployment must accept only specific tenant
keys.

## Deploy Targets

Set `AUTH_SSO_DISCOVERY_PROVIDERS` on every web runtime:

- ECS GitHub environment: `ecs-prod`
- Any future GCP/AWS/Fly runtime that serves `app.nebutra.com`

When any discovery provider uses `provider: "feishu"`, also set:

```env
FEISHU_APP_ID=cli_xxx
FEISHU_APP_SECRET=...
FEISHU_OAUTH_SCOPES="contact:user.email contact:user.base:readonly"
```

## Verification

Run the focused checks before enabling a production domain:

```bash
pnpm --filter @nebutra/web exec vitest run src/lib/auth/__tests__/oauth-providers.test.ts src/app/api/auth/sso/discovery/__tests__/route.test.ts
pnpm --filter @nebutra/auth test -- src/providers/better-auth.test.ts
pnpm --filter @nebutra/web exec tsc --noEmit --pretty false
pnpm test:arch -- tests/architecture/nebutra/sso-infrastructure.test.ts  # source repo only
```

Manual smoke:

1. Open `https://app.nebutra.com/sign-in`.
2. Type an email whose domain is configured for Feishu SSO.
3. Blur the email field.
4. Confirm the Feishu SSO button appears.
5. Click it and confirm the flow redirects to Feishu/Lark.

## Rollback

To disable discovery:

```env
AUTH_SSO_DISCOVERY_PROVIDERS=
```

Password, OAuth, magic link, and passkey sign-in remain available.
