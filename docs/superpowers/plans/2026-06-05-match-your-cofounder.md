# Match Your Cofounder — Implementation Plan

> **For agentic workers:** use superpowers:subagent-driven-development (or executing-plans).
> Steps use `- [ ]`. Design spec: `docs/plans/2026-06-05-match-your-cofounder-design.md`.

**Goal:** Ship "Match your cofounder" — OPC→team via a context-rich, swipe-decided cofounder
match that matches compiled `CompanyContext`, with the initiator-pays paywall at Match.

**Architecture:** New UI under `apps/web/src/components/cofounder-match/**` (new files — does
NOT touch the loop-owned Startup OS command-center). Real wiring: `packages/ai/cofounder-match`
(engine), `@nebutra/billing` (landing-price paywall + free-swipe limit config), tenant
supertype (OPC→Org), `@nebutra/license` (commercial exemption carried into the team). Real
data + honest empty states only — no fabricated candidate pool.

**Locked decisions:** opt-OUT default; free-swipe limit = billing config; initiator pays.

**Governance:** design-system only (`@nebutra/ui`/primitives/icons/tokens/`AnimateIn`),
primitive-only forms, dark-drift clean, repository-seam (data access via repos/API, not raw
Prisma in components), TDD where logic exists, `git commit --no-verify -- <paths>` to main.

---

## Phase 0 — Naming + entry point (safe, ship first)
- [ ] Locate Nebutra's workspace/tenant switcher + org-create entry (start from
      `@nebutra/ui/patterns` WorkspaceSwitcher usage in `design-system-shell.tsx`, the
      org-create flow behind `/api/organizations`, and `account-dialog.tsx`).
- [ ] Rename Individual-tenant label → **OPC / 一人公司** (en/zh) and the "create team/org"
      action → **Match your cofounder** at the real entry point(s).
- [ ] Route "Match your cofounder" to `/[locale]/cofounder` (new route, placeholder until
      Phase 2) — wire the entry even if Discover lands later.
- [ ] Typecheck + lint; commit.

## Phase 1 — Data model + opt-in pool (real backend)
- [ ] Add a `CofounderProfile` (opt-in) + `CofounderMatch` (interest/match/room) data model
      (Prisma) — opt-OUT by default; a founder appears in the pool only after joining.
      Reuse tenant + CompanyContext; store the complementarity inputs the engine needs.
- [ ] Gateway routes (TDD): `POST /api/v1/cofounder/opt-in`, `GET /api/v1/cofounder/discover`
      (engine-ranked, excludes self/passed), `POST /api/v1/cofounder/interest`
      (pass|interested|pitch), `GET /api/v1/cofounder/matches`. Wire `packages/ai/cofounder-match`
      for ranking + complementarity score. Honest empty pool, never fabricated.
- [ ] Regenerate OpenAPI types; add response schemas (avoid the content?:never debt).

## Phase 2 — Discover screen
- [ ] `cofounder-match/discover-deck.tsx` + `cofounder-card.tsx`: founder×company card
      (archetype, trust badge, thesis/arena/stage, complementarity bar, traction). Pass /
      Interested / Pitch actions (drag + keyboard, reduced-motion safe). Filters. Honest empty.
- [ ] `/[locale]/cofounder` page renders the deck (gated by opt-in; opt-in CTA when not joined).

## Phase 3 — Match + paywall (initiator pays = landing price)
- [ ] Match surface: side-by-side CompanyContext + computed complementarity, brand-gradient moment.
- [ ] Paywall at Match via `@nebutra/billing` (read the landing plan price — do NOT hardcode);
      initiator pays to open the Cofounder Room, counterpart joins free. Free-swipe limit read
      from billing config.

## Phase 4 — Cofounder Room → form team
- [ ] `cofounder-room.tsx`: full CompanyContexts, scoped chat, thesis-alignment checklist.
- [ ] **Form the team**: upgrade the OPC (Individual tenant) → Organization tenant; carry the
      compiled company over (CompanyContext + artifacts). TDD the tenant upgrade path.

## Phase 5 — License carry-over
- [ ] On team formation, ensure the Sailor commercial-exemption license is carried to the team
      tenant (reuse `@nebutra/license` / create-sailor `license-emit` signing). (Coordinate
      with the separate licensing spec.)

## Phase 6 — Verify
- [ ] `pnpm --filter @nebutra/web test` green; arch tests (incl. OpenAPI ratchet) green; web
      typecheck 41/41; biome + governance lints clean. No mock pool, honest empty states.

## Done-when
OPC can opt in, Discover real candidates ranked by complementarity, mutual Interested → Match →
initiator pays (landing price) → Cofounder Room → Form team (OPC→Org, company + license carry
over). Tenant labeled OPC; "Match your cofounder" entry live. Zero mock.
