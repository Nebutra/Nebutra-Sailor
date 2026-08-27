# Animation Audit Report

Date: 2026-06-06

Command:

```bash
pnpm --config.verify-deps-before-run=false animation:governance
node scripts/verify-animation-governance.mjs --details --limit=25
```

## Summary

| Zone | Files scanned | Direct Motion imports | Motion API files | GSAP files | CSS animation files | `transition-all` files | Missing reduced-motion signal | Layout animation files |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Product | 1603 | 0 | 38 | 0 | 66 | 0 | 0 | 3 |
| Marketing | 484 | 0 | 26 | 4 | 38 | 0 | 0 | 8 |
| Documentation | 806 | 0 | 2 | 0 | 25 | 1 | 0 | 0 |
| Other | 1666 | 0 | 15 | 0 | 30 | 0 | 0 | 1 |

Total animated files audited: 180.

The default command is the CI-safe gate. The `--details` command prints the
first actionable files per zone with risk labels such as
`direct-motion-import`, `transition-all`, `missing-reduced-motion`, and
`layout-animation`.

## Motion Usage Locations

Product:

- `packages/design/ui/src/shared/animation/motion/*` is now the only direct
  Product Motion import layer in the design-system product surface.
- `packages/design/ui/src/primitives/*` and `packages/design/ui/src/components/*`
  consume Motion through the shared layer.
- Product app code currently has no GSAP usage; the governance script blocks GSAP outside the landing shared GSAP layer.

Marketing:

- `apps/landing/src/components/landing/*` consumes Motion through `@/shared/motion` for local controls.
- `packages/design/ui/src/marketing/*` consumes Motion through the shared design-system layer.
- `apps/landing/src/shared/animation/gsap/*` is the new approved GSAP layer.
- `packages/design/ui/src/marketing/cosmic-spectrum.tsx` is now static UI; the old CDN/window GSAP dependency has been removed.

Documentation:

- `apps/design-docs/src/components/motion-demos.tsx`
- `apps/sailor-docs/src/components/motion-demos.tsx`
- Documentation demos now import Motion through `@/shared/motion`.
- Documentation mostly uses CSS transitions and demo-only Motion.

## GSAP Usage Locations

Approved:

- `apps/landing/src/shared/animation/gsap/helpers/runtime.ts`
- `apps/landing/src/shared/animation/gsap/hooks/*`
- `apps/landing/src/shared/animation/gsap/timelines/*`

No legacy GSAP exceptions remain.

## CSS Animation Locations

CSS animation and transition usage is broad and expected for simple UI. The cleanup target is not "remove CSS motion"; it is:

- replace `transition-all` with scoped property transitions;
- add `motion-reduce:*` or `prefers-reduced-motion` guards to keyframes and long-running loops;
- keep hover/focus/active states in CSS instead of Motion/GSAP.

## Repeated Animation

- `AnimateIn` exists in three places: landing local component, UI components, and UI primitives.
- Product/marketing demos duplicate fade/slide/scale variants instead of consuming shared motion tokens.
- Marketing mockups now keep local controls on Motion; future storytelling sequences should migrate to GSAP hooks.
- Multiple CSS keyframe marquee/glow implementations exist across marketing and UI primitives.

## Technical Debt

- Docs source has no direct Framer Motion imports.
- Documentation has one remaining `transition-all` reference inside a quality-check script, not a runtime UI file.
- Layout animation still exists in Product, Marketing, and Other zones and requires performance review before expanding.
