# Residual backlog after 2026-07-24 multi-pass debt closure

## Closed

### Pass A (main)
1. Clerk enterprise SSO → `@nebutra/auth/react/clerk-enterprise-sso`
2. SSO arch: `DOMAINS.md` AUTH_SSO_DISCOVERY_PROVIDERS + OIDC_COOKIE_KEYS
3. Google One Tap → encodeAuthJsSessionToken
4. OpenAPI admin tenants/usage (5 routes)
5. `#126` flushUsageBuffer dual-write
6. CLI admin/link de-any

### Pass B (main + PRs)
7. OpenAPI admin dlq + feature-flags + system ping content schemas
8. `#126` sendEmailChangeEmail in `@nebutra/email` + web route uses it
9. CLI community.ts de-any (CommunityOptions / CommunityJson)
10. Auth boundary: tsekaluk-dev / sleptons reclassified as **permanent standalone apps** (not shrink-only product debt)
11. Router 302 → PR #224 (`feat/router-302-console`)
12. Forge tools / i18n world → dedicated branches (see open PRs)

## Still open (lower priority)

| Area | Item |
|------|------|
| OpenAPI | AI chat/embeddings/models/gateway, integrations CRUD, search, billing subscription |
| `#126` | org logo crop dialog |
| Brand | Tenant logo in product chrome |
| Design | Dual-mode stress fixtures |
| CLI | init/billing/unlink/stats/i18n residual loose types |
| Packages WIP | ~39 honest WIP packages |
| Legal | docs/legal TODO LEGAL |
