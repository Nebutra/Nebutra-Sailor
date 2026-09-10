# fal.ai — visual language pass

Tiers: **O** observed · **I2** strongly inferred · **I1** weak · **U** unknown.
Read from 12 captures at 1440×900. Hex/luminance values are eyeballed off the image and are ±5%.

**Headline finding (O, every capture):** fal is not a dark dashboard at all. The authenticated product is
**pure light** — white page, white cards, hairline borders, no shadows. The only dark surfaces in the
entire product are the promo bar, one class of button, and the explore hero image.

## 1. Surface ladder

Effectively **two fills and a border**, not a luminance ladder (O, `model.schnell.webp`, `dashboard.webp`):

| Level | Approx hex | L\* | Separated by |
|---|---|---|---|
| Page | `#ffffff` | 100 | — |
| Card / panel | `#ffffff` | 100 | **1px `#e6e6e6` border only** (Δ luminance = 0) |
| Input / textarea | `#ffffff` | 100 | 1px `#d9d9d9` border, slightly darker than card |
| Muted fill (code block, skeleton, chip, selected row) | `#f4f4f5` | ~96 | 4 points |
| Overlay (popover, dialog) | `#ffffff` | 100 | border + a small soft shadow |
| Promo bar | `#2e1065` deep purple | ~14 | absolute inversion |

- Card-on-page separation is **entirely border-driven** — the delta is zero. This is the mirror image of
  Seko, which separates by luminance and almost never by border (O).
- The one place fal uses a filled surface is a *state*: `#f4f4f5` marks the selected nav item, the
  active table row, and skeletons (O, `dashboard.usage.webp`, `assets.webp`).
- Contradicts nothing in `ux/density.yaml`; the recorded `chrome: 0.30` on the model page is visible as
  four stacked hairline-separated bands (promo, nav, model header, tab strip) (O, `model.schnell.webp`).

## 2. Node / card treatment

- fal has no canvas and no nodes. Its unit is a **card**: radius ~8px, 1px `#e6e6e6`, **no shadow at all**,
  white fill (O, `model.schnell.webp` Input/Result cards, `dashboard.webp` getting-started trio).
- Media **bleeds to the card edge**: workflow-template covers fill the full card width with no inset and
  no radius clipping visible on the inner edges; text block sits below with ~16px padding
  (O, `workflows.webp`).
- The Result card's image also bleeds to its own frame but the frame is inset ~24px inside the card (O,
  `model.schnell.webp`) — media is framed at the *result* level, not the card level.
- Dashboard model rows drop the border entirely and use a 1px divider grid, table-style (O, `dashboard.webp`).

## 3. Selection expression

fal never draws a ring around a selected object. Four different, mutually exclusive mechanisms (O):

1. **Underline** — the active model tab (Playground) carries a 2px near-black underline, 100% of label
   width, sitting outside the text bounds (`model.schnell.webp`, `model.schnell.requests.webp`).
2. **Fill inversion** — the active size toggle in Assets is a filled `#18181b` chip with white text
   (`assets.webp` S/**M**/L); the same treatment on primary buttons.
3. **Checkmark, no chrome change** — selected models in the sandbox picker are marked with a right-aligned
   ✓ and a purple-tinted left glyph; the row itself is unchanged (`sandbox.models.webp`).
4. **Focus ring, purple, 2px, outside bounds** — the only ring in the product, on the focused search input
   (`sandbox.models.webp`).

Nav-level selection is a **weight + colour swap plus a 2px underline** in purple (`Generate` in
`sandbox.webp`, `Home` in `dashboard.webp`) (O).

## 4. Chrome separation

- **Hairline borders, exclusively.** 1px `#e6e6e6` under the nav, under the tab strip, down the left
  sidebar in Assets, down the right Entities rail (O, `assets.webp`, `dashboard.usage.webp`).
- No shadow, no translucency, no backdrop blur anywhere in resting chrome (O).
- The one non-hairline separator is the promo bar, which separates by full inversion to `#2e1065` (O).
- Left/right rails are **flush-attached**, full-height, and share the page fill — the opposite of Seko's
  detached floating pills (O, `assets.webp`).

## 5. Type scale

Five sizes, three weights (O, `model.schnell.webp`, `dashboard.webp`):

| Size | Weight | Use |
|---|---|---|
| ~28px | mixed in one string | Model title: `fal-ai/` regular grey + `flux/schnell` **bold black** — the weight break carries the namespace/name split |
| ~24px | bold | Page titles (Dashboard, Workflows, Settings, Request history) |
| ~15px | semibold | Card headings (Input, Result, Getting started, Prompt) |
| ~14px | regular | Body, nav, menu items, form values, prompt text |
| ~11–12px | medium, often coloured | Badges (`Inference`, `Commercial use`, `Partner`, `Early Access`, `Beta`), status chips (`Idle` / `Error`), hint lines (`@ to reference entities.`), page subtitles |

Smaller-than-body is used for **taxonomy and state**: capability badges and job status — the same job it
does at Seko, but here it is also coloured (O).

## 6. Accent budget

On the resting model playground, **six** coloured elements — and they resolve into a deliberate two-tier
system (O, `model.schnell.webp`):

- Purple `#7C3AED` — the **Run** button fill (the only spend action), the active nav underline, the
  slider fill, part of the `Inference` badge glyph, and link text.
- Near-black `#18181b` — `Open in Sandbox`, `Create`, `Upload`, `Edit my input`. Navigational primaries.
- Green `#15803d` — `Commercial use` badge.
- Blue `#2563eb` — informational empty-state headings (`No requests`, `No workflows found!`).
- Pink/red `#e11d48` — `Error` status chip, `Not enough credits`, `Out of credits`.

The rule reads as: **purple is reserved for the one action that costs money; black is for everything else
that is merely important** (I2, consistent across `model.schnell.webp`, `sandbox.webp`, `workflows.webp`,
`dashboard.webp`). Colour outside those two is confined to 11px badges.

## 7. Density and rhythm

O, measured off `model.schnell.webp` and `sandbox.webp`:

- Promo bar 32px; nav 48px; tab strip 44px.
- Buttons 36–40px tall; inputs 40px; the Run button 40px with an inline `⌘↵` hint chip.
- Card padding 20–24px; gap between the two columns 32px; gap between stacked cards 24px.
- Form control stack: label 13px, 8px gap, control 40px, 24px gap to next field (`model.schnell.advanced.webp`).
- Sandbox dock: 3 stacked rows of ~48px in a single bordered card pinned to the bottom, ~370px wide margins.
- fal spends whitespace freely: `model.schnell.requests.webp` leaves ~450px of empty page below a
  two-line empty state. Density is **low by choice**, not by lack of content.

## 8. Overlay treatment

Every overlay reads as **paper**, never glass (O):

- Popovers (`pg.moremenu.webp`, `pg.credits.webp`, `sandbox.models.webp`): white fill, 1px `#e6e6e6`,
  radius ~8px, small tight drop shadow (~`0 4px 12px rgba(0,0,0,.08)`, I2 from the falloff), no blur,
  no translucency, ~4px internal item padding.
- The dialog (`model.schnell.run-attempt.webp`) is a white card, radius ~12px, over a scrim that
  **lightens rather than darkens** — the page behind reads washed-out lavender-white and is blurred.
  A light scrim over a light app is unusual and is fal's most distinctive overlay decision (O).
- Command-menu affordances are spelled out in a footer strip (`↑ ↓ navigate · ↵ select · ESC close`)
  rather than assumed (O, `sandbox.models.webp`).

## 9. Iconography

- Outline only, ~1.5px stroke, 16px, neutral `#52525b` at rest; icons pair with 14px labels at optically
  equal size (O, nav, `assets.webp` sidebar).
- Icons are coloured only when they belong to a badge or a brand: the purple entity glyphs in the sandbox
  model list, the OpenAI/Google/Claude marks in the LLMs menu (O, `sandbox.models.webp`, `pg.moremenu.webp`).
- Empty states use a single 24px outline glyph above the copy, never an illustration (O).
- Hover treatment: **U** — cannot read from a still.

## 10. Empty and loading states

- fal writes **real empty states everywhere**, and they follow one template: 24px glyph → bold headline →
  one grey subline → zero, one or two buttons (O):
  - `sandbox.webp`: "No generations yet / Configure your settings and click Run to start generating" — no button, because the dock below *is* the button.
  - `workflows.webp`: blue "No workflows found!" + `Create a workflow` / `View templates`, followed by a full template gallery under it — the empty state is backed by content.
  - `assets.webp`: "Nothing generated yet" + Upload media / Generate media, with the entity rail showing five `+ Add` dashed tiles at count 0.
  - `model.schnell.requests.webp`: blue "No requests" with filter chrome left fully intact above it.
- **Loading** is grey rounded skeleton bars at `#ececec` that preserve the exact final layout — six stat
  tiles and a chart area, no spinner (O, `dashboard.usage.webp`).
- **In-flight generation on the surface: U.** The Result card carries a status chip next to its heading
  (`Idle`, then `Error`), so the state is a text badge, not a surface treatment — but the account was
  never funded, so `Starting` / `IN_QUEUE` / `IN_PROGRESS` rendering was never observed
  (`model.schnell.run-attempt.webp`, `model.schnell.after-run.webp`). This confirms the `U` already
  recorded in `synthesis.md` §1.
- Error state is in-place inside the Result card: pink icon + heading + grey line + a black
  `Add credits` button, with the pricing line still shown underneath (O, `model.schnell.after-run.webp`).
