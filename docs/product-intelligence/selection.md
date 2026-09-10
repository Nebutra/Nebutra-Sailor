# Selection — PARA decision

Last synthesized: 2026-09-08 · Sources: research/synthesis/selection-patterns.md,
research/synthesis/progressive-disclosure.md, research/synthesis/agent-patterns.md,
research/synthesis/versioning-patterns.md, research/synthesis/pattern-matrix.md

Scope: the Selection Interaction Matrix, the floating toolbar, the inspector question, and the selection → agent
composer binding. fal has no canvas selection and appears only as the "completed result" row.

## Evidence

Paths relative to `research/competitors/`.

- Seko · select a completed image → floating toolbar **above** (9 named + ··· 5 + 合成视频 + ⬇), generator inspector
  **under** the node (mode tabs · model · ratio · `@` · count · ✦ · send), `+` handles, `&nodeId` in URL, chip in the
  agent composer; deselect removes all of it — O · `seko/evidence/canvas.node.image-completed.webp`,
  `seko/evidence/canvas.node.image-overflow-menu.webp`, `seko/evidence/canvas.agent-attach.webp`
- TapNow · type-specific floating toolbar (Crop · Change Angle · Redraw · Relight · View All · Download · Save to
  Library · Full Screen) + generation bar **inside** the node (prompt, model, params, count, cost, Generate) +
  Reference handle + context chip with thumbnail in the composer; right-click: Copy / Paste / Duplicate / Delete /
  Report; node-specific UI gone on deselect — O · `tapnow/evidence/canvas.node.image.generated-selected.webp`,
  `tapnow/evidence/canvas.node.text-selected.webp`, `tapnow/evidence/canvas.context-menu.webp`
- Flowith · outline + node toolbar (Crop · Upscale▾ · Background Removal · Vary▾ · Rerun · Copy · Download · Delete),
  Follow Up, Add handle; click = removable quote token in the composer, tokens accumulate — O ·
  `flowith/evidence/canvas.welcome.image-node-selected.webp`, `flowith/evidence/canvas.welcome.answer-node-selected.webp`
- Lovart · floating toolbar above (10; 7 AI; 快捷编辑 first) + ··· 8 + right-click 19 incl. 发送至对话; text node →
  typography bar; multi-select → arrange/group/merge/export, **no AI ops**; one mention chip per selected shape;
  user-customisable toolbar — O · `lovart/evidence/canvas.image-selected.webp`,
  `lovart/evidence/canvas.image-selected.more-menu.webp`, `lovart/evidence/canvas.multi-selected.webp`,
  `lovart/evidence/canvas.text-selected.webp`, `lovart/evidence/canvas.image-selected.context-menu.webp`
- LibTV · **nothing** appears on click — node forms and ▶ are always rendered (implicit selection); right-click 6
  items (优化工作流布局 · 复制 · 创建副本 · 粘贴 · 删除 · 复制到剪贴板) — O/I2 ·
  `libtv/evidence/libtv.canvas.image-node-selected.webp`, `libtv/evidence/libtv.canvas.node-context-menu.webp`
- fal · result card chain actions Edit / Upscale / Make Video (▾) · Favorite · Link character · Add to Collection ·
  Share · Download; post-run "took 0.76 s and will cost …" — O · `fal/evidence/model.schnell.share.webp`,
  `fal/evidence/model.schnell.after-run.webp`
- **Right-side inspector drawer on selection: O-negative in all five canvas products** (Seko under-node panel; TapNow
  in-node bar; Flowith, Lovart, LibTV none).
- Convergent image ops (count O): download 5 · vary/batch 5 · upscale 4 · crop 4 · inpaint/edit 4 · to-video 4 ·
  multi-angle 3 · relight 2 · background removal 2.
- Running-job node selected: Seko toolbar usable while 排队中; Lovart `c-task` has no toolbar — O (diverge).

## Pattern

Converges (≥3): floating contextual toolbar **above** the selection (Seko, TapNow, Flowith, Lovart); generator config
anchored **to the node** (Seko under, TapNow inside, LibTV always-on, Lovart generator node); deselect removes
everything node-specific (TapNow, Seko, Lovart, Flowith); selection auto-inserts a removable chip into the agent
composer (Seko, TapNow, Flowith, Lovart); right-click node menu with copy/duplicate/delete (TapNow, Lovart, LibTV);
toolbar ~8–10 visible with overflow beyond (Seko, Lovart split; TapNow, Flowith flat ≤10); exactly one primary added
on selection (Generate / Run / 快捷编辑).

Diverges: always-on forms (LibTV alone); text-node selection (typography bar in Lovart vs generator tab in Seko/TapNow);
multi-select (only Lovart observed); running-node toolbar (Seko yes, Lovart no); selection in URL (Seko only);
customisable toolbar (Lovart only). No competitor puts metadata, provenance or versions in a side panel — that content
is simply absent as a surface.

## PARA decision

1. **Floating contextual toolbar above the selected node is the primary post-selection surface** — **A** (Seko,
   TapNow, Flowith, Lovart). Cap: **8 visible + `···` overflow**; exactly one highlighted primary (Generate) — **A**.
2. **Toolbar vocabulary for an image (M2)**: Generate/Vary · Upscale · Crop · Edit (inpaint) · To video · Download ·
   Duplicate · Delete, then `···` — **A** for upscale, crop, edit, to-video, vary, download (≥4 O each); multi-angle
   **A** (3); relight, background removal **B** (2 each + PARA model catalogue). M1 skeleton renders the same slots
   disabled.
3. **The inspector question — decided: replace, then demote.** The PRD's auto-opening right Inspector drawer has
   **zero supporters** (O-negative ×5). The A-supported form is **generator config anchored to the node** (Seko under,
   TapNow inside, LibTV on, Lovart generator node) — **A — adopt**: a `NodeConfig` panel rendered under the selected
   node with the tier-1 row (mode · model · summary chip · `@` · count · cost · Generate). Tier-3 params go to a
   labelled **"Advanced" popover** from that row — **B** (LibTV 高级设置, fal "More"). Metadata that a drawer might
   have held (model, params, cost, time, source) becomes an on-demand **Info popover** from `···` — **B** (fal
   post-run metrics, Lovart name+size label, TapNow node retains params). Versions and approval have no evidence
   (versioning.md), so nothing is left for a drawer to hold. **Consequence: the right Inspector drawer is removed
   from the shell contract.** Reviving any side panel later is **EXPERIMENTAL** and needs a named case — the only
   evidenced side panel is LibTV's 资产管理, which is a library, not an inspector.
4. **Nothing node-specific is visible with no selection** — **A** (TapNow, Seko, Lovart, Flowith). LibTV's always-on
   forms are not adopted.
5. **Selection → agent composer: auto-insert a removable chip per selected node, accumulating** — **A** (Seko, TapNow,
   Flowith, Lovart). Chip carries thumbnail + node id; `×` removes; agent replies mention nodes back (B: TapNow, LibTV).
6. **Explicit "Send to PARA" in the node context menu** — **B** (Lovart 发送至对话; LibTV `@` node reference).
7. **Node context menu**: Copy · Duplicate · Paste · Delete · Send to PARA · Download — **A** (TapNow, Lovart, LibTV
   for the structural items). Pane right-click (Paste · Undo · Redo · Add node) — **B** (TapNow, Flowith).
8. **Multi-select toolbar = structural ops only** (align, group, delete, download) — **B** (Lovart + no PARA
   generative multi-select logic). Generative multi-select — **EXPERIMENTAL**.
9. **Text node**: toolbar Edit · Duplicate · Delete · Send to PARA; typography bar — **EXPERIMENTAL** (Lovart only;
   Seko/TapNow treat text as a generator).
10. **Running node**: selectable; toolbar shows Cancel only — **C** for cancel semantics (fal docs; Lovart stop),
    **EXPERIMENTAL** for whether other ops stay enabled while queued (Seko yes, Lovart no).
11. **Selection in URL** — **EXPERIMENTAL** (Seko only). **User-customisable toolbar** — **EXPERIMENTAL** (Lovart only).

## What this changes in the current PRD/shell

- **Keep**: `ContextToolbar` above the selection; `NodeContextMenu`; "Workspace selected" as a golden state; AC-06.
- **Change**: PRD overlay list — replace "Inspector drawer (right, 280–320 px, only when selection)" with
  "NodeConfig panel anchored under the selected node + Advanced popover + Info popover"; design.md "Selection
  auto-opens Inspector; clearing selection closes it" → "Selection reveals ContextToolbar + NodeConfig; deselect
  removes both"; `ActiveDrawer` becomes `"library" | "agent" | "jobs" | null`; AC-02 is rewritten as "no node
  configuration is visible without a selection" (it then coincides with AC-06); the "Workspace selected" golden
  screen is re-captured with the node-anchored form; `ContextToolbar` gets the M2 vocabulary as disabled slots;
  the composer shows a context chip for the selection in the "selected" and "agent running" states.
- **Remove**: `InspectorDrawer` component and its drawer slot.
- **Defer**: typography bar, multi-select, customisable toolbar, selection in URL.

## Open questions

- U · Does node-anchored config under the node scale to video nodes with many params at 1440×900? Closing: PARA M2
  prototype with the LibTV-style compact config chip; measure overlap with neighbouring nodes.
- U · Multi-select with AI ops. Closing: TapNow / Seko authenticated marquee select — is a toolbar offered?
- U · Ops available while a node is queued. Closing: Seko funded run — trigger 图片超清 on a 排队中 node.
- U · Whether any user ever needs metadata beyond the Info popover (the case for a side panel). Closing: M2 usage of
  the Info popover; if opened on > 30 % of selections, revisit as a docked panel experiment.
- U · Text node semantics (typography vs generator). Closing: TapNow authenticated text node with a font control?
