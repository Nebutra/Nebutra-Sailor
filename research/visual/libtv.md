# LibLib / LibTV — visual language pass

Captures read (18): `libtv.canvas.{new-project, node-selected, image-node-selected,
node-config-popover, node-model-picker, node-camera-chip, node-context-menu, node-script,
dblclick, dock-add-node, dock-toolbox, dock-gen-history, agent-drawer,
template-shot-breakdown, storyboard-mode}`, `libtv.home.default`, `libtv.art-image-gen`,
`libtv.art-video-gen.settings-popover`. UI is Chinese; type observations are by role, not by string. Two distinct visual systems ship
under one brand: the **LibTV canvas (dark)** and the **LibLib art/home site (light)**. Unless
marked, statements below describe the canvas.

---

## 1. Surface ladder

**Canvas (O, `.new-project`, `.node-config-popover`):** five levels, luminance-led, hairlines
only at the top of the ladder.
canvas ≈ `#0f1010` (L\* ~6, faint dot grid) → node config panel / drawer ≈ `#1a1b1b` (L\* ~10)
→ media placeholder & input well ≈ `#2b2c2c` (L\* ~17) → overlay/menu ≈ `#1e1f1f` (L\* ~12)
**with a ~1px `#333` border and a drop shadow** → chrome pills ≈ `#232424` (L\* ~14). Deltas
run 4–7 L\*, roughly twice Flowith's. Only overlays and pills carry borders; the config panel
attached to a node has none (O, `.node-config-popover`).

**Light site (O, `home.default`, `art-image-gen`):** page `#ffffff`, rail fill `#f5f6f8`, card
`#ffffff` with a hairline, promo banner a saturated `#c9f0f8` cyan — three levels separated by
hairline + shadow rather than luminance.

## 2. Node / card treatment

- Image node = **the media itself**, radius ~8px, wrapped in a ~1px light border (≈`#c9c9c9`
  at ~60% alpha), no padding, no card fill, no footer (O, `.node-selected`). An empty output
  node is a `#2b2c2c` rounded rect with a large centred grey play glyph — a slot, not a card.
- The node's **label sits outside the node, above it** — a ~13px grey caption with a leading
  16px glyph ("首帧" with an image icon, "视频" with a play triangle) — so the node has no
  internal title bar at all (O, `.node-selected`, `.node-script`).
- An "AI生成" provenance chip is stamped inside the media's top-left corner, ~10px, translucent.
- Edges are thin light béziers with a `+` circle handle at midpoint and at each free port; the
  active edge turns **blue** (O, `.node-config-popover`, `.node-model-picker`).
- **The generator config is drawn as a panel docked directly under the node**, same width as
  the node, radius ~12, fill `#1a1b1b`, no border, ~16px padding (O, `.node-config-popover`,
  `.node-model-picker`, `.node-camera-chip`). Its anatomy, top to bottom:
  (1) a chip row — 参考 / 标记 / 特效 / 角色库 / 运镜 — radius-full, ~26px tall, hairline border,
  12px label + 14px leading glyph, ~6px gaps; (2) a reference-thumbnail strip (48px squares
  with a numbered badge); (3) a borderless prompt textarea on the panel fill; (4) a bottom
  control bar: model chip, aspect/res/duration/audio chip, three icon buttons, a **credit cost
  readout `⚡135`**, and a filled circular send button. ~640×230px — as tall as its node (O).
- Node *settings* (比例 / 清晰度 / 生成音频 / 生成数量) open **as a translucent dark scrim over the
  node's own body**, not a floating popover — the placeholder dims and the option grid draws on
  top of it (O, `.node-config-popover`).

## 3. Selection expression

- A **1px near-white hairline on the node's own bounds** — no offset, no glow, no scale
  (O, compare `.image-node-selected` unselected media edge with `.node-selected`).
- Selection is expressed far more by **what appears** than by the ring: `+` port handles left
  and right, a dimension readout (`1536 × 2048`) above the top-right corner, and the config
  panel unfolding beneath the downstream node (O, `.node-config-popover`).
- No accent-coloured selection at all — the only selection-adjacent colour is the blue edge of
  a live connection (O, `.node-model-picker`). Whether the ring animates in — **U**.

## 4. Chrome separation

The chrome is **a set of discrete floating pills over the canvas; there is no bar** (O,
`.new-project`).
- Top: two clusters of individually rounded pills (radius-full, ~30px) — left = logo,
  workspace, canvas name, two icon buttons; right = sync dot, seats, share, credits, avatar,
  team, Agent. No background strip, border or shadow behind them.
- Bottom: one **floating dock pill**, radius-full, ~56px tall, ~340px wide, eight ~32px icon
  targets, centred (O; matches `density.yaml` "bottom dock ~56px floating"). Bottom-left, an
  unenclosed status row (资产管理, three icons, zoom %) sits directly on the canvas.
- The Agent drawer is the exception: a full-height opaque right panel with a **hairline left
  border**, shrinking the canvas rather than floating over it (O, `.agent-drawer`;
  `density.yaml` records chromeRatio jumping 0.08 → 0.35 when it opens). No translucency or
  blur is readable on any panel (I2 — content behind panels is fully occluded).

## 5. Type scale

Five sizes, two weights (regular + medium); no bold, no caps (O).
- ~18 — modal / drawer title (`.dock-gen-history`)
- ~14 — chrome labels, menu rows, quick-start card labels (`.new-project`, `.node-context-menu`)
- ~13 — node label above the node, chip labels, empty-state hint (`.node-config-popover`)
- ~12 — meta: dimension readout, tab counts, `⌘C` hints, zoom % (`.node-model-picker`)
- ~10–11 — version / status badges `SD 2.5`, `NEW`, `Beta`, `限时 42 折` (`.dock-add-node`)

Smaller-than-body is reserved for four jobs: machine facts (dimensions, credits, zoom),
keyboard shortcuts, model-version badges, and commerce badges (O).

## 6. Accent budget

**High — markedly higher than a default dark dashboard, and spread rather than reserved.**
Saturated elements on a *resting, empty* canvas (`.new-project`, O): **nine** — green sync dot,
blue seat-count glyph, cyan panel-toggle icon, orange 开通会员 pill with a red `限时 42 折` badge
inside it, green avatar with a red unread dot, cyan `团队` chip, and four quick-start cards each
with a saturated 32px icon tile (olive `#7b8b52`, coral `#e8544a`, steel blue, purple gradient)
plus two cyan `SD 2.5` badges.

Coach-mark tooltips are a bright **cyan `#7fe8e0` with dark ink** — the loudest thing on the
screen, used twice in a row (O, `.node-config-popover`, `.node-model-picker`). Commerce accent
(orange/red) is persistent chrome, in every canvas capture (O); the primary send action, by
contrast, is a **plain white filled circle**, quieter than the commerce chips beside it. The
light site spends more still: a full-width cyan promo banner, a pink countdown pill,
orange/blue/red nav chips, a saturated content grid (O, `home.default`, `art-image-gen`).

## 7. Density and rhythm

- Top bar band ~48px, pills ~30px inside it; dock 56px pill, 32px icon buttons, ~8px gaps
  (O, `.new-project`; matches `density.yaml` "top bar 48px").
- Config-panel chips ~26px tall, ~6–8px gaps, ~10px padding; panel padding ~16px; node-to-panel
  gap ~16px (O, `.node-config-popover`). Menu rows ~36px with ~14px padding, right-aligned
  shortcut column, hairline dividers every 2–4 items (O, `.node-context-menu`).
- Node-to-node horizontal gap ~100px at 100% zoom (O, `.node-selected`); gen-history modal
  ~1290×745, inset ~72px, radius ~12 (O, `.dock-gen-history`).

## 8. Overlay treatment

**Solid, bordered — closer to a native menu than to paper or glass** (O). Fill `#1e1f1f`,
radius ~12, a ~1px `#333` border *and* a drop shadow, hairline section dividers, right-aligned
`⌘` shortcuts (`.node-context-menu`, `.dock-add-node`, `.dock-toolbox`); a search field appears
in the header when the list is long. Two exceptions: the **node settings scrim** (§2) is
genuinely translucent — the play glyph reads through it — the only translucent surface in the
product (O, `.node-config-popover`); and the gen-history modal is a near-full-screen sheet on a
dim scrim (O, `.dock-gen-history`). Overlays open *anchored to their trigger* and frequently
overlap nodes; unlike Flowith they darken what is beneath rather than sitting clear of it (I2).

## 9. Iconography

- Outline, stroke ≈1.5px, monochrome grey `#9aa0a0`, ~16px beside a ~14px label — icon box
  slightly exceeds the label's cap height (O, `.dock-add-node`, `.node-context-menu`). Dock
  icons ~20px, same weight, brightening to near-white when active — no pill, no underline (O,
  `.dock-toolbox`).
- Node labels take a **filled** 14px glyph (image, play) — the one weight inconsistency I can
  see (O, `.node-selected`). Template tiles are the opposite register: 32px filled rounded
  squares in saturated colour with a white glyph (O, `.new-project`).

## 10. Empty and loading states

- **Empty canvas is furnished, not blank** (O, `.new-project`): a faint dot grid, a centred
  cursor glyph with the hint "双击画布 自由生成节点", and a row of four saturated template cards
  (~236×48) beneath it — the strongest single contrast with Flowith's blank canvas.
- Empty sub-node: a centred outline glyph (scissors), one grey line of copy, then a **list of
  four suggested actions with icons** — an empty state that doubles as a launcher
  (O, `.node-script`). The empty history modal, by contrast, is one centred 13px grey line with
  no illustration (O, `.dock-gen-history`).
- In-flight generation: the output node **stays a grey `#2b2c2c` placeholder**; the change is
  in the config panel's send button, which swaps the arrow for a ring/spinner while a cyan
  tooltip points at it (O, `.node-model-picker`). No progress bar, percentage or skeleton on
  the node itself in any capture I opened. The top bar's sync chip flips 已同步 (green dot) →
  同步中 (grey) during work — job state is reported in chrome, not on canvas (O).
- `.storyboard-mode` captured mid-load: chrome pills present, canvas empty, no skeleton — a
  route transition shows **nothing** rather than a placeholder (O). Timing, easing, hover — **U**.
