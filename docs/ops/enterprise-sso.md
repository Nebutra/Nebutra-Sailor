# Enterprise SSO Runbook

This runbook governs Enterprise SSO for `nebutra.com` and
`app.nebutra.com`.

## Current State

The web app supports Enterprise SSO discovery and Clerk Enterprise SSO handoff.
The user types an email on `/sign-in`; `/api/auth/sso/discovery` checks only the
email domain against `AUTH_SSO_DISCOVERY_PROVIDERS`; matching Clerk providers
handoff to `/sign-in/sso`, which calls Clerk's `signIn.sso` flow with
`strategy: "enterprise_sso"`.

The route intentionally does not look up users. A non-matching or invalid email
gets the same `{ "provider": null }` response, preserving anti-enumeration
behavior.

## Provider Configuration

Use Clerk for first-party and customer-managed Enterprise SSO unless a customer
requires an external broker.

```json
[
  {
    "domain": "nebutra.com",
    "id": "nebutra-entra",
    "name": "Nebutra Entra ID",
    "type": "oidc",
    "provider": "clerk",
    "allowSubdomains": false
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
| `provider` | No | `clerk` or `generic`; defaults to `generic` for legacy explicit `loginUrl` entries. |
| `loginUrl` | Generic only | Internal path for an external broker handoff. Absolute URLs are rejected. |
| `allowSubdomains` | No | Defaults to `false`. Set to `true` only when the Clerk/IdP connection also allows subdomains. |

## Clerk Dashboard Checklist

1. Add production domains for `nebutra.com` and `app.nebutra.com`.
2. Set sign-in to `https://app.nebutra.com/sign-in`.
3. Set sign-up to `https://app.nebutra.com/sign-up`.
4. Set post-sign-in to `https://app.nebutra.com/dashboard`.
5. Create the SAML or OIDC Enterprise connection.
6. Ensure the connection domain matches the JSON `domain`.
7. Keep subdomain support disabled unless the customer explicitly needs it and
   the IdP supports the same policy.
8. Add `https://app.nebutra.com/sign-in` to Clerk redirect/continuation allowlists
   for custom Enterprise SSO flows.

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

## Verification

Run the focused checks before enabling a production domain:

```bash
pnpm --filter @nebutra/web exec vitest run src/app/api/auth/sso/discovery/__tests__/route.test.ts src/components/auth/__tests__/clerk-enterprise-sso-handoff.test.tsx
pnpm --filter @nebutra/web exec tsc --noEmit --pretty false
pnpm test:arch -- tests/architecture/sso-infrastructure.test.ts
```

Manual smoke:

1. Open `https://app.nebutra.com/sign-in`.
2. Type an email whose domain is configured for SSO.
3. Blur the email field.
4. Confirm the Enterprise SSO button appears.
5. Click it and confirm Clerk redirects to the configured IdP.

## Rollback

To disable discovery without changing Clerk:

```env
AUTH_SSO_DISCOVERY_PROVIDERS=
```

Password, OAuth, magic link, and passkey sign-in remain available. Existing
Clerk sessions are not revoked by removing the discovery mapping.
