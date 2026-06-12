# Migration Roadmap

## Phase 0 - Completed In This Pass

- Added the shared motion facade through `@nebutra/ui/components`.
- Kept animation CSS internal to `@nebutra/ui`.
- Added app facades for `@/shared/motion`.
- Moved landing GSAP infrastructure to `apps/landing-page/src/shared/animation/gsap`.
- Added `pnpm animation:governance`.
- Added architecture reports.
- Added the CI animation governance gate to `.github/workflows/ci.yml`.
- Migrated Product design-system primitives/components to the shared Motion
  layer.
- Migrated docs Motion demos to `@/shared/motion`.
- Reduced Documentation `transition-all` usage from source components to one
  remaining script-level checker reference.
- Converged Marketing to directMotion=0, transitionAll=0, missingReduced=0.
- Converged Product to directMotion=0, transitionAll=0, missingReduced=0.
- Removed the legacy `cosmic-spectrum` CDN/window GSAP exception.

## Phase 1 - Guard New Work

- Keep `pnpm animation:governance` in local and CI checks.
- Block GSAP in dashboard, admin, forms, tables, and product routes.
- Block new Product app direct imports from `framer-motion` or `motion/react`.

## Phase 2 - Product Motion Migration

- Migrate app-level overlays, drawers, command palette, and page transitions to `@/shared/motion`.
- Replace duplicated variants with shared `tokens.ts` and `variants.ts`.
- Keep direct Framer imports only inside the design-system shared Motion layer.

## Phase 3 - Landing GSAP Migration

- Convert hero and product showcase sequences to `useHeroAnimation()` and `useProductShowcaseTimeline()`.
- Convert reveal rails to `useScrollReveal()`.
- Convert walkthrough sections to `useFeatureTimeline()`.
- Leave simple nav/dropdown/drawer interactions on Motion or CSS.

## Phase 4 - Documentation Cleanup

- Migrate docs direct Motion imports to `@/shared/motion`.
- Keep explicit Motion demo imports only when the demo is teaching Motion itself.
- Replace demo `transition-all` with scoped CSS transitions.

## Phase 5 - Strict Mode

- Fail all direct GSAP outside landing shared GSAP.
- Fail all direct Motion imports outside shared Motion facades.
- Convert reduced-motion audit from report-only to fail-on-new for touched zones.

## Desired End State

```text
Landing Page
  -> GSAP for storytelling and product showcase
  -> Motion for local UI controls

Dashboard / Admin / Developer Platform
  -> Motion for product UI
  -> CSS for micro-interactions
  -> no GSAP

Documentation / Design Docs
  -> Motion for demos and page UI
  -> CSS for most micro-interactions

Simple UI
  -> CSS only
```
