# UI primitives review: @nebutra/ui and the token layer against Geist, Radix, shadcn

- **Date**: 2026-10-10
- **Scope**: `packages/design/{ui,tokens,design-tokens,theme}`, plus `/showcase` on the design site
- **Method**: same as `2026-10-10-design-site-benchmark.md`. Computed styles were read with Playwright on the design site's 33 component pages and on a probe page that put every control family at every size in one row. Each measurement ran across all nine languages (Factory, Cosmos, GSAP, Linear, Notion, Raycast, Stripe, Vanta, Vercel), in light and dark.

## Measurements, before → after

| Check | Before | After |
|---|---|---|
| Languages where Input, Select, Combobox and Button in one row differ in height | 4 / 9 (GSAP, Linear, Raycast, Vercel: Button 32px next to a 40px Input) | 0 / 9 |
| Languages where that row mixes corner radii | 6 / 9 (Vanta: input 6px, select 6px, combobox 999px, button 999px) | 0 / 9 |
| Button corner varies by size within one variant | yes: outline tiny/sm 4px, default 6px, lg = the card radius (Raycast 16px) | one radius per language |
| Type size at 32px controls | Button 12, Input 12, Select 14 | 14 across the family (Geist, Radix and shadcn all use 14) |
| Alert variant × appearance combinations that paint correctly | 18 / 28 | 28 / 28 |
| Alert two-action composition at 390px | actions 23–33px outside the Alert's box | wraps under the message, no overflow |
| Focusables with no visible keyboard focus (component pages) | 11 (4 Input clear/reveal buttons, 7 slider thumbs) | 0 |
| Overlay surfaces | dialog 6px, 95% see-through, no hairline; popover/menu 6px; select list 12px | dialog `--radius-xl` with hairline; all menus on `--radius-lg` |
| Languages with no opposite mode | 5 / 9 (Stripe, Notion, Vanta stay light; GSAP, Raycast stay dark) | 0 / 9 |
| Muted text below 4.5:1 on canvas, card or muted fill | Factory light 4.32 on canvas; GSAP dark 4.16; Notion light 4.07; Raycast dark 3.53; Vanta light 4.13 | all ≥ 4.5 |

## Ranked defects (all fixed unless marked)

1. **Alert status variants painted nothing.** `bg-[var(--color-success, var(--color-green-500))]` contains a space. Tailwind splits the class there, so both halves are dead classes. There were 12 of them: solid success, info and warning had no fill, and outline success, info and warning had no colour. The `stroke` appearance declared only `text-foreground`, so its 7 variants had no edge. Fixed with the semantic utilities and the `*-strong` ink tokens. New guard: `lint-tw-arbitrary-space`.
2. **The control family was on two ladders.** Button read `--control-height-*`. Input, Select, Combobox, Textarea, Switch and Tabs pinned pixel tables in JS and wrote them inline. Fixed with `tokens/components/control-ladder.ts`: each control reads the token, with the old pixel value as the fallback.
3. **Overlay overrides.** `primitives/overlay.ts` merged after the surface tokens and overrode them. That flattened the dialog: radius, fill and edge all came from the override. The overrides are now no-ops; the export keys are kept.
4. **Keyboard focus was invisible** on Input's clear and reveal buttons, because an inline `outline: none` beats even the unlayered global rule. Slider thumbs had the same problem: a range input is excluded from the global rule, and its thumb is a pseudo-element. Added `rangeThumbFocusClassName`.
5. **Five languages were single-mode.** `modes.light` and `modes.dark` were added. The values come from each brand's published palette and were contrast-checked by script, not measured live from the brands' own sites. This could be refined.
6. **Muted ink below AA.** In light mode, `--muted-foreground` went from `220 2.6% 45.5%` to `220 3.5% 41%`. That gives 5.64:1 on white and 5.39:1 on the canvas, and still 3.1:1 below the foreground ink, so muted text stays visibly secondary. Four languages had their muted role lifted.
7. **Button radius by size** (see the table above).
8. **Close buttons** on Alert and Dialog had a 16px hit target and dimmed by opacity on hover. They are now 24px ghost buttons that take the hover tint.
9. **Select details:**
   - Field labels were forced to Title Case by `capitalize`.
   - The menu separator was drawn in the `muted` surface colour, which was invisible.
   - Select used physical insets where every other control uses logical ones (`start`/`end`, `ps`/`pe`). Input had the same problem.
10. **Tabs and Switch:** the bar measured 42px on a 40px step because of its 1px border. They also had fixed 8/6px corners; these are now concentric radii on `--radius-md`.
11. **`/showcase` (owner: "混乱", chaotic).** It showed 131 demo files in alphabetical order, as 40%-scaled thumbnails that were mostly empty, under mono file names. It now has category bands in catalog order, with a jump list, one card per component (106) with a demo count, a hairline frame, and a centred 55% stage. Comparison image: `scratchpad review-ui/compare-showcase.png`.

## Left open

- **Physical `left`/`right` and `pl`/`pr` classes:** about 220 remain across 46 files outside the controls touched here. Not yet guarded.
- **Size names differ by component:** Button uses tiny/sm/default/lg, Select xsmall…large, Switch small…large. Aliases would keep the API compatible; not done.
- **Long-label Button and Badge** still overflow at 390px. Both are deliberately overflowing states on their demo pages.
- **One showcase demo escapes its card.** A toast demo portals a "Getting started" toast out of its thumbnail.
- **Status-fill button variants** sit just under AA in some new modes. Example: 4.16:1 under Stripe dark.
- **Presets:** the Refero presets for the five dual-mode languages don't contain the new modes. Recompiling a language from its Refero export would drop them.
