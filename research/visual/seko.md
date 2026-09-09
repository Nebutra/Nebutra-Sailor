# Seko — visual language pass

Tiers: **O** observed · **I2** strongly inferred · **I1** weak · **U** unknown.
Read from 14 captures at 1440×900. Hex/luminance values are eyeballed off the image and are ±5%.

## 1. Surface ladder

Five levels, separated almost entirely by **luminance**, with borders used only on nodes and inputs.
Deltas are small — 2–4 points of L\* between neighbours (O, `canvas.blank.webp`, `canvas.node.image-completed.webp`).

| Level | Approx hex | L\* | Δ to prev |
|---|---|---|---|
| Canvas / page | `#0a0a0a` | ~4 | — |
| Agent aside, header | `#101010` | ~6 | +2 |
| Floating rail, bottom bar, inspector | `#161616` | ~8 | +2 |
| Card / suggestion row / model chip | `#1c1c1c`–`#202020` | ~11 | +3 |
| Input well (composer, prompt box) | `#1a1a1a` + 1px `#2e2e2e` | ~10 | −1, border-separated |

- The canvas is not flat: a dot grid at ~`#242424` on 20px pitch marks it as the work surface (O, `canvas.blank.webp`).
- Modals invert the ladder: the scrim is ~70% black **and blurs** the page behind it, so the dialog at `#1a1a1a`
  reads as raised despite being only 6 points lighter (O, `canvas.subject-create-form.webp`, `canvas.share-popover.webp`).
- This is a very low-contrast ladder; almost nothing separates panel from page except a hairline
  at x≈940 dividing the agent aside (O, all canvas captures). Corroborates `ux/density.yaml`
  `chrome_ratio_with_agent: 0.42`.

## 2. Node / card treatment

- Node radius ~8px, **1px border, no shadow**. Resting/unselected: `#3a3a3a`. (O, `canvas.blank-node.webp`)
- Media **bleeds to the border** — the generated image fills the node rect edge to edge with no inset,
  no caption inside, no footer (O, `canvas.node.image-completed.webp`).
- The node's label ("图片", "多角度", "空白节点") is a 12px icon+text pair sitting **outside and above**
  the frame, not on a chip (O, `canvas.agent-reply.webp` — two nodes both labelled this way).
- Edges between parent and derived node are 1px orthogonal lines at ~`#3a3a3a`, no arrowheads visible
  (O, `canvas.agent-reply.webp`).
- Content cards elsewhere (skill grid, subject grid) are `#1c1c1c` fills, radius ~8, **no border at all** —
  cover image top, title/meta below (O, `skills.list.webp`, `canvas.subject-library-modal.webp`).

## 3. Selection expression

- **Border luminance swap, in-bounds, 1px, no offset, no glow, no scale.** Unselected node border ~`#3a3a3a`;
  the node carrying the floating toolbar reads ~`#c8c8c8` (I2 — inferred by comparing
  `canvas.blank-node.webp` / `canvas.node.image-completed.webp` against the two unselected nodes in
  `canvas.agent-reply.webp`, which have no visible border over their own media).
- The louder selection signal is **positional, not chromatic**: a 12-item floating toolbar docks above the
  node and the inspector docks below it. The chrome around the node changes, not the node (O,
  `canvas.node.image-completed.webp`).
- Segmented controls select by **light pill**: the active segment gets a `#d8d8d8` fill with dark text
  (O, `canvas.subject-create-form.webp` 角色/本地上传; `canvas.node.video-model-picker.webp` 图生视频).
- Tabs (画布/编辑器, 文本生成/图片生成) select by weight + a subtle `#242424` pill, no underline (O, `canvas.blank.webp`).
- Multi-select / marquee appearance: **U** (shortcut listed in `canvas.shortcuts-dialog.webp`, never exercised).

## 4. Chrome separation

- **Pure spacing plus floating islands.** The header has no border and no shadow; it sits on the page
  colour and is read only by its content (O, `canvas.blank.webp`).
- Left rail (4 buttons) and bottom bar (8 controls) are **detached floating pills** with their own
  `#161616` fill, radius ~20px, inset ~16px from the viewport edge. They overlap canvas content freely —
  the rail sits on top of a node in `canvas.agent-reply.webp` (O).
- The agent aside is the only hairline in the product: a 1px ~`#1e1e1e` vertical rule (O).
- No translucency or backdrop blur anywhere in resting chrome; blur appears only under modals (O).

## 5. Type scale

Four sizes, two weights, in product chrome (O, across all canvas captures):

| Size | Weight | Use |
|---|---|---|
| ~20px | semibold | Agent greeting headline, modal title (添加新主体) |
| ~14px | medium | Header title, tabs, menu items, agent body text |
| ~13px | regular | Toolbar labels, inspector labels, suggestion-card body |
| ~11px | regular | Metadata chips only — `1080P` `4-30s` `音效同出` `支持 10 个参考`, node labels, 排队中 status |

Smaller-than-body is reserved for **model capability metadata and job status** — never for interface labels
(O, `canvas.node.video-model-picker.webp`, `canvas.node.image-submitted.webp`).

## 6. Accent budget

On a resting canvas, **two** saturated elements, and both are commerce, not craft (O, `canvas.blank.webp`):

1. The full-bleed promo banner, spring-cyan ~`#2FF3D6` with black text — ~40px of the 900px height.
2. `开通会员` in amber ~`#F5A524` next to the ✦ credit balance.

Everything else in the resting canvas is neutral: the submit button is a `#3a3a3a` circle, the quick-start
chips are outlined neutral, the rail is grey. The accent returns only for coach-mark CTAs (我知道了, cyan
fill, `canvas.node.image-completed.webp`) and promo badges in the model list (限时钜惠 cyan pill,
`canvas.node.video-model-picker.webp`). Seko's product surface is effectively **monochrome**; the brand
cyan is a marketing layer painted on top of it.

## 7. Density and rhythm

O, measured off `canvas.blank.webp` / `canvas.node.image-completed.webp`:

- Promo banner 40px; header 56px.
- Left rail: 44px circular buttons, ~4px gap, in a 68px-wide pill.
- Bottom bar: 32px controls, ~8px gaps, 8 items in a ~300px pill.
- Floating node toolbar: 12 items, ~32px row height, ~14px horizontal gap, icon+label pairs.
- Inspector: ~16px padding, tab row 40px, prompt area ~90px, control row 36px.
- Agent suggestion cards: ~72px tall, 12px internal padding, 10px gap between cards.
- Quick-start chips: 48px tall, ~24px gaps.

Rhythm is loose on the canvas (large empty margins) and tight inside every panel — an 8px base with
16px panel padding (I2).

## 8. Overlay treatment

Seko runs **two overlay systems side by side**, which is its most unusual visual decision (O):

- **Light popovers** for pickers: the model picker, the `@` subject picker and coach marks are near-white
  `#f0f0f0`/`#e6e6e6` panels with dark text, radius ~10px, soft drop shadow — inverted against the
  near-black app (`canvas.node.image-model-picker.webp`, `canvas.node.at-reference-picker.webp`,
  the 生成历史 coach mark in `canvas.node.image-completed.webp`). These read as **paper**.
- **Dark popovers** for command surfaces: the `···` overflow menu, the `+` add menu and the shortcuts
  panel are `#1c1c1c` with a 1px `#2a2a2a` border and a wide soft shadow, radius ~10px
  (`canvas.node.image-overflow-menu.webp`, `canvas.add-menu.webp`, `canvas.shortcuts-dialog.webp`).
- Modals: `#1a1a1a`, radius ~12px, no border, over a ~70% black scrim that also blurs the page (O).
- None of these read as glass — there is no visible translucency in any overlay fill (O).

## 9. Iconography

- Outline only, no filled icons in chrome; stroke ~1.5px, size 16px, colour ~`#9a9a9a` at rest
  (O, floating toolbar, rail, bottom bar).
- Icons sit **optically equal** to the 13px label beside them — no dominance, no colour.
- Vendor logos in the model picker are the exception: 16px glyph marks, some coloured/emoji-like
  (万相 wordmark, banana glyph) (O, `canvas.node.image-model-picker.webp`).
- Hover/active icon colour: **U** (cannot read from a still).

## 10. Empty and loading states

- **Empty canvas** is not blank: dot grid + a 20px centred headline (开启全新创作之旅), a 13px instruction
  line with a sparkle glyph, and four 48px outlined quick-start chips. The agent aside simultaneously
  shows a greeting plus three prefilled story-idea cards and a 换一批 reshuffle (O, `canvas.blank.webp`).
- **Empty library** is a giant desaturated logo watermark (~64px, `#4a4a4a`) plus two lines of grey copy
  and no CTA (O, `myspace.list.webp`). The import modal's empty state is a bare filter row over dead
  space (O, `canvas.rail-panel-47.webp`). The two empty-state treatments do not share a design.
- **In-flight** is the standout: the node fills with a soft **blurred teal→green gradient haze**
  (~`#123f3a` → `#2e6f66`) at the exact final image dimensions, with 11px centred white text
  `排队中，请稍候` and a cyan `会员加速` upsell link under it. No spinner, no progress bar, no skeleton
  shimmer — a coloured field standing in for the image (O, `canvas.node.image-submitted.webp`).
- Failure appearance: **U** (never triggered).
- Whether the haze animates: **U** — cannot read from a still.
