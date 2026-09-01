# @nebutra/auth-center

Login center for all first-party Nebutra apps (`auth.nebutra.com`).

Product apps (e.g. `app.nebutra.com`) are **RPs**: they soft-redirect unauthenticated
users here with a safe `returnTo`, then receive the session cookie after login.

## Single entry

| Surface | Behavior |
|---------|----------|
| `app.nebutra.com/sign-in` | 307 → `auth.nebutra.com/sign-in?returnTo=…` |
| `app.nebutra.com/sign-up` | 307 → `auth.nebutra.com/sign-up?returnTo=…` |
| `auth.nebutra.com/*` | Canonical Agent OS login UI |

Production keeps `auth.nebutra.com` on the thin Cloudflare auth Worker. The
Worker serves `/api/auth/*` at the edge and proxies UI routes to the dedicated
`nebutra-auth` Fly Machine. The UI origin must not share the gateway's
`origin.nebutra.com` hostname.

Clerk is the only exception: when `NEXT_PUBLIC_AUTH_PROVIDER=clerk`, web keeps a local UI.

## OAuth redirect URIs (operator)

Better Auth callback base is the **auth-center** origin. Register in each IdP:

```
https://auth.nebutra.com/api/auth/callback/google
https://auth.nebutra.com/api/auth/callback/github
https://auth.nebutra.com/api/auth/callback/apple
https://auth.nebutra.com/api/auth/callback/microsoft
```

Feishu uses `FEISHU_REDIRECT_URI` when set; otherwise the same Better Auth callback pattern.

`GET /health` returns `oauth.callbackUrls` for the currently enabled providers.

## Feature flags (env)

| Flag | Effect |
|------|--------|
| `NEXT_PUBLIC_AUTH_MAGIC_LINK=1` | Show “magic link” alternate on sign-in |
| `NEXT_PUBLIC_AUTH_PASSKEYS=1` | Show passkey button + conditional UI |
| `TURNSTILE_SECRET_KEY` + `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | Cloudflare Turnstile (`x-captcha-response`) |
| `PASSKEY_RP_ID` / `PASSKEY_ORIGIN` | Override WebAuthn RP (default: auth host) |
| `BETTER_AUTH_URL` | Must be `https://auth.nebutra.com` in production |
| `AUTH_ENABLED_OAUTH_PROVIDERS` | Non-secret provider list for a UI-only origin, e.g. `google,github` |

## Local

```bash
pnpm --filter @nebutra/auth-center dev   # :3101
```
