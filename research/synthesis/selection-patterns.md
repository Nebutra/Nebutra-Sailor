# Selection patterns — the cross-competitor Selection Interaction Matrix

Sources: `research/competitors/<slug>/ux/selection-matrix.md`, `ux/disclosure-matrix.md`, `business/agent.md`.
fal has no canvas selection (O — `fal/ux/selection-matrix.md`) and appears only in the "completed result" row.
Tiers per line; only O/I2 are facts.

## Evidence

### Matrix — one completed image selected

| | Seko | TapNow | Flowith | Lovart | LibTV | fal (result card) |
|---|---|---|---|---|---|---|
| **What appears** | floating toolbar **above** node · generator inspector **under** node (defaults to 图片生成 with the node's prompt) · `+` handles · URL `&nodeId` · chip in agent composer | floating toolbar (type-specific) · title input · generation bar (prompt, model, params, count, cost, Generate) · Reference handle · context chip in agent composer | outline · node toolbar · Follow Up · Add handle · composer expands with a quote token | floating toolbar **above** selection · name+size label · mention chip in composer | **nothing** — node toolbars and form are always rendered; click produces no DOM change (O); right-click menu | chain actions Edit / Upscale / Make Video (▾ alt models) · Favorite · Link character · Add to Collection · Share · Download |
| **Where** | above + below node | above node (toolbar) + inside node (bar) | on node edge + bottom composer | above selection | – | under result |
| **# actions** | ~17 (9 named + ··· 5 + 合成视频 + download + 1) | ~10 visible (Crop / Change Angle / Redraw / Relight / View All / Download / Save to Library / Full Screen) + bar | 8 (Crop · Upscale▾ · Background Removal · Vary▾ · Rerun · Copy · Download · Delete) + colour tags | 10 (7 AI) + ··· 8 + right-click 19 | 6 (context menu) | 9 |
| **Primary** | none highlighted; send in inspector | Generate (bar) | none; Run inside Vary | 快捷编辑 (Tab) first in bar | ▶ on the node (always) | Edit |
| **Inspector?** | node-anchored panel under the node — **not** a side drawer | in-node bar — **not** a side drawer | none | none (O) | none (O) | input card is the page |
| **Tier · evidence** | O · `seko/evidence/canvas.node.image-completed.webp`, `canvas.node.image-overflow-menu.webp` | O · `tapnow/evidence/canvas.node.image.generated-selected.webp`, `canvas.node.text-selected.webp` | O · `flowith/evidence/canvas.welcome.image-node-selected.webp` | O · `lovart/evidence/canvas.image-selected.webp`, `canvas.image-selected.more-menu.webp` | O/I2 · `libtv/evidence/libtv.canvas.image-node-selected.webp`, `libtv.canvas.node-context-menu.webp` | O · `fal/evidence/model.schnell.share.webp` |

### Matrix — other selection targets

| Target | Seko | TapNow | Flowith | Lovart | LibTV |
|---|---|---|---|---|---|
| Nothing (empty pane) | hero + 4 quick-start chips, rail, agent suggestions (O) | dock, header, agent panel; node-specific UI **gone** (O) | title bar, dock, collapsed composer (O) | dock, panel, minimap, hint (O) | dock, top bar; 4 templates + 双击 hint on fresh canvas (O) |
| Blank / configured node (no result) | inspector under node + 上传 pill, ~10 controls, send (O) | same as image: bar + toolbar (O) | prompt node: colour · Copy · Delete · + · Follow Up (O) | generator node: composer under node (参考图 · prompt · size · model · ⚡) (O) | form on node always (O) |
| Text node | 文本生成 tab (O) | toolbar + bar (O) | answer: Rerun · Copy · Edit(paid) · Delete (O) | typography bar: fill · stroke · family · style · ⬇ (O) | 文本 node form (O) |
| Edge | RF a11y: select / delete (O text) | U | RF a11y (O text) | none (no edges) | U |
| Multi-select | marquee + grouping via shortcuts (O, not exercised) | U | tokens accumulate from sequential clicks (O); marquee U | 自动整理 · 创建编组 · 合并图层 · align · arrange · ⬇▾ — **no AI ops** (O) | U |
| Group | shortcut group (O) | Group kind (U behaviour) | editable name (O) | 解除编组 · ⬇ (O) | group node (O) |
| Running job | toolbar available while 排队中 (O) | agent placeholder node (O) | empty answer node (O) | `c-task`: no toolbar (O) | U |
| History / library item | 资产库 import (O) | History: Select → bulk "N selected" · Apply to Canvas · Download (O) | Media History drawer (O) | 生成文件 list (O) | 生成历史 批量操作 (O); 角色库 → sheet + 应用至画布 (O) |
| Right-click on node | U (shortcut panel lists it) | Copy / Paste / Duplicate / Delete / Report (O) | none found (U) | 19 items incl. 发送至对话 · 合并图层 · 自动整理 · 导出 › (O) | 优化工作流布局 · 复制 · 创建副本 · 粘贴 · 删除 · 复制到剪贴板 (O) |
| Right-click on pane | U | Upload / Add Assets / Add Nodes / Utilities / Undo / Redo / Paste (O) | Paste · Organize · zoom (O) | – | 添加节点 popover on double-click (O) |

### Selection → agent-context binding

| | Mechanism | Tier · evidence |
|---|---|---|
| Seko | selected node auto-attached as 图片 chip in the aside composer | O · `seko/evidence/canvas.agent-attach.webp` |
| TapNow | selected nodes → context chips with thumbnail; × removes; replies mention nodes | O · `tapnow/evidence/canvas.node.image.tool-change-angle.webp`, `canvas.agent.generated.webp` |
| Flowith | click = quote token "Focus node …"; tokens accumulate; Setting *Node Interaction Mode: Quote first* | O · `flowith/evidence/canvas.welcome.answer-node-selected.webp`, `settings.node-interaction-options.webp` |
| Lovart | one chip per selected shape; right-click 发送至对话 explicit | O · `lovart/evidence/canvas.image-selected.webp`, `canvas.multi-selected.webp` |
| LibTV | adding a node inserts a locatable chip; `@` picks 工作流/节点/资源; selection itself implicit | O · `libtv/evidence/libtv.canvas.agent-attach.webp` |

### Convergent AI ops offered on a selected image

| Op | Seko | TapNow | Flowith | Lovart | fal chain | Count O |
|---|---|---|---|---|---|---|
| Upscale | 图片超清 ✦6 | – (U) | Upscale▾ | 放大 | Upscale | 4 |
| Crop | 剪裁 (···) | Crop | Crop | 裁剪 (···) | – | 4 |
| Multi-angle / camera | 多角度, 全景 | Change Angle (cube) | – | 多角度 | – | 3 |
| Relight | 打光 | Relight | (home app) | – | – | 2 (+1 app) |
| Inpaint / redraw / erase | 局部重绘, 消除笔 | Redraw (mask), Point to Edit | – | 橡皮工具, 快捷编辑 | Edit | 4 |
| Background removal | – | – | Background Removal | 去背景 | – | 2 |
| To video | 视频生成 tab (首帧/尾帧), 合成视频 | First/Last Frame (video node) | (Video mode) | 动态图片 | Make Video | 4 |
| Vary / batch | 1张 count, 九宫格 | 1×–4× | Vary▾ (mini form) | 数量 1–10 | num_images | 5 |
| Download | ✓ | ✓ | ✓ | ✓ | ✓ | 5 |

## Pattern

1. **No product uses a right-side inspector drawer for selection.** Configuration is anchored to the node (Seko under,
   TapNow inside, Lovart generator node, LibTV always-on form) and actions are a **floating toolbar above the
   selection** (Seko, TapNow, Flowith, Lovart). O-negative in all five for a side inspector.
2. **Deselect removes everything node-specific** (TapNow, Seko, Lovart, Flowith — O); LibTV is the lone always-visible
   design and reads as the densest canvas in the set.
3. **Selection is the agent's context**, automatically (4 O) — the same gesture serves manual tools and the agent.
4. **Toolbar size**: 8–17 controls on an image; two products (Seko, Lovart) split into ~9 named + ··· overflow; Lovart
   lets the user reorder (自定义工具栏, O).
5. **Multi-select is structural, not generative**: the only observed multi-select toolbar (Lovart) offers arrange/group/
   merge/export and no AI ops.

## PARA decision

| Element | Rule | Supporters | Decision |
|---|---|---|---|
| Floating contextual toolbar above the selected node | A | Seko, TapNow, Flowith, Lovart (O) | **A — adopt** as the primary post-selection surface. |
| Generator config anchored to the node (under / inside), not in a side drawer | A | Seko, TapNow, LibTV, Lovart (O) | **A — adopt.** |
| **Right-side Inspector drawer on selection** (PRD: 280–320 px, auto-opens) | — | **none** (O-negative ×5) | **EXPERIMENTAL.** The PRD's inspector contract has no competitor support; the A-supported form is node-anchored. If PARA keeps a drawer, it should hold what no competitor puts on the node (metadata, provenance, versions) — and that content is itself unproven (see `versioning-patterns.md`). Re-decide at IA freeze. |
| Nothing node-specific visible with no selection | A | TapNow, Seko, Lovart, Flowith (O) | **A — adopt** (matches AC-02, AC-06). |
| Selection auto-inserts removable context chips into the agent composer | A | Seko, TapNow, Flowith, Lovart (O) | **A — adopt.** |
| Explicit "send to chat" in the context menu | B | Lovart (O); LibTV `@` node reference (O) | **B — adopt** as a context-menu item. |
| Toolbar: ~8 primary + overflow ··· | A | Seko, Lovart (overflow, O); TapNow, Flowith (≤10 flat, O) | **A — adopt** the cap; overflow at >8. |
| Convergent image ops set: upscale · crop · inpaint/edit · to-video · vary · download | A | ≥4 O each | **A — adopt as the M2 toolbar vocabulary**; multi-angle (3 O) **A**; relight, background removal (2 O) **B**. |
| Multi-select toolbar = structural ops only | B | Lovart (O) | **B — adopt** (PARA has no generative multi-select logic in M1). |
| Selection in URL | — | Seko only | **EXPERIMENTAL** (see `page-topology-comparison.md`). |
| User-customisable toolbar | — | Lovart only (O) | **EXPERIMENTAL**. |
