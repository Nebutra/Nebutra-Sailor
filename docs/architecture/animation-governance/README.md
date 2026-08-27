# Animation Architecture Governance

Date: 2026-06-06

This directory defines Nebutra-Sailor animation ownership for the monorepo.

## Layering

```
Animation Architecture
├── CSS Transitions
│   └── hover, focus, active, color, border, background, shadow
├── Motion
│   └── product UI state, layout, overlays, lists, page transitions
└── GSAP
    └── marketing storytelling, scroll narrative, SVG, showcase timelines
```

## Current Source Of Truth

- Product Motion: `packages/design/ui/src/shared/animation/motion`
- CSS animation utilities: `packages/design/ui/src/shared/animation/css`
- App import facade: `apps/{web,landing,design-docs,sailor-docs}/src/shared/motion.ts`
- Marketing GSAP: `apps/landing/src/shared/animation/gsap`
- Governance script: `scripts/verify-animation-governance.mjs`
- Command: `pnpm animation:governance`
- Detail command: `node scripts/verify-animation-governance.mjs --details --limit=25`

## CI Gate

Primary CI runs the blocking gate in `.github/workflows/ci.yml` under the
`lint-typecheck` job, immediately after `Architecture smoke checks`:

```bash
pnpm --config.verify-deps-before-run=false animation:governance
```

The gate fails when GSAP appears outside the approved landing GSAP layer, or
when source code imports `framer-motion` / `motion/react` outside the shared
Motion layer.

## Local Verification

Run the same command before opening or updating a PR:

```bash
pnpm --config.verify-deps-before-run=false animation:governance
```

For actionable triage output, run:

```bash
pnpm --config.verify-deps-before-run=false animation:governance -- --details
```

When the report flags a violation:

- Move app Motion imports to the nearest `src/shared/motion.ts` facade.
- Keep shared Product primitives in `packages/design/ui/src/shared/animation/motion`.
- Keep GSAP usage behind `apps/landing/src/shared/animation/gsap` hooks.
- Treat `transition-all`, missing reduced-motion handling, and layout animation
  counts as cleanup backlog unless the script lists them under violations.

## Reports

- [Animation Audit Report](./animation-audit-report.md)
- [Animation Architecture Proposal](./animation-architecture-proposal.md)
- [Motion Refactor Plan](./motion-refactor-plan.md)
- [GSAP Refactor Plan](./gsap-refactor-plan.md)
- [Accessibility Report](./accessibility-report.md)
- [Performance Report](./performance-report.md)
- [Migration Roadmap](./migration-roadmap.md)
