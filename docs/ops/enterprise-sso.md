# Enterprise SSO Runbook

This runbook governs Enterprise SSO for `nebutra.com` and
`app.nebutra.com`.

It does not govern Nebutra acting as an OIDC issuer. The self-hosted issuer
served from `sso.nebutra.com` is documented separately in
[`docs/ops/nebutra/nebutra-owned-sso.md`](./nebutra/nebutra-owned-sso.md).

## Current State

The web app supports Enterprise SSO discovery with two production paths:

- Clerk Enterprise SSO for managed SAML/OIDC connections.
- Better Auth generic OAuth for non-Clerk providers, starting with Feishu/Lark.

The user types an email on `/sign-in`; `/api/auth/sso/discovery` checks only the
email domain against `AUTH_SSO_DISCOVERY_PROVIDERS`. Matching Clerk providers
handoff to `/sign-in/sso`, which calls Clerk's `signIn.sso` flow with
`strategy: "enterprise_sso"`. Matching Feishu providers handoff to
`/api/auth/oauth/feishu`, which starts Better Auth's generic OAuth flow.

The route intentionally does not look up users. A non-matching or invalid email
gets the same `{ "provider": null }` response, preserving anti-enumeration
behavior.

## Provider Configuration

Use Clerk for first-party and customer-managed Enterprise SSO unless a customer
requires an external broker or a China collaboration suite such as Feishu/Lark.

```json
[
  {
    "domain": "nebutra.com",
    "id": "nebutra-entra",
    "name": "Nebutra Entra ID",
    "type": "oidc",
    "provider": "clerk",
    "allowSubdomains": false
  },
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
| `provider` | No | `clerk`, `feishu`, or `generic`; defaults to `generic` for legacy explicit `loginUrl` entries. |
| `loginUrl` | Generic only | Internal path for an external broker handoff. Absolute URLs are rejected. |
| `allowSubdomains` | No | Defaults to `false`. Set to `true` only when the Clerk/IdP connection also allows subdomains. |

## Clerk Dashboard Checklist

1. Add production domains for `nebutra.com`, `app.nebutra.com`, and
   `auth.nebutra.com` (login center).
2. Set sign-in to `https://auth.nebutra.com/sign-in` (login center).
3. Set sign-up to `https://auth.nebutra.com/sign-up`.
4. Set post-sign-in to `https://app.nebutra.com/dashboard` (product RP).
5. Create the SAML or OIDC Enterprise connection.
6. Ensure the connection domain matches the JSON `domain`.
7. Keep subdomain support disabled unless the customer explicitly needs it and
   the IdP supports the same policy.
8. Add `https://auth.nebutra.com/sign-in` to Clerk redirect/continuation allowlists
   for custom Enterprise SSO flows.

## Feishu/Lark Checklist

Use this path when `AUTH_PROVIDER=better-auth` and the customer wants Feishu or
Lark login without Clerk.

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

- Vercel project: `@nebutra/web`
- ECS GitHub environment: `ecs-prod`
- Any future GCP/AWS runtime that serves `app.nebutra.com`

When `AUTH_PROVIDER=clerk`, also set:

```env
NEXT_PUBLIC_AUTH_PROVIDER=clerk
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_xxx
CLERK_SECRET_KEY=sk_live_xxx
CLERK_WEBHOOK_SECRET=whsec_xxx
```

When `AUTH_PROVIDER=better-auth` and any discovery provider uses
`provider: "feishu"`, also set:

```env
FEISHU_APP_ID=cli_xxx
FEISHU_APP_SECRET=...
FEISHU_OAUTH_SCOPES="contact:user.email contact:user.base:readonly"
```

## Verification

Run the focused checks before enabling a production domain:

```bash
pnpm --filter @nebutra/web exec vitest run src/lib/auth/__tests__/oauth-providers.test.ts src/app/api/auth/sso/discovery/__tests__/route.test.ts src/components/auth/__tests__/clerk-enterprise-sso-handoff.test.tsx
pnpm --filter @nebutra/auth test -- src/providers/better-auth.test.ts
pnpm --filter @nebutra/web exec tsc --noEmit --pretty false
pnpm test:arch -- tests/architecture/nebutra/sso-infrastructure.test.ts
```

Manual smoke:

1. Open `https://app.nebutra.com/sign-in`.
2. Type an email whose domain is configured for SSO.
3. Blur the email field.
4. Confirm the Enterprise SSO button appears.
5. Click it and confirm Clerk or Feishu redirects to the configured IdP.

## Rollback

To disable discovery without changing Clerk:

```env
AUTH_SSO_DISCOVERY_PROVIDERS=
```

Password, OAuth, magic link, and passkey sign-in remain available. Existing
Clerk sessions are not revoked by removing the discovery mapping.
