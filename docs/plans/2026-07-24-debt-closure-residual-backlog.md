# Residual backlog after 2026-07-24 multi-pass debt closure

GitHub tracking: **#227** (epic — consolidated workstreams).

Hygiene pass closed #231, #234, #236, #241, #242 into parents (see epic).

## Closed in code

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

## Open workstreams (after consolidation)

| Priority | Area | Issue |
|----------|------|-------|
| P0 | Open PR triage (product + stale automation) | #243 |
| P0 | Design skins biome CI + ignore shrink (phase 2) | #235 |
| P0 | OpenAPI remaining JSON content | #228 |
| P0/P1 | Org logo crop + tenant chrome | #229 |
| P0 | Gateway metering / key-pool / adapters | #230 |
| P1 | Type hygiene (`as any` / `@ts-*`, incl. CLI) | #232 |
| P1 | console → logger | #233 |
| P1 | Legal TODO stubs | #238 |
| P1 | Marketing PH redesign *(enhancement, not tech-debt)* | #239 |
| P2 | Dual-mode design stress fixtures | #237 |
| P2 | create-sailor scaffold TODOs | #240 |

## Consolidated away (do not refile)

| Closed | Into / reason |
|--------|----------------|
| #231 | → #232 (CLI de-any ⊂ type hygiene) |
| #234 | → #235 (ignore shrink = phase 2 of lint CI) |
| #236 | → #229 (tenant chrome + crop = one branding slice) |
| #241 | wontfix — status model already in `docs/package-status.md` |
| #242 | → #243 (same PR-hygiene workstream) |
