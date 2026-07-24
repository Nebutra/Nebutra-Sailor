# Residual backlog after 2026-07-24 debt closure (items 1–8)

Closed in this pass:

1. Clerk enterprise SSO handoff → `@nebutra/auth/react/clerk-enterprise-sso` (committed)
2. SSO arch contract: `docs/DOMAINS.md` documents `AUTH_SSO_DISCOVERY_PROVIDERS` + `OIDC_COOKIE_KEYS`
3. Google One Tap: apps use `encodeAuthJsSessionToken` / `decodeAuthJsSessionToken` (no direct `next-auth/jwt`)
4. Router 302 WIP: isolated branch / PR (not mixed into auth/debt commits)
5. OpenAPI `KNOWN_JSON_CONTENT_DEBT`: 5 admin tenant/usage routes declare `application/json`
6. `#126` `flushUsageBuffer` dual-writes ledger + `metering.ingest`
7. CLI `admin` + `link` de-`any` typed helpers
8. This residual list

## Still open (next knives)

| Area | Item | Notes |
|------|------|--------|
| Auth allowlist | `apps/tsekaluk-dev` better-auth direct | Portfolio standalone; migrate or keep exception |
| Auth allowlist | `apps/sleptons` Clerk shell | Legacy demo; migrate or archive |
| OpenAPI debt | ~19 routes left | AI chat/embeddings/models/gateway, integrations CRUD, search, billing subscription, dlq, flags, system ping |
| `#126` siblings | email-change helper | `sendEmailChangeEmail` not in `@nebutra/email` |
| `#126` siblings | org logo crop dialog | UI only |
| Brand | Tenant logo in shell | `Organization.logo` upload exists; chrome may not render |
| Design | Dual-mode fixtures | Stress pages / language swap coverage gaps |
| CLI | `community.ts` handlers `any` | Do last (previous type-strict break) |
| CLI | `init.ts` / `billing.ts` remaining loose types | Small follow-ups |
| Packages WIP | ~39 README WIP packages | Honest capability marks, not hot path |
| Legal | `docs/legal/*` TODO LEGAL | Counsel, not engineering |

## Do not mix

- Router 302 product surface, Forge skill explosion, and i18n world-locale work are large WIP trees; land via dedicated PRs.
