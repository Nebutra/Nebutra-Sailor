# Flowith — visual language pass

Captures read (19): `canvas.welcome.{fit, prompt-node-selected, add-node-menu,
node-context-menu, image-node-selected, media-history-dock, zoom-menu, title-dropdown,
search-node, knowledge-dock}`, `canvas.new.{empty, composed, sent-t8, failed-node-selected}`,
`canvas.quant.fit`, `home.{default, credits-popover}`, `library.default`, `settings.default`.

**Theme caveat (O):** the brief says the captures are dark. Only part of them are.
`home.*`, `library.*`, `settings.*`, `canvas.new.*`, `canvas.quant.*` are dark; every
`canvas.welcome.*` capture is **light**. `settings.default` shows Theme = *System*, so the
two sets are the same product under two OS settings. Both are described below.

---

## 1. Surface ladder

**Dark (O, `canvas.new.empty`, `home.default`, `library.default`):** four levels, separated
almost entirely by **luminance**, no borders.
page/canvas ≈ `#0a0a0b` (L\* ~4) → sidebar & panel ≈ `#111113` (L\* ~7) → card / node /
composer ≈ `#1b1b1d` (L\* ~11) → overlay/modal ≈ `#1e1e20` (L\* ~12) with a shadow. Deltas
are tiny: roughly 3–4 L\* per step. Library cards (`library.default`) separate from the page
by ~4 L\* and nothing else — no border, no shadow.

**Light (O, `canvas.welcome.fit`):** page ≈ `#f0f1f3`, node card ≈ `#e8ebef` (node is
*darker* than the page — the inverse of the usual light-mode card), floating chrome (dock,
composer, popovers) ≈ `#ffffff` with a soft shadow. Three levels, using **white + shadow for
chrome and a slightly darker fill for content** (I2). Only one hairline appears anywhere: a
~1px `#232325` rule under the dark top bar (`canvas.new.composed`).

## 2. Node / card treatment

- Radius ~10–12px on text nodes, ~8px on image nodes (O, `canvas.welcome.fit` at 25%;
  ~14px at 83% in `canvas.quant.fit`).
- **No border and no shadow at rest, in either theme** — a node is a fill only, sitting flat on
  the canvas; shadow is reserved for *floating chrome* (O/I2, `canvas.welcome.fit` nodes vs.
  the dock pill).
- Media **bleeds to the card edge** — image nodes are the image, clipped to the radius, with a
  translucent caption strip (model name left, date right, ~9px) overlaid on the bottom edge
  (O, `canvas.welcome.fit`, `.title-dropdown` grid).
- Resting text node: a fill, a body paragraph, and a 2-item footer (author avatar + name,
  timestamp) at ~9–11px (O, `canvas.new.sent-t8`).
- Nodes are a consistent ~340px wide with variable height (corroborates `ux/density.yaml`
  `node_widths_px: prompt ~340, answer ~340`) (O).

## 3. Selection expression

- A **1–1.5px violet stroke on the node's own bounds**, no offset, no glow, no scale, no fill
  change (O, `canvas.welcome.prompt-node-selected`, `.add-node-menu` where four nodes carry it
  at once). Colour reads ≈ `#7c6cf0` / indigo-violet — notably *not* the product's blue.
- Selection also summons two things rather than restyling the node: a floating action toolbar
  above (`Copy Content` / `Delete`, plus a five-dot colour swatch row) and a `Follow Up  F`
  pill immediately below (O, same captures).
- Failed nodes: `canvas.new.failed-node.webp` vs `.failed-node-selected.webp` differ only by
  the toolbar appearing — **no error colour, no red border** on the node itself (O).
- The five circles on the selection toolbar are the only colour picker; the active one carries
  a violet ring (O, `canvas.welcome.node-context-menu`).

## 4. Chrome separation

**Pure spacing plus shadow — the chrome does not touch the work surface** (O).
- Top bar: transparent onto the canvas in light mode, no border; in dark mode a single hairline
  (O, `canvas.welcome.fit` vs `canvas.new.composed`).
- Left dock: a **floating pill**, ~60px wide, radius ~18px, white with a soft ambient shadow,
  inset ~16px from the window edge (O, `canvas.welcome.fit`).
- Composer: a floating rounded card (radius ~16) sitting ~20px off the bottom, ~600px wide
  (O, `canvas.new.composed`).
- Docks/drawers (media history, knowledge garden) are opaque panels with a shadow, not
  translucent (O, `canvas.welcome.media-history-dock`, `.knowledge-dock`).
- No blur or glass anywhere I could read (I2 — a still cannot prove absence of backdrop-filter,
  but the canvas content behind the docks is fully hidden, not blurred).

## 5. Type scale

Five sizes in chrome, two weights (regular + medium). No bold, no caps (O).
- ~34 — home hero (`home.default`); "Flow" is a separate **script/italic display face**, the
  only decorative type in the product
- ~20–22 — section / modal title (`settings.default`, `library.default`)
- ~15 — nav, menu rows, body (`canvas.welcome.zoom-menu`)
- ~12–13 — secondary / meta: "Last edit 2026/7/22", `⌘ O` hints
- ~9–11 — node footer meta: model name + date on image nodes (`canvas.welcome.fit`)

Smaller-than-body is used for exactly three things: timestamps, keyboard shortcuts, and the
provenance strip on generated media (O).

## 6. Accent budget

**Very low.** On a resting dark canvas (`canvas.new.empty`) the count of saturated elements is
**zero** — the whole screen is greyscale (O). On `canvas.welcome.fit` (light, populated) the
only non-greyscale chrome is the word "upgrade here" in the credit toast; all other colour is
inside generated imagery (O).

Where accent does appear it is thin and never the same hue twice: the violet selection stroke
(`prompt-node-selected`), a violet `Update` badge (`home.credits-popover`), six small
multicolour glyphs on the home mode chips (`home.default`), and an `Auto · Neo Agent` chip that
is a **black** pill with a white glyph (`prompt-node-selected`).

The primary action (send) is a **black circle in light mode, white circle in dark** — a
neutral, not an accent (O, `canvas.new.composed` vs `canvas.welcome.fit`). Flowith has no
visible brand-colour CTA at all.

## 7. Density and rhythm

- Top bar height ~60px; left dock pill ~60×175px with four ~44px icon targets (O,
  `canvas.welcome.fit`; matches `ux/density.yaml` `title_bar_px: 60`, `left_dock_px: 60`).
- Menu rows ~32px tall, ~12px padding, no dividers except one hairline before a destructive
  item (O, `canvas.welcome.node-context-menu`, `.zoom-menu`); settings rows ~44px with a ~36px
  pill control right-aligned (O, `settings.default`).
- Composer ~60px collapsed / ~180px expanded with token chips; sidebar list items ~56px
  (title 15px + meta 12px) (O, `canvas.new.composed`, `library.default`).
- Toolbar control gaps ≈8px; sidebar section gaps ≈16px (I2).

## 8. Overlay treatment

**Paper, not glass** (O). Every popover, menu, drawer and modal is an opaque fill —
white in light, `#1e1e20` in dark — with radius ~12–16, a wide soft shadow, and **no border**
(`canvas.welcome.zoom-menu`, `.node-context-menu`, `.title-dropdown`, `settings.default`).
Modals sit on a dim scrim (`search-node`, `knowledge-dock`: the canvas behind is darkened but
not blurred); the search modal reads ~820×680 (O, matches density.yaml).

Two overlays can stack — `canvas.welcome.node-context-menu` shows a context menu, the selection
toolbar and the Follow Up pill on screen at once, all at the same elevation, which reads as
clutter (I2).

## 9. Iconography

- Outline only, uniform stroke ≈1.5px, no filled variants in chrome (O, sidebar in
  `home.default`, dock in `canvas.welcome.fit`).
- ~16px next to a ~15px label — icon box roughly equals the label's cap-to-descender box,
  so icons read slightly *larger* than the text (O, `settings.default` sidebar).
- Monochrome, inheriting text colour, at reduced opacity when inactive (I2).
- Exception: the six home mode chips carry small multicolour glyphs, and the app tiles use
  photography — the only place icons carry hue (O, `home.default`).

## 10. Empty and loading states

- **Empty canvas is genuinely empty** (O, `canvas.new.empty`): no dot grid, no origin marker,
  no placeholder card. Just the dock, a credit toast and the composer with
  "Every great idea starts with a single thought…". The only content is a very low-contrast
  wordmark watermark centred in the canvas (~2 L\* above the background).
- A populated light canvas draws connections as **faint dotted/dashed curves**, not solid edges
  (O, `canvas.welcome.fit`).
- Empty dock: "Recent generations will appear here." centred at ~13px grey, no illustration
  (O, `.media-history-dock`). The knowledge base is the exception — an illustration (green
  tulip glyph), a headline and two lines of copy (O, `.knowledge-dock`).
- In-flight generation: the prompt node appears **immediately** as a normal card with
  "Me / Just now" in the footer, and the answer arrives as a separate sibling card
  (O, `canvas.new.sent-t2` → `.sent-t8`). An unfinished image node is a plain empty node fill
  with no spinner or skeleton visible in the still (O, `canvas.welcome.fit`, 4th image slot).
- Whether that empty slot animates (shimmer, progress ring) — **U**, a still cannot say.
- Hover, transition and easing across the board — **U**.
