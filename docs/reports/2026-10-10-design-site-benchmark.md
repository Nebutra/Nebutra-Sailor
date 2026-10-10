# Design site benchmark: design.nebutra.com against Geist, Radix, shadcn

- **Date**: 2026-10-10
- **Scope**: `apps/design` shell, home, `/tokens/color`, `/components/[slug]`
- **Related**: `docs/design-system/hover-motion.md`, ADR 2026-09-10 frontend constitution

## Why this exists

The owner looked at the first shell redesign (`2da0343d8`) and called it "still a bit ugly". Four
earlier rounds of guessed full-page designs had already failed. This round started from real
competitor captures instead. The references are Vercel Geist (`/geist/introduction`, `/geist/button`,
`/geist/colors`), Radix Themes (getting started, playground), shadcn/ui (home, `/docs/components/button`),
Linear (`/brand`, `/method`), Raycast developer docs and Stripe's Elements Appearance docs. Each was
captured at 1440 and 390 in light and dark. The numbers below come from computed styles, read with
Playwright.

**Primary reference: Geist.** Our tokens already match it (an ink action on a gray-50 canvas, white
cards, hairlines), so it was the cheapest one to match closely.

## Measurements

| Dimension | Geist | Radix / shadcn | Ours, before |
| --- | --- | --- | --- |
| Page title | 40/48, 600, −0.06em | 35/40 500 · 30/36 600 | 30/37.5 on component pages, −0.015em; home 48 at −0.015em |
| Lead | 20/30, `#4d4d4d` (8.4:1) | 16–20, near-black secondary | 16/26, `#717377` muted (4.75:1) |
| Section heading | 24/32, 600, −0.04em | 24/30 500 · 18.75 600 | **16/25.6, 500**. A state heading was the same size as body text. |
| Sidebar item | 14/20 in 40px rows, `#4d4d4d`; active = 5% ink tint, 6px radius | 14/20, near-black | 13/18.85 in 31px rows, `#717377`; active = tint plus a 2px rule |
| Sidebar group | 14/500, ink | 14/500 | 13/500 |
| Header | 64px; brand cell the rail's width, rail hairline continuing up through it | 48–64px | 56px; brand cell not tied to the rail |
| Frame | 1220 column, hairline rails left and right; every section rule runs edge to edge | full-bleed rails | full-bleed, article centred at `max-w-content`; rules stop at the article |
| Preview stage | white on `#fafafa`, 1px `rgba(0,0,0,.08)`, radius 8, 24 padding, a canvas-coloured "Show code" strip | 1px border, radius 18, centred specimen, code strip | `bg-muted/40` wash, **no edge**, radius 12 |
| Section rhythm | full-width hairline between sections, 48px padding | 64–80px spacing | 40px gaps, no rules |
| Labels | sentence case, sans | sentence case | mono, uppercase, 11px (`IMPORT`, `SOURCE`, `REQUESTS`, `LIGHT · MEASURED FINDINGS`, table headers) |
| Home | name + one sentence, then a 2-column bento of hairline cells. Each cell is a visual over a title and one line (479×240, 32 padding). | shadcn: a wall of real component cards | a hero, then a cramped mock dashboard ("sailor-web"), a crude 7-cell "semantic fills" bar, a proof grid and five text cards |
| Colour page | opens on the swatch matrix: label column plus 10 swatches, 40px high, radius 6 | — | opens on two paragraphs and a findings report; scales come after a screen of text |

## Top five reasons it read cheap

1. **No type hierarchy.** On a component page, a section heading (16px) was the same size as body
   copy, and the page title was 30px with almost no tracking. Geist steps 40 → 24 → 16 with tight
   negative tracking. Without those steps, every block reads as equally important.
2. **Washed-out secondary ink at small sizes.** The whole sidebar and every lead were 13–16px in
   `muted-foreground` (45% grey). All three benchmarks set navigation and lead copy in a near-black
   or 30% secondary. A long rail of pale 13px text is what made the site look unfinished.
3. **Surfaces without edges.** Specimens sat on a tonal wash with no border. The mock dashboard
   used the opposite treatment: heavy elevated cards, mixed weights and 11px uppercase stat labels.
   Geist uses one treatment everywhere: a white card, an 8% hairline, an 8px radius, and a metadata
   strip under it.
4. **No structure lines.** Nothing in the page ran edge to edge. Geist frames the column, ties the
   header's brand cell to the rail, and divides sections with full-width hairlines. That grid is
   most of its polish.
5. **The home tried to argue with a fake product screen.** A plausible-but-cramped dashboard has no
   focal point and reads as a template demo. The proof row and the five text cards then repeated the
   sidebar. Geist's home shows each foundation as a picture of itself.

Secondary: mono-uppercase labels used for things that are not code; three header controls and a
footer with no alignment to anything; a "Catches:" paragraph sitting between heading and specimen.

## What changed

- **Shell.** A `max-w-wide` frame with hairline rails from `xl`. 64px header, with the brand cell
  set to the rail's width and its hairline continuing up through the header. Rail items are 14px
  `text-neutral-11` in 32px rows; the current page is a tinted row in full ink. Group labels are
  14/500. The article fills between the rail and the on-this-page column, and its bands cancel the
  column padding so the rules run edge to edge.
- **Page header and sections** (`tokens/_components/primitives.tsx`, used by every foundation and
  pattern page). `text-4xl` with `tracking-display`, lead `text-lg` in `neutral-11`. Sections are
  hairline bands with 48px padding and a `text-2xl tracking-heading` heading. Weight is left to the
  language's `--font-weight-heading`. Panels, mode frames and notes are hairline cards. Tables use
  hairline rows and sentence-case `text-xs` headers instead of zebra stripes and uppercase.
- **Component pages** (`demo-kit` `State`, so all 33 demos). Every state is a band: a 24px
  heading, the note, then a white hairline card with an 8px radius. "Catches" moves into the
  canvas-coloured strip under the stage, where Geist puts "Show code". Specimen labels are sans.
  The header is title, lead, an import code card with a copy button, a provenance strip
  (source / story / import sites), and the derived axes as chips. The light/dark/split control is
  a sticky toolbar band.
- **Home.** Name and one sentence. Then the signature: nine language tiles, each painted in its own
  canvas, ink and action colour; one press re-skins the site. Then a Geist bento of six live
  foundation cells: real `@nebutra/ui` controls, semantic-fill capsules, the lockup on its
  construction lines, 24 real glyphs, the display and mono faces, and three cards on the shadow
  ramp. Each cell carries its build-time stat in the corner. Visuals are `inert` and the title is a
  stretched link, so no controls sit inside an anchor. The mock dashboard (`live-specimen.tsx`) is
  deleted.
- **Colour page.** Opens on a Geist-style matrix: every functional scale as twelve swatches, light,
  then dark. Findings come next, then the full reference tables.
- **Ratchets.** The language menu is now `DropdownMenu` + `DropdownMenuRadioGroup` (the hand-rolled
  `role="menu"` failed `anchored-overlays.test.ts`). `theme-toggle` is marked stable in the UI
  catalog because the header imports it. Twelve arbitrary-typography allowlist entries shrank or
  were removed.

## Left open

- **Linear's muted ink.** The Linear skin sets `--muted-foreground` / `--neutral-11` to `#63676e`
  on `#090a0b` (about 3.6:1), so secondary copy under Linear reads dim. This is a skin token, not
  this site; Linear itself uses `#8a8f98` for secondary text.
- **Pages not yet brought to the band style.** The traps, layers and tokens-overview pages still
  carry mono-uppercase eyebrows inside their own figures. The pattern pages' specimens keep their
  own tonal panels.
- **Heading weight under Factory.** DM Sans at 500 (the brand decision) reads lighter than Geist's
  600. It is the language's choice and was left alone.

Comparison captures (local, not committed): `design-benchmark/compare-{home,button,colour,home-dark,home-390}.png`.
