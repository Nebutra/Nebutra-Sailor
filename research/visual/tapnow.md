# TapNow — visual language

Captures read: `canvas.default`, `canvas.overview`, `canvas.node.text-selected`,
`canvas.node.image.generated-selected`, `canvas.node.image.prompt-filled`,
`canvas.node.image.model-menu`, `canvas.node.image.tool-redraw`, `canvas.node.video.params-menu`,
`canvas.agent.approval`, `canvas.agent.generated`, `canvas.agent.done`, `canvas.agent.composing`,
`canvas.dock.add-node`, `canvas.dock.history.with-item`, `canvas.library.private`,
`canvas.settings.usage`, `app.home`, `app.workspace`, `app.skill-card.canvas`.
Tiers: O = read directly off the image; I2 = strong inference; I1 = weak; U = a still cannot say.

## 1. Surface ladder

Five levels, but compressed into a ~10-point luminance band at the bottom of the range (O,
`canvas.default` + `canvas.agent.approval`):

| Level | Approx. hex / L* | Δ to neighbour | Separated by |
|---|---|---|---|
| canvas page | `#080808`, L*≈3 | — | faint dot grid, ~8% white dots |
| agent panel | `#0d0d0d`, L*≈5 | 2 | **1px vertical hairline only** |
| node / card | `#141414`, L*≈8 | 3 | 1px hairline ≈`#262626` + radius |
| input / composer | `#171717`, L*≈9 | 1 | radius + hairline; no luminance work |
| overlay (menu) | `#1e1e1e`, L*≈12 | 3 | drop shadow, usually no border |

The ladder does almost no work through luminance — every step is 1–3 points (O). Separation is
carried by **hairline + corner radius**, and for overlays by shadow (I2). Values are eyeballed off
the WebP, ±2 points (I2).

## 2. Node / card treatment

- Radius ≈12–14px on nodes and suggestion cards; ≈16px on the composer; fully rounded (pill) on
  every floating control cluster (O, `canvas.default`, `canvas.node.text-selected`).
- Border: 1px, ~10% white. Present on the resting node and on the empty node frame; absent on
  overlay menus (O, `canvas.node.image.model-menu`).
- Shadow: none on canvas nodes. Shadow appears only on floating chrome and overlays (I2).
- Media bleeds fully to the node edge and is clipped by the radius — no inner padding, no frame
  (O, `canvas.node.image.generated-selected` teacup, `app.skill-card.canvas` video pair).
- Resting content card = the image alone. Its identity label (`▣ Video ✓`) sits **above** the node
  in ~12px grey, outside the bounds (O, `app.skill-card.canvas`). Nothing else is drawn at rest.

## 3. Selection expression

- A **1px stroke drawn exactly on the node bounds**, in a desaturated blue ≈`#2f6fd0` / `#3a7bd5`
  (O, `canvas.overview`, `canvas.node.image.tool-redraw`, `canvas.agent.approval`). No offset, no
  outer ring, no glow, no scale change, no fill tint.
- Selection is expressed far more by **what appears than by what is drawn on the node**: a floating
  pill toolbar above (brush / marquee / eraser / size slider / undo / redo), a generation bar below
  (prompt field + `2K` + `x1` + model + cost + send), and a thumbnail chip inside the agent
  composer (O, `canvas.overview`, `canvas.node.image.prompt-filled`).
- Corner handles: not visible in any capture — the stroke is the whole affordance (O; contrast with
  Lovart). Resize affordance therefore U.

## 4. Chrome separation

- There is **no top bar**. The header is three free-floating capsules over the canvas: logo+title
  pill (left), credits `200` + Community + share (centre-right) (O, `canvas.default`).
- Left rail, bottom-left zoom cluster and the help button are likewise floating rounded capsules on
  the same black ground (O).
- The one true divider in the product is the **1px vertical hairline** between canvas and agent
  panel (O, every canvas capture). No shadow, no translucency, no luminance step.
- Drawers (History, Library) are translucent and blurred — the teacup image reads through the
  History panel (O, `canvas.dock.history.with-item`). They replace the rail rather than stacking,
  corroborating `ux/density.yaml`'s "drawers replace the dock rail" note (O).

## 5. Type scale

Five sizes, two weights (O, `canvas.default` + `canvas.settings.usage`):

| Size | Weight | Used for |
|---|---|---|
| ~30px | semibold | the agent question "What are we making today?" |
| ~20px | regular | "Hi <name>!" greeting line |
| ~15px | medium | chrome labels, model names, menu rows, panel headings |
| ~13px | regular | card body copy, agent prose, secondary descriptions |
| ~11px | medium, tracked caps | menu section heads (`Utilities`, `Add Source`), settings groups (`PLANS & CREDITS`), parameter chips (`2K`, `x1`), timestamps |

Smaller-than-body is reserved for **parameters and section scaffolding** — never for content. Cost
badges (`⊛ 15`) also sit at that size (O, `canvas.overview`).

## 6. Accent budget

On the resting canvas (`canvas.default`) the saturated-colour count is **4**: the multicoloured
logo mark (~24px), three ~4px blue dot badges on rail icons, and the soft blue radial wash inside
the composer field. Everything else is greyscale (O).

The primary action is **white, not a hue**: the send button is a white circle with a black arrow,
`Confirm` is a white pill with black text (O, `canvas.agent.approval`). Hue is spent only on
status and novelty — mint-green `NEW` / `HOT` pills ≈`#3ddc97` in the model menu (O,
`canvas.node.image.model-menu`), a green dot before `Confirmed` (O, `canvas.agent.generated`), red
`Sign Out` (O, `canvas.settings.usage`). Blue appears only as selection chrome. Accent is
**reserved and semantic**, never decorative.

## 7. Density and rhythm

- Left rail: ~48px wide capsule, ~44px icon buttons, ~14px vertical gaps (O, `canvas.default`;
  matches `density.yaml` rail ≈48px, O).
- Bottom-left control capsule: h≈44, five icon slots plus an inline zoom slider (O).
- Selection toolbar: h≈44, grouped by thin vertical rules (O, `canvas.overview`).
- Menu rows: h≈44–48, 12px icon-to-label gap, ~14px horizontal padding (O, `canvas.dock.add-node`).
- Agent panel: ~20px side padding; suggestion cards ~16px inner padding, 12px radius, ~16px gutter
  (O, `canvas.default`).
- Node parameter chips: h≈28, ~10px horizontal padding, ~8px gaps (O, `canvas.overview`).
- Settings dialog stat tiles: h≈80, separated by 1px vertical rules, zero gap (O,
  `canvas.settings.usage`).

## 8. Overlay treatment

Two classes (O):

1. **Solid menus** — model list, add-node menu, video params popover, context menus. Flat
   `#1c1c1c`–`#1e1e1e`, radius ~12, drop shadow, no border (or a barely-there one). Reads as
   **paper cut from a darker stock** (`canvas.node.image.model-menu`,
   `canvas.node.video.params-menu`). Segmented controls inside them mark the active segment with a
   lighter fill plus a 1px light stroke — the only "ring" in the product besides selection.
2. **Translucent drawers** — History and the modal settings sheet blur what is behind them (O,
   `canvas.dock.history.with-item`, `canvas.settings.usage`). These read as **glass**.

Floating toolbars and the header capsules sit with the solid class but at full pill radius.

## 9. Iconography

- Outline throughout, uniform ~1.5px stroke, geometric, no duotone (O, `canvas.dock.add-node`).
- ~20px in the rail and dock; ~16px inline beside 14–15px labels — the icon is slightly taller than
  the cap height, so rows read icon-led (O, `canvas.dock.add-node`, `canvas.settings.usage`).
- Monochrome white at ~65–70% opacity, rising to ~100% on the active item, which also gains a
  filled blue-tinted plate (O, `canvas.context-menu` shows the chat rail item active).
- Filled marks exist only for the logo, status dots, and the white send/confirm affordances (O).
- Model rows carry a small brand glyph (banana, chart) at label size, treated as an icon (O).

## 10. Empty and loading states

- **Empty canvas**: pure black, faint dot grid, plus two ghost node frames and free-floating `⊕`
  add affordances — no illustration, no copy (O, `canvas.default`).
- **Empty agent**: greeting + question + two suggestion cards; no illustration (O).
- **Empty library**: bare tree headings, no zero-state art at all (O, `canvas.library.private`).
- **Empty analytics**: five `0` stat tiles, a flat un-shaded heatmap grid, one plain sentence
  (O, `canvas.settings.usage`). TapNow's zero states are consistently *structural* rather than
  illustrated.
- **In-flight generation on the canvas**: the node keeps its blue selection stroke around an empty
  frame; the image area is simply void (O, `canvas.agent.approval`). No shimmer or progress bar is
  visible in the still — whether one animates is U.
- **In-flight in the agent panel**: collapsed step rows read `Worked for 2m25s ›` / `Completed 7
  actions ›`, the approval card exposes model / ratio / resolution / count as editable buttons plus
  `Cancel` and a white `Confirm`, and the composer's send arrow is replaced by a **white stop
  square** (O, `canvas.agent.approval`, `canvas.agent.generated`). An `Outputs` panel lists produced
  files (`No outputs yet` → `project.md`), giving the run a file-system shape (O).
