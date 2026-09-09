# Lovart — visual language

Captures read: `canvas.reset`, `scratch.new`, `canvas.image-selected`, `…quick-edit`,
`…more-menu`, `…context-menu`, `…download-menu`, `canvas.text-selected`, `canvas.multi-selected`,
`canvas.dock.generate-menu-image`, `canvas.generator-image.model-popover`,
`canvas.float-layer-button`, `scratch.gen-node`, `scratch.gen-node.running`, `scratch.running`,
`home`, `projects.list`, `paywall`.

**Viewport caveat:** 1040×797 CSS at 2× DPR — pixels below are *relative* to that viewport and not
comparable to TapNow's 1440-wide renders; proportions are the load-bearing numbers.
Tiers: O = read off the image; I2 = strong inference; I1 = weak; U = a still cannot say.

## 1. Surface ladder

Lovart is **a light product**, not a dark dashboard — the single most consequential visual fact in
this file (O, every capture). Five levels inside a ~5-point luminance band at the top of the range:

| Level | Approx. hex / L* | Δ to neighbour | Separated by |
|---|---|---|---|
| promo banner | `#DFFF3E`, L*≈94 (chroma-loud) | — | pure hue; it is the only saturated band |
| canvas ground | `#F5F5F4`, L*≈96 | — | — |
| agent panel | `#FFFFFF`, L*≈100 | 4 | **1px vertical hairline only** |
| artboard / card | `#FFFFFF` | 4 above ground | soft drop shadow |
| overlay | `#FFFFFF` | 0 | 1px `#E8E8E8` border **+** shadow |

So the ladder inverts TapNow's: the *work surface* is the darker level and content floats **above**
it in white (O, `canvas.image-selected`, `canvas.reset`). With overlay and card sharing a value,
elevation is carried entirely by **shadow + hairline** (O). The generator node breaks the pattern —
its body is a flat mid-grey `#E5E5E5` placeholder, the darkest non-banner surface on screen (O,
`scratch.gen-node`).

## 2. Node / card treatment

- Canvas artboards: white, **square corners**, no border, soft ambient shadow only (O,
  `canvas.image-selected`). Radius is reserved for chrome, not content; media bleeds fully.
- Generator node: square corners, flat `#E5E5E5` fill, centred grey mountain glyph, 1px blue frame,
  and a **label row outside the top edge** — `▣ Image Generator` left, `1024 × 1024` right, both in
  selection blue at ~12px (O, `scratch.gen-node`, `canvas.dock.generate-menu-image`). TapNow's
  node-as-generator idea drawn as a *placeholder frame with a spec header*, not as a card.
- Project cards: radius ≈10–12, fill `#F2F2F2`, no border, thumbnail bleeds edge to edge; title and
  `更新于 …` date sit **below and outside** the tile (O, `projects.list`, `home`).

## 3. Selection expression

Pure tldraw/Figma convention, not dashboard convention (O, `canvas.image-selected`,
`canvas.text-selected`, `canvas.multi-selected`):

- 1px stroke ≈`#1B75FF` exactly on the bounds, **plus four small square handles** (white fill, blue
  1px stroke) at the corners. Handles sit centred on the corner, half in / half out.
- A label chip above-left in the same blue (`Image 220`, prefixed by a thumbnail glyph) and a size
  readout above-right (`4600 × 2586`) — identity and spec, drawn as chrome, ~12px.
- Multi-select: one blue box plus **1px blue dividers between each child's cell** — the group reads
  as a table, not a lasso (O, `canvas.multi-selected`). Text: same box, and the *unselected* sibling
  frame is a grey dashed rectangle (O, `canvas.text-selected`).
- No glow, no scale, no fill tint, no offset ring anywhere.

## 4. Chrome separation

- The top bar has **no fill and no border** — title, `试用 Lovart 新版本`, credits and avatar sit
  directly on the canvas ground (O, `canvas.reset`).
- Canvas ↔ agent panel: a single 1px hairline, no shadow, 4 luminance points (O).
- Everything else floats as a white rounded capsule with a shadow: the bottom dock (radius ≈16, 10
  tools), the mini-map card, the selection toolbar, the toast (O, `canvas.reset`).
- The layers/history drawer is the exception: opaque white, docked to the left edge, separated by a
  hairline, and it **pushes** the canvas rather than overlaying it (O, `canvas.float-layer-button`).
- The lime promo banner is the only element that separates by colour rather than by elevation (O).

## 5. Type scale

Four sizes, two weights (O, `canvas.reset`, `paywall`, `projects.list`):

| Size | Weight | Used for |
|---|---|---|
| ~34px | medium | modal display headings (`选择您的套餐`, `导出完成`) — dialogs only |
| ~16px | medium/semibold | project title, panel heading `新对话`, Skills chips, dock labels |
| ~14px | regular | menu rows, toolbar labels, agent prose, section body |
| ~12px | regular | node size readout, selection label chip, `更新于 …` dates, keyboard shortcuts |

Smaller-than-body is spent on **spec and shortcut metadata**: dimensions, dates, `⌘C`-style
accelerators right-aligned in grey (O, `canvas.image-selected.context-menu`). One mixed CJK+Latin
stack throughout, no monospace observed except the countdown digits (O).

## 6. Accent budget

Two accents with strictly separate jobs, and **neither is the action colour** (O):

- Acid lime `#DFFF3E` — the promo banner band and one ~14px sparkle badge in the upgrade nudge.
  Two placements, both commercial. It never touches a control.
- Blue `#1B75FF` — selection chrome only, plus a pale blue circular plate on the active dock tool
  (O, `scratch.gen-node` 3D toggle).

Count on the resting canvas (`canvas.reset`): lime banner, black logo mark, blue avatar circle,
black modal button = **4 saturated elements**, one of them the banner. Primary CTA is **black**
(`开始`); the paywall's upgrade buttons are *white outline* pills, neither lime nor blue (O,
`paywall`). Multicolour appears only inside third-party brand glyphs on the Skills chips. Novelty
uses tiny 4px red/orange dot badges, not colour fills (O, `…more-menu`).

## 7. Density and rhythm

Normalised to the 1040-wide viewport; `ux/density.yaml` corroborates the panel numbers (O):

- Agent panel ≈400px ≈ **38% of width**; canvas ≈640px open, ≈831px collapsed (O, density.yaml).
- Bottom dock: h=44, 10 buttons at ~40px pitch, one hairline divider after the third (O).
- Selection toolbar: h≈44, ten controls, icon+label pairs at ~10px gap, ~14px between controls, a
  vertical rule isolating the trailing download control (O, `canvas.image-selected`).
- Menu rows: h≈44, label left / shortcut right, grouped by 1px rules into 5 bands (O,
  `canvas.image-selected.context-menu`).
- Ratio picker: 5-column grid of ~68×68 tiles, 8px gutter, each tile an icon over a 12px label (O,
  `canvas.generator-image.model-popover`).
- Agent panel side padding ≈24; Skills chips h≈40, pill radius, ~12px gaps, ragged two-up flow;
  mini-map ≈200×120 floating bottom-left (O, `canvas.reset` + density.yaml).

## 8. Overlay treatment

One class only: **paper**. White, fully opaque, radius ≈10–12, 1px very light border, a real soft
drop shadow (O, `…more-menu`, `…context-menu`, `canvas.generator-image.model-popover`). No blur, no
translucency, no tint anywhere in the set — the exact opposite of TapNow's solid/glass split. The
font-generator promo card is the only overlay with an image bleed and it still keeps the white body
and the same radius (O, `canvas.reset`); toasts are the same paper with a coloured leading glyph
(O, `scratch.gen-node.running`).

## 9. Iconography

- Outline, ~1.5px, near-black, geometric with rounded joins (O, dock in every canvas capture).
- ~18–20px in the dock, ~16px beside 14px labels — comparable to cap height, so rows read
  label-led rather than icon-led (O, `canvas.image-selected`).
- The selection toolbar pairs **every** icon with a text label (放大 / 去背景 / 橡皮工具 / 图层拆分
  / 编辑文字 / 多角度 / 动态图片), and `ux/selection-matrix.md` records the set as user-customisable
  (O) — the toolbar is wide and wordy by design.
- Filled treatment: logo, active-tool plate, and the black record/stop circle only (O). Credit costs
  ride as `⚡9` / `⚡14` chips beside the actions that spend them (O, `…more-menu`, `…quick-edit`).

## 10. Empty and loading states

- **Empty canvas** (`scratch.new`): a plain field with one centred grey sentence and a *keycap-styled*
  `C` — `输入你的想法开始创作，或按 C 开始对话`. No illustration, no card, no button (O).
- **Empty layers/history drawer**: a grey mountain glyph over `暂无历史记录` — the one illustrated
  zero state in the set (O, `canvas.float-layer-button`).
- **Empty projects**: grey filler tiles with a centred `+`; thumbnail-less projects render as the
  same blank grey tile (O, `projects.list`, `home`).
- **In-flight on the canvas**: the node's image area becomes a flat grey rectangle with a small dark
  `生成中` pill near its bottom edge; the selection frame drops away (O, `scratch.running`). Whether
  the grey shimmers is U.
- **In-flight in the agent panel**: model name + `生成中` + a grey placeholder block matching the
  node, then a status row with elapsed/estimate `00:31 / 2分钟` and a black stop-square replacing
  send (O, `scratch.running`). The explicit ETA is a real differentiator — TapNow reports elapsed
  only, after the fact.
- **Failure**: a white paper toast, top-centre, orange `!` glyph, two lines (`网络不稳定` /
  `请检查网络或尝试刷新页面`) — no colour fill, no canvas-level error state (O,
  `scratch.gen-node.running`).
