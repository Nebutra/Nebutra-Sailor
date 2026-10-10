# Hover motion contract

What may change under the pointer, by control class, and how fast. Enforced by
`scripts/lint-hover-motion.mjs` (shrink-only, `governance.config.json → hoverMotion`) for the parts a
scanner can see; the rest is review.

Related: ADR 2026-09-10 frontend constitution · `packages/design/brand/src/motion.ts` ·
`packages/design/design-tokens/tokens/core.json` (`duration.*`, `motion.ease.*`) ·
`packages/design/tokens/recipe.css` (`@custom-variant hover`).

## Why this exists

On 2026-10-10 the owner pointed at three hovers on the live sites. Each was a family, not a file:

| Spot | What happened | Root cause | Family size at audit |
| --- | --- | --- | --- |
| `/ideas` "Return to Hub" | The black button turned `#63676e` grey (`#8a8f98` in dark) and rose 1px — it read as disabled | `Button variant="ink"` hovered to `neutral-11`, the secondary-**text** step, and carried `hover:-translate-y-px` | 29 `hover:opacity-*` dims, 1 Button variant, 1 CSS module doing the same with `--neutral-11` |
| `/sailor` `npx create-sailor` box | The whole box rose 4px into `shadow-glass-md` over 500ms on a raw cubic-bezier; the Copy button inside also lifted and faded to 90% | `KineticCommandBox` gave a **non-interactive container** the hover of a clickable card | 17 lifts over 2px, 18 off-ramp hover shadows, 5 raw easings |
| Design site `/icons` under Stripe | A hovered tile filled solid midnight; icon and label vanished | `semanticFromRoles` mapped `roles.brand` onto `--accent`, the shadcn **hover surface**; five languages (Stripe, Vanta, Notion, Raycast, Cosmos) shipped a brand hue there, and the tile's children hard-set their own colour | every `hover:bg-accent` in the product under those five languages |

## The rule in one line

**Controls change colour; clickable cards may rise a hair and take one shadow step; nothing that
is not interactive moves.**

## Per control class

| Class | May change on hover | May not | Press (`active:`) |
| --- | --- | --- | --- |
| Solid button (default / ink / destructive / warning / hand-rolled `bg-primary`) | background to the fill at **90%** (`hover:bg-primary/90`, recipe `--btn-default-hover-bg`) | opacity, translate, scale, shadow, a different grey step | `scale-[0.97]` (Button base) |
| Ghost / outline / secondary / tertiary / icon button | `bg-accent` + `text-accent-foreground`; children inherit colour (`text-current`), never pin their own | translate, scale | `scale-[0.97]` |
| Text link / nav item / footer link | `color` (muted → foreground), underline, `bg-accent` row tint in menus and sidebars | any movement, opacity dimming | — |
| Clickable card (`<a>`/`<button>`/`Card interactive`) | border colour one step, **one** shadow step on its own ramp, rise of `-translate-y-px` / `-translate-y-0.5` (≤ 2px), media inside zoom ≤ 1.03 via `group-hover` | rise > 2px, shadow jumps, scale of the card itself | — |
| Exhibit surface (feature card, console frame, code preview, command box — contains controls but is not one) | border colour, background a few % more opaque | translate, scale, shadow change | — |
| Inline swatch, chip, avatar, calendar cell, emoji | ring or `bg-accent` tint | scale (`hover:scale-110` grew them into their neighbours) | `scale-[0.97]` allowed |
| Affordance reveal (copy icon, row actions, arrow) | `opacity-0 → group-hover:opacity-100`, arrow nudge `group-hover:translate-x-0.5` (≤ 4px) | — | — |

Inline code / command blocks are exhibits; their Copy button is a solid button.

## Properties, durations, easing

- Name the properties: `transition-[background-color]`, `transition-[border-color,box-shadow,transform]`,
  `transition-colors`. **Never `transition-all`** — it animates layout and shadow on any class change.
- Durations come from the four rails (`core.json → duration`, Tailwind `duration-*`):
  colour feedback `duration-micro` (100ms) or the default `duration-flow` (200ms, what a bare
  `transition-*` gets from `--default-transition-duration`); card lift and shadow step `duration-flow`.
  `reveal` / `cinematic` are for entrances, never for hover. No `duration-300`, `duration-[400ms]`.
- Easing from tokens: `ease-out` (→ `--motion-ease-out`) or the default `--ease-brand`. No
  `ease-[cubic-bezier(…)]` — it pins the curve so a Brand Package cannot move it.
- Framer `whileHover` follows the same table: tint or ≤ 2px card rise, no `scale`/`rotate`.

## Shadows

The ramps are `shadow-xs…2xl` (product), `shadow-ambient-sm|md|lg` and `shadow-glass-sm|md|lg`
(marketing / translucent). A hover moves **one step up the ramp its resting shadow is on**: `none →
ambient-sm`, `ambient-md → ambient-lg`, `sm → md`. Changing family on hover, jumping two steps
(`none → shadow-lg`), or an arbitrary `hover:shadow-[…]` is a violation. A `shadow-[0_0_0_1px_…]`
hairline is a border and is exempt. `Card interactive` resolves its step per variant.

## Device and preference

- `hover:` in every app is `@media (hover: hover) and (pointer: fine)` (`recipe.css @custom-variant hover`),
  so Tailwind hovers do not stick after a tap. **Hand-written CSS `:hover` must sit inside the same media
  query** — the guard counts the ones that do not.
- Reduced motion: `base.css` drops `transform` from every transition under `prefers-reduced-motion`.
  Anything that *moves* on hover also carries `motion-reduce:…translate-y-0` / `…scale-100` so the
  position does not jump either.

## Tokens: `--accent` is a hover surface

`--accent` / `--accent-foreground` is the tint a row, tile or ghost button takes under the pointer —
not a brand hue. The Brand Package emitter (`packages/design/tokens/src/brand-package/hover-surface.ts`)
now refuses an accent more than **2:1** from the canvas or whose foreground reads under **4.5:1**, and
derives a canvas tint toward the language's ink instead (6% light, 10% dark). The identity hue has its
own slot, `--brand-mark`. `hover-surface.test.ts` checks every generated skin.

## Benchmarks

- **Vercel (Geist)**: buttons change fill only (`#000 → #383838`-ish, ~90%), 150ms; cards in the
  template gallery change border, no lift; menus tint rows.
- **Linear**: rows and nav items tint; primary button brightens its fill; no element grows; feature
  panels on the marketing site are static exhibits.
- **Raycast**: list rows tint with a selection colour and inverted label; buttons brighten; extension
  cards rise ~2px with a shadow step.

None of the three scales a control on hover or dims a primary action, which is what this contract
encodes.

## Guard

`node scripts/lint-hover-motion.mjs` (in `pnpm lint`) counts, per file: `transition-all`, lifts over
2px, `hover:scale-*` on the element itself, `group-hover` zoom above 1.03, `hover:opacity-<100`, hover
shadow steps off the ramp, raw `ease-[cubic-bezier]`, raw durations in apps (the component library's are
governed by `lint-motion-tokens`), scaling/rotating `whileHover`, and CSS `:hover` outside
`@media (hover: hover)`. `--report --files` prints the breakdown. The allowlist may only shrink; fix a
file on touch and lower its count.

What it cannot see — review it: a hover state on something that is not interactive, children pinning
their colour inside a hover-filled control, and the choice between exhibit and clickable card.

Last reviewed: 2026-10-10
