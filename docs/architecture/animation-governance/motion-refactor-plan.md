# Motion Refactor Plan

## Target API

Product UI should move toward:

```tsx
import {
  motion,
  AnimatePresence,
  LayoutGroup,
  FadeIn,
  SlideIn,
  ScaleIn,
  AnimatedCard,
  AnimatedList,
  AnimatedModal,
  AnimatedDrawer,
  AnimatedPopover,
  PageTransition,
} from "@/shared/motion";
```

## New Shared Surface

Implemented:

```text
packages/design/ui/src/shared/animation/motion/tokens.ts
packages/design/ui/src/shared/animation/motion/variants.ts
packages/design/ui/src/shared/animation/motion/primitives/index.tsx
packages/design/ui/src/shared/animation/motion/index.ts
```

Package export:

```text
@nebutra/ui/shared/animation/motion
```

## Migration Order

1. Product app business code
   - Replace any direct `framer-motion` usage with `@/shared/motion`.
   - Keep Motion in leaf components.
   - Use CSS for hover/focus/active.

2. Product primitives
   - Move duplicated fade/slide/scale variants to shared variants.
   - Keep direct Framer Motion imports only inside the shared Motion layer.

3. Documentation apps
   - Replace direct demo imports with `@/shared/motion`.
   - Keep demo code explicit where the purpose is teaching Motion.

4. Landing UI controls
   - Keep dropdown/drawer/popover/tab behavior on Motion.
   - Move storytelling/reveal/showcase sequences to GSAP hooks.

## Product Motion Rules

- Use `AnimatedModal`, `AnimatedDrawer`, and `AnimatedPopover` for overlays.
- Use `AnimatedList` for small lists only.
- Avoid layout animation in realtime dashboards and large tables.
- Do not use `transition-all`; use CSS utility transitions or `cssTransition`.
- Always support reduced motion.

## Known Debt

- `AnimateIn` is duplicated across landing local, UI components, and UI primitives.
- Several files use `layout` or `layoutId`; these need product-by-product performance review before expanding.
