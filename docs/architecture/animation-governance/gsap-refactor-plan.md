# GSAP Refactor Plan

## New Shared Surface

Implemented:

```text
apps/landing-page/src/shared/animation/gsap/helpers/runtime.ts
apps/landing-page/src/shared/animation/gsap/hooks/use-landing-gsap.ts
apps/landing-page/src/shared/animation/gsap/hooks/use-hero-animation.ts
apps/landing-page/src/shared/animation/gsap/hooks/use-scroll-reveal.ts
apps/landing-page/src/shared/animation/gsap/hooks/use-feature-timeline.ts
apps/landing-page/src/shared/animation/gsap/hooks/use-product-showcase-timeline.ts
apps/landing-page/src/shared/animation/gsap/timelines/hero-timeline.ts
apps/landing-page/src/shared/animation/gsap/timelines/scroll-timeline.ts
apps/landing-page/src/shared/animation/gsap/timelines/feature-timeline.ts
apps/landing-page/src/shared/animation/gsap/timelines/product-showcase-timeline.ts
apps/landing-page/src/shared/animation/gsap/index.ts
```

## Usage Rule

Landing components must consume hooks:

```tsx
useHeroAnimation(rootRef);
useScrollReveal(rootRef);
useFeatureTimeline(rootRef);
useProductShowcaseTimeline(rootRef);
```

Do not scatter:

```tsx
gsap.to(...);
gsap.from(...);
gsap.timeline(...);
ScrollTrigger.create(...);
```

inside page or section components.

## Migration Order

1. Move hero reveal and product-showcase reveal from Framer Motion to `useHeroAnimation()` and `useProductShowcaseTimeline()`.
2. Move long landing reveal sequences to `useScrollReveal()`.
3. Move feature walkthroughs to `useFeatureTimeline()`.
4. Keep `CosmicSpectrum` static unless it is moved behind landing GSAP hooks.

## GSAP Rules

- Always use `@gsap/react` `useGSAP`.
- Always pass a scope.
- Prefer transform and opacity.
- Use `ScrollTrigger.batch()` for repeated reveal groups.
- Pin only narrative sections, never regular dashboard or docs content.
- Do not register plugins in components.
- Do not use global selectors without a scoped root.

## Current Status

No GSAP exception remains outside `apps/landing-page/src/shared/animation/gsap`.
