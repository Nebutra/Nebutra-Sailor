# Animation Architecture Proposal

## Principle

Use the smallest animation layer that solves the job:

- CSS for micro-interactions.
- Motion for product UI state and layout.
- GSAP for marketing storytelling and scroll-driven experiences.

## Ownership

### CSS

Owner: design system.

Path:

```text
packages/design/ui/src/shared/animation/css
```

Use for:

- hover
- focus
- active
- border
- background
- color
- shadow
- opacity
- small transform feedback

Do not use Motion or GSAP for these states.

### Motion

Owner: design system.

Path:

```text
packages/design/ui/src/shared/animation/motion
```

App facades:

```text
apps/web/src/shared/motion.ts
apps/landing/src/shared/motion.ts
apps/design-docs/src/shared/motion.ts
apps/sailor-docs/src/shared/motion.ts
```

Business code should import:

```tsx
import { motion, AnimatePresence, LayoutGroup } from "@/shared/motion";
```

Use for:

- modal
- drawer
- popover
- dropdown
- sidebar
- tabs
- card
- list
- table
- command menu
- page transition
- layout animation
- shared element transition

### GSAP

Owner: marketing app.

Path:

```text
apps/landing/src/shared/animation/gsap
```

Public hooks:

- `useHeroAnimation()`
- `useScrollReveal()`
- `useFeatureTimeline()`
- `useProductShowcaseTimeline()`

Use for:

- landing hero
- brand storytelling
- scroll narrative
- SVG animation
- product showcase
- feature walkthrough
- timeline animation
- parallax
- reveal sequences

Do not use for:

- dropdown
- modal
- sidebar
- table
- form
- dashboard

## Next.js Boundary Rule

Server Components remain the default. Animation belongs in leaf client components, facades, or hooks. Do not turn a route, layout, or data-fetching shell into a Client Component only to animate a child.

## Governance

`pnpm animation:governance` enforces:

- no GSAP outside the landing GSAP layer;
- no direct `framer-motion` or `motion/react` imports outside the shared Motion layer;
- audit summaries for direct Motion, GSAP, CSS animation, `transition-all`, reduced-motion gaps, and layout animation.
