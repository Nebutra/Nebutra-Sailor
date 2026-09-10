# Frontend Constitution

- **Status**: Accepted
- **Date**: 2026-09-10
- **Scope**: every app under `apps/`, every component under `packages/design/`
- **Supersedes**: nothing. Extends `CLAUDE.md` (token governance, form-control rules,
  microcopy) rather than restating it.

## Context

PARA shipped a visual language that was genuinely researched — `apps/para/src/styles/shell.css`
maps a surface ladder onto existing semantic tokens, cites the six-competitor cartography, and
redefines nothing. It is good work. And the product still looks wrong.

That gap is the reason for this ADR. The failure was not taste, and not the research. It was that
the research produced *geometry and colour* tokens and nothing else, so every other decision —
type size, component choice, state ownership, responsive behaviour — was left to whoever wrote the
file. Thirty-five files each made those calls independently and the result is thirty-five slightly
different products.

An audit of `apps/para` on 2026-09-10 (35 `.tsx` files) found the shape of it:

| Layer | Finding | ADR §|
|---|---|---|
| Typography | The PARA token layer defines geometry, motion and colour — **no type scale**. So components invent sizes: `text-[11px]` ×11, `text-[10px]` ×2, `tracking-[0.18em]`, `tracking-[0.14em]` | §4.3 |
| Components | 42 raw `<button>` against 6 `Button` imports. **Zero** use of `Card`, `Badge`, `Avatar`, `Tooltip`, `Skeleton`, `Field`, `Separator`. `ProjectCard` is hand-rolled | §3.2, §7 |
| Responsive | **Zero** breakpoints in 35 files. Not "mobile is degraded" — mobile does not exist | §6 |
| State | `jobs-store` holds server state in Zustand. `NodeConfig` splits one form across two owners with different lifetimes | §11.2 |
| Async UI | 0 skeleton, 0 loading component, 1 retry. Empty and error states thin | §12.1 |
| RSC | 27 of 35 files are `"use client"` (77%) | §16.2 |
| Positioning | Node-anchored chrome hand-computes screen coordinates instead of using the anchoring primitive | §8.1 |

What the audit did **not** find matters too, because it says the problem is structural rather than
sloppy: no raw hex, no `any`, no `@ts-ignore`, no z-index sprawl (two uses, both deliberate), and
the `Popover` primitive is correctly portalled. People were not being careless. They were being
careful in thirty-five separate directions.

## Decision

The pasted Frontend Constitution is adopted in full as the standard for this repository. Its
thirty-one sections are the reference text; this file records what changes here as a result, so
that it becomes binding rather than aspirational.

### 1. The token layer must be complete before a surface is built

A product token layer that covers colour and geometry but not type is not a design system, it is
half of one, and the missing half gets improvised. Before any new surface: every visual dimension
the surface will use must exist as a token. For PARA that means adding a type scale and a
container/width scale to `shell.css` and migrating the 13 arbitrary sizes onto it.

### 2. Reuse is checked, not remembered

`Existing Component → Pattern → Primitive → Token → Create New`. The 42-vs-6 button ratio happened
because the check was a habit rather than a gate. It becomes a gate (see Enforcement).

### 3. Responsive is a design decision recorded per component

Each component declares which mode it uses — `Scale | Wrap | Stack | Collapse | Hide | Replace |
Scroll`. "Desktop only" is a legitimate answer for a canvas tool; **"nobody decided" is not**, and
that is what zero breakpoints across an entire app means.

### 4. State is classified before a tool is chosen

`Server | URL | Form | Local UI | Global Client | Persistent`. Two rules bind hardest here, because
both are already violated:

- Server state does not get copied into a Zustand store. `jobs-store` is the open case.
- One logical form has **one** owner. Splitting a form so that some fields commit immediately to a
  store and others live in React state that a `key` remount destroys is a data-loss bug, not a
  style preference.

### 5. Every async surface has more than a success state

`Initial · Loading · Success · Empty · Error · Refreshing` must each be evaluated. Not all must
render, but an unevaluated state is a defect.

### 6. Finished code is not finished UI

ADR §19 and §20 step 10 are binding: a surface is not done until it has been looked at, at the
sizes it claims to support.

## Enforcement

Documentation that is only documentation decays. This repo already has the right mechanism —
shrink-only ratchets in `governance.config.json` driven by `scripts/lint-*.mjs` and wired into
`pnpm lint`, as used for the repository seam, microcopy and Phosphor icons. The constitution gets
the same treatment, so the existing violations are recorded as a baseline that may only shrink and
the thirty-sixth file cannot add to it.

Planned guards, in the order they pay off:

1. `lint-arbitrary-typography` — no `text-[Npx]` / `tracking-[…]` in `apps/**`; baseline 13.
2. `lint-primitive-reuse` — raw `<button>` in `apps/**` where `Button` would do; baseline 42.
3. `lint-responsive-declared` — every component in `apps/**` declares a responsive mode or is
   listed as deliberately desktop-only.
4. `lint-server-state-ownership` — no network calls inside `stores/**`.

Baselines are recorded when each guard lands, not estimated in advance.

## Consequences

Accepted costs: a token layer to finish before the next PARA surface, more repository exploration
before generating UI, and four more lint guards to maintain.

Rejected alternative: fixing the 13 font sizes, the 42 buttons and the dropdown defect directly.
That is what has been happening, and it is why the same complaint recurs. The point of this ADR is
that the thirty-sixth file must be unable to repeat the mistake, not that the thirty-five get
tidied.

## Remediation order

Per ADR §23, progressive, not a rewrite:

1. Complete the PARA token layer (type scale, container widths).
2. Fix the `NodeConfig` state model — one owner per form, draft separated from committed run.
3. Compose `ProjectCard` and the other hand-rolled surfaces from existing primitives.
4. Land guards 1 and 2 with their baselines.
5. Decide and record PARA's responsive posture.
6. Move `jobs-store`'s server state behind a query layer.

Related: `docs/product-intelligence/visual-language.md`,
ADR 2026-09-09 para-canvas-renderer, ADR 2026-09-08 product-intelligence-phase.
