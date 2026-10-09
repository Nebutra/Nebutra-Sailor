# Landing Motion System: narrative first, motion second, performance always

- **Status**: Accepted
- **Date**: 2026-10-09
- **Owner**: Tseka Luk
- **Related**: `docs/design-system/animation-governance/*` (this ADR supersedes its proposal and keeps its guardrails), ADR 2026-09-10 Frontend Constitution, `packages/design/tokens` motion tokens, `apps/landing`, `apps/kcq` public site

## Context

Our landings mixed motion ad hoc: uniform fade-ups, effects competing for attention, and one designed moment followed by static sections. The founder set a single motion standard for every Nebutra landing, including product sites such as the KCQ public site (`apps/kcq`).

## Decision

### 1. Paradigms and priority

Feedback is **P0**: press, focus, success, error and async state.

These are **P1**:
- Loading (skeleton, progress)
- Entrance and scroll reveal
- Typography reveals
- Layout (FLIP, tabs)
- Spring feedback

These are **P2**:
- Navigation transitions
- Scroll-linked and scroll-narrative motion
- Pointer
- SVG and data motion
- Ambient motion

Spatial work (WebGL, shader, 3D) and splash screens are **P3** and need their own justification.

### 2. Principles
1. One dominant **signature motion** per landing.
2. Headlines and product visuals carry the strongest expression. Body copy and trust areas stay quiet.
3. Motion explains relationships, reinforces hierarchy and gives feedback. It never stands in for an unfinished static design.
4. The following are not allowed:
   - site-wide uniform fade-up;
   - meaningless character scrambles;
   - excessive springs or glows;
   - product-unrelated 3D.
5. Scroll-linked motion is reversible with scroll.
6. Motion is interruptible. Clicks, navigation, back and keyboard input win over a running timeline.

### 3. Section choreography (intensity is attention, not cost)

| Section | Motion | Engine | Intensity |
|---|---|---|---|
| First paint | Text, CTA and essential visual shown instantly | CSS / SSR | 0 |
| Hero | Masked headline, stagger, visual reveal; one timeline of about 0.7–1.2 s that never blocks input | GSAP timeline | 3 |
| Navigation | Underline, active state, light header transition | CSS | 1 |
| Social proof, trust, pricing, CTA, footer | Mostly static; hover, press, feedback | CSS | 1 |
| Value and features | Grouped reveal, image/text coordination, hover preview | CSS / IntersectionObserver (Motion in React) | 2 |
| Product demo (at most one) | Sticky, scrub, 2–4 chapters (problem → action → response → verifiable result); mobile degrades to tabs or tap-through | GSAP ScrollTrigger | 4 |
| Architecture | SVG draw, node transitions | GSAP / CSS | 3 |

### 4. Engine ownership
- **CSS / WAAPI**: micro-interactions and simple state.
- **Motion** (React apps only): state, layout, gesture and exit animations.
- **GSAP**: hero timelines, complex choreography, SVG and pinned stories. Never basic hovers.
- **View Transitions**: progressive enhancement only, never a hard dependency.
- **Rive / dotLottie**: brand illustration and state machines, never in place of accessible native controls.
- **OGL / Three.js / WebGPU**: only where the scene is the product's differentiator.
- **Lenis**: optional. Enable it only after a native-scroll comparison shows a perceived gain, and only if anchors, scroll restoration and mobile input still work (ADR-B).
- **Two engines never write the same property on the same element.** Split control across a parent and a child wrapper.

#### Vue products (`apps/kcq`)
- Use CSS/WAAPI, IntersectionObserver (VueUse) and GSAP.
- No React Motion port. motion-v was rejected on bundle size.
- No Lenis on KCQ: Safari caps it at 60 fps, which contradicts the 200 Hz rendering claim.
- KCQ's signature motion is the hero light field, the candle glyph unfolding into live candles (WebGPU, technique-only use of vgpu).

### 5. Sub-decisions
- **ADR-A**: no mandatory splash screen. Real loading uses skeletons or local state.
- **ADR-B**: native scroll first.
- **ADR-C**: in-view reveals use IntersectionObserver (or Motion). ScrollTrigger is used only for pin, scrub or exact multi-element sync.
- **ADR-D**: navigation correctness comes first. Direct load, refresh, back, focus transfer and interruption must all work. Shared elements are used only where there is real visual continuity.
- **ADR-E**: real product before decorative effects. A complex hero effect must map to the product's concept or mechanism.

### 6. Tokens and constraints

| Token | Value |
|---|---|
| Micro | 100–180 ms |
| Short | 180–300 ms |
| Medium | 300–500 ms |
| Long | 500–800 ms |
| Hero | 700–1200 ms |
| Reveal Y | 16–32 px |
| Stagger | 40–90 ms |
| Main ease | `cubic-bezier(0.22, 1, 0.36, 1)`; KCQ's existing `--klc-motion` ease-out `(0.23, 1, 0.32, 1)` is equivalent and stays |
| Spring | stiffness 300, damping 30 |

These are design starting points, not measured optima.

Constraints:
- Animate `transform` and `opacity`. Profile any filter, large blur, clip or canvas work.
- Core Web Vitals must be Good on lab and field data: LCP ≤ 2.5 s, INP ≤ 200 ms, CLS ≤ 0.1.
- `prefers-reduced-motion` keeps the full content and interactivity, with no movement, pin or scrub.
- Every complex timeline is created inside `gsap.context`/`gsap.matchMedia` and reverted on unmount and on reduced-motion change.

### 7. Rollout
1. **Phase 0 — repo audit.** Review the framework, routing, existing Motion/GSAP, CSS and the performance baseline. No duplicate libraries and no new directories without that review.
2. **Phase 1 — foundation.** Tokens, reduced motion, micro-interactions, a shared reveal.
3. **Phase 2 — hero signature.**
4. **Phase 3 — one product story.**
5. **Phase 4 — progressive enhancements, each on its own merit.**
6. **Phase 5 — QA:** desktop, mobile, touch, keyboard, reduced motion, slow network, low-end devices, back/refresh, rapid interaction.

## Acceptance
- Every animation has a stated purpose and a single engine owner.
- Every complex timeline can be destroyed and restored.
- No content is ever left invisible, and no state blocks the user.
- No visual effect costs load performance or conversion.
- Each landing has one strong brand memory. Everything else serves information.
- The static page stands on its own at full visual quality.

**Build a maintainable motion design system first. Raise visual expression selectively; never stack effect components.**
