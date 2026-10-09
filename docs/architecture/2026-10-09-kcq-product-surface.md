# KCQ product surface: `/` enters the app, `/home` is the indexed landing

- **Status**: Proposed
- **Date**: 2026-10-09
- **Owner**: Tseka Luk
- **Related**: KLineChartQuant ADR 0001 (name), 0002 (routing), 0003 (bilingual);
  `apps/kcq`, `infra/fly/kcq.toml`, `tests/architecture/seo-locale-closure.test.ts`,
  `packages/design/brand/src/metadata.ts`

## Context

`kcq.nebutra.com` is served by `apps/kcq` (Vite + Vue shell around the pinned KLineChartQuant
source). It has no router and no landing. `seo-locale-closure.test.ts:196` lists kcq as a
DISALLOWED (authenticated, unindexed) surface. `brand.domains` has no kcq entry, so its origin is
duplicated as string literals in `trusted-origins.ts:38`, `auth-center.ts:141` and
`apps/auth/src/worker-edge.ts:113`.

## Decision

1. **Routing in `apps/kcq`**, Vercel pattern — the product is the front door:
   `/` → `/app` (workspace, `noindex`), `/home` → landing (en, `x-default`), `/zh/home`, and `/benchmark` (+ `/zh/benchmark`), the public comparative benchmark. Public pages are indexed and prerendered. First visit detects browser language.
   The landing and the workspace are separate chunks.
2. **SEO closure is split per path**: kcq moves from DISALLOWED to a mixed surface —
   `/home`, `/benchmark` and their `hreflang` variants indexed, everything else disallowed.
3. **`brand.domains.kcq = "kcq.nebutra.com"`**; trusted origins derive from `brand.domains`.
4. Routing lives in the Sailor shell, not the upstream fork's `preview/`, so upstream stays a
   library + demo and the product shell stays in Sailor.

## Consequences

- `seo-locale-closure.test.ts` and the trusted-origin call sites change in the same PR.
- The fork's ADR 0002 is implemented here; the fork's `preview/` keeps working as a demo.
