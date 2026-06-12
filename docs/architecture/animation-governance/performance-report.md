# Performance Report

## CPU Risk

High:

- ScrollTrigger, parallax, pinning, and large reveal batches.
- Realtime dashboards mixed with layout animation.
- Large lists using `AnimatePresence` or per-row Motion.

Current baseline:

- Product layout animation files: 3.
- Marketing layout animation files: 8.
- Documentation layout animation files: 0.
- Other layout animation files: 1.

## Memory Risk

High:

- GSAP timelines created outside `useGSAP` or without scope cleanup.
- ScrollTrigger instances not killed when a component unmounts.
- Repeated timelines created on every render.

Mitigation:

- Use only `apps/landing-page/src/shared/animation/gsap/hooks/*`.
- Use `revertOnUpdate` by default.
- Keep GSAP registration centralized.

## Hydration Risk

High:

- Promoting route layouts or page shells to Client Components for animation.
- Animated wrappers around RSC data boundaries.
- Client-side animation providers around large subtrees.

Mitigation:

- Server Components by default.
- Animation at leaf client components.
- App facades are client-only, but importing them should happen in client leaves.

## Bundle Risk

High:

- GSAP in dashboard/product bundles.
- Marketing animation components exported from `@nebutra/ui` in a way that product apps import by accident.
- Framer Motion imported directly outside the shared facade.

Mitigation:

- GSAP lives only in landing app.
- Product Motion lives behind the public `@nebutra/ui/components` entrypoint.
- Product app code imports from `@/shared/motion`.

## CSS Risk

Current baseline includes:

- Product `transition-all`: 0 runtime files.
- Marketing `transition-all`: 0 runtime files.
- Documentation `transition-all`: 1 script-level checker reference.
- Other `transition-all`: 0 runtime files.

Migration target: replace `transition-all` with specific transitions for color, background, border, opacity, shadow, or transform.
