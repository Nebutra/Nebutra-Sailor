# Accessibility Report

## Required Behavior

Motion and GSAP must support:

- `prefers-reduced-motion`
- no large movement when reduced motion is active
- no complex timeline when reduced motion is active
- no scroll story when reduced motion is active
- opacity or instant state changes remain allowed

## Current Baseline

Governance audit found:

- Product: 0 Motion API files without a detectable reduced-motion signal.
- Marketing: 0 Motion API files without a detectable reduced-motion signal.
- Documentation: 0 Motion API files without a detectable reduced-motion signal.
- Other: 0 Motion API files without a detectable reduced-motion signal.

This is a heuristic. Some files may delegate reduced-motion handling to child primitives, but each missing signal still needs review.

## Implemented Guardrails

Product Motion primitives:

- `FadeIn`
- `SlideIn`
- `ScaleIn`
- `AnimatedCard`
- `AnimatedList`
- `AnimatedModal`
- `AnimatedDrawer`
- `AnimatedPopover`
- `PageTransition`

These collapse transform-heavy variants to opacity-only reduced-motion variants.

Landing GSAP:

- `useMarketingGsap()` skips GSAP timelines by default when `prefers-reduced-motion: reduce`.
- `allowReducedMotion` is explicit opt-in for opacity-only exceptions.

## Required Fixes

1. Keep new Product overlays/lists/page transitions on shared Motion primitives.
2. Replace future landing storytelling sequences with GSAP hooks that skip under reduced motion.
3. Keep CSS micro-interactions scoped to explicit transition properties.
4. Guard new long-running keyframe loops with `prefers-reduced-motion` or `motion-reduce:*`.
