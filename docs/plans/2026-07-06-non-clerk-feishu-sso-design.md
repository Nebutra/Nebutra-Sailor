# Non-Clerk Feishu/Lark SSO Infrastructure Design

## Goal

Add a non-Clerk Enterprise SSO path for Nebutra Sailor, with Feishu/Lark as the
first production provider. Keep Clerk Enterprise SSO intact, but make
self-hosted Better Auth capable of serving enterprise OAuth customers without a
managed auth broker.

## Decision

Use Better Auth's generic OAuth plugin inside `@nebutra/auth`. Do not add
`feishu` as a new `AuthProviderId`; Feishu is an OAuth provider under the
existing `better-auth` runtime. The app continues to start OAuth through
`/api/auth/oauth/:provider`, and Better Auth owns the callback at
`/api/auth/oauth2/callback/feishu`.

## Architecture

- `@nebutra/auth` owns provider-specific protocol work:
  - normalize Feishu `code/msg/data` token responses into Better Auth
    `OAuth2Tokens`;
  - normalize Feishu user info into stable `id`, `name`, `email`, `image`, and
    optional tenant metadata;
  - enforce optional `FEISHU_ALLOWED_TENANT_KEYS`;
  - mount Better Auth generic OAuth only when `FEISHU_APP_ID` and
    `FEISHU_APP_SECRET` are present.
- `apps/web` owns product routing and UX:
  - add `feishu` to the OAuth provider registry;
  - show a Feishu login button only when the server detects credentials;
  - allow SSO discovery entries with `provider: "feishu"` and hand them to
    `/api/auth/oauth/feishu?callbackURL=...`.
- Ops owns environment parity:
  - Vercel dashboard, ECS/cloud-VM GitHub environment, and future AWS/GCP
    runtimes must set the same Feishu server-side variables;
  - ECS deploy forwards Feishu variables explicitly because that workflow uses
    an allowlist.

## Testing

Targeted tests cover provider detection, SSO discovery handoff, Feishu response
normalization, Better Auth plugin loading, env schema acceptance, and the
architecture contract that keeps docs, app code, auth code, and ECS workflow in
sync.
