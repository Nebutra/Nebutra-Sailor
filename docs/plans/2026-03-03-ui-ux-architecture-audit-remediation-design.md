# Nebutra-Sailor UI/UX Architecture Audit Remediation Design

Date: 2026-03-03
Owner: Codex
Status: Approved

## 1. Context
The current product has strong infrastructure (tokens, components, theme engine) but weak user-facing execution in landing and dashboard surfaces. The audit identified major gaps in visual impact, brand consistency, dashboard IA, and standards compliance.

## 2. Goals
1. Execute all five highest-ROI actions from the audit.
2. Deliver in four waves with each wave independently runnable and testable.
3. Raise practical quality baseline across brand, UX structure, accessibility, and performance without rewriting monorepo architecture.

## 3. Non-Goals
1. Full migration to figma-token CI pipeline in this pass.
2. Replacing whole design-system package architecture.
3. Backend schema refactor.

## 4. Wave Plan

### Wave 1 — Token/Brand Consistency
- Replace critical raw Tailwind accent colors in landing/web with brand tokens.
- Unify manifest + OG/Twitter visuals to brand language.
- Remove font loading conflicts (CDN Geist vs next/font).
- Fix high-priority semantics such as missing `type="button"`.

### Wave 2 — Landing Visual Density & Conversion Surface
- Add hero visual animation (Lottie) with graceful fallback.
- Deduplicate command box into shared component.
- Expand section architecture (demo/workflow/testimonials/pricing hint).
- Replace raw motion usage with `AnimateIn` / `AnimateInGroup`.

### Wave 3 — Dashboard IA & Product UX
- Introduce sidebar shell and clear navigation hierarchy.
- Adopt design-system components (`PageHeader`, `Card`, `LoadingState`, `EmptyState`, `ErrorState`).
- Add route-level loading + state handling.
- Introduce safer, cache-aware growth summary fetch path.

### Wave 4 — Accessibility, Performance, SEO
- Add skip-to-content links and enforce landmarks.
- Add JSON-LD for Organization/WebSite.
- Optimize non-critical sections with dynamic loading and keep image optimization.
- Keep reduced-motion and animation performance discipline.

## 5. Testing Strategy (TDD)
1. Add failing tests first for brand consistency, source-structure invariants, and data-layer safety/caching behavior.
2. Implement wave changes until tests pass.
3. Run lint/typecheck/test for touched workspaces.

## 6. Risks and Mitigations
1. Risk: visual regressions from broad color replacement.
   Mitigation: source-level checks + focused component edits only.
2. Risk: animation weight/perf regressions.
   Mitigation: lazy load Lottie and defer below-fold sections.
3. Risk: dashboard shell regressions for auth states.
   Mitigation: preserve existing clerk gating, change shell incrementally.

## 7. Deliverables
1. Updated landing and dashboard architecture and visuals.
2. Brand-consistent metadata/manifest/social images.
3. Added tests enforcing key invariants.
4. Validation report with residual gaps.
