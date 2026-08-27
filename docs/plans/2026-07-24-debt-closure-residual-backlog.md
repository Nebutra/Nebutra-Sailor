# Residual backlog after 2026-07-24 multi-pass debt closure

GitHub tracking: **#227** (children #228–#243).

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
10. Auth boundary: tsekaluk-dev / sleptons reclassified as **permanent standalone apps**
11. Router 302 → PR #224
12. Forge tools / i18n world → PR #225 / #226 (open — see #243)

## Still open → issues

| Area | Issue |
|------|-------|
| OpenAPI remaining content | #228 |
| #126 logo crop | #229 |
| #126 gateway metering/key-pool | #230 |
| CLI residual any | #231 |
| as any / ts-ignore | #232 |
| console → logger | #233 |
| biome-ignore shrink | #234 |
| Design skins CI biome | #235 |
| Tenant logo chrome | #236 |
| Dual-mode stress fixtures | #237 |
| Legal TODO | #238 |
| Marketing PH redesign | #239 |
| create-sailor TODOs | #240 |
| WIP promotion policy | #241 |
| Stale automation PRs | #242 |
| Product PRs #221/#225/#226 | #243 |
