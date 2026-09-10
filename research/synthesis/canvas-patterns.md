# Canvas patterns — node as unit of work, result placement, edges, persistence, views

Sources: `research/competitors/<slug>/business/generation.md`, `business/persistence.md`, `domain/objects.yaml`,
`ux/patterns.md`, `synthesis.md`. Tiers per line; only O/I2 cited as facts.

## Evidence

### Node as the unit of work

| Competitor | Engine | Node kinds (O) | Node holds | Tier · evidence |
|---|---|---|---|---|
| Seko | React Flow | 空白 → 文本/图片/视频/音频, derived (多角度…), 合成视频 | generator config (mode tabs, model, params, `@`主体, count, ✦) **and** the result; inspector anchored under the node | O · `seko/evidence/canvas.blank-node.webp`, `canvas.node.image-completed.webp` |
| TapNow | React Flow | Text, Image, Video, Audio, 3D, Image Editor, Timeline Editor, World, Group, Upload | prompt (TipTap) + model + params + 1×–4× + Generate + cost **and** the output; in-node tools (Change Angle, Relight, Redraw) | O · `tapnow/evidence/canvas.node.image.generated.webp`, `canvas.node.image.tool-redraw.webp` |
| Flowith | React Flow tree | prompt, answer, image, video-prompt, step-label, document, sandbox-preview, follow-up-draft, free text/upload | prompt node and answer node are **separate**; answer node = job container + result; config lives in the bottom composer / Vary mini form | O · `flowith/evidence/canvas.new.sent-t8.webp`, `canvas.welcome.image-vary-menu.webp` |
| Lovart | tldraw | `c-image`, `c-generator`, `c-video-generator`, `c-task`, text, group | generator node has its own composer (质量/尺寸/数量/22 models/⚡); result is a **separate** `c-image` shape (placeholder-swap) | O · `lovart/evidence/canvas.dock.generate-menu-image.webp`, `scratch.gen-node.done.webp` |
| LibTV | React Flow | 文本, 图片, 视频, 智能剪辑, 导演台, 逐帧拉片 (template), 音频, 脚本, 素材库, group | prompt + model chip + mode chip + compact config chip + chips (参考/标记/特效/角色库/运镜) + 高级设置 **and** the result (AI生成 badge) | O · `libtv/evidence/libtv.canvas.node-video-ref.webp`, `libtv.canvas.node-config-popover.webp` |
| fal | none | model page = one form; `?fromOutput=` chain | input card \| result card | O · `fal/evidence/model.schnell.webp` |

**Generator + artefact in one node**: TapNow, LibTV, Seko — 3 O (Seko's first generation types the blank node in
place, label 空白节点 → 图片, id uuid → snowflake). **Generator and artefact separated**: Flowith (prompt/answer pair),
Lovart (generator shape / image shape).

### Where a derivation goes

| Competitor | First generation | Derived / re-generation | Link to source | Tier · evidence |
|---|---|---|---|---|
| Seko | replaces blank node in place | **new child node + edge to the right**, source untouched (多角度, 故事推演, 图片超清, 画面切分, 合成视频) | edge; node label = operation | O · `seko/evidence/canvas.node.multiangle-submitted.webp`, `canvas.node.action-multiangle.webp` |
| TapNow | renders in the same node | manual regenerate in the **same node** (bar remains; prior outputs in History — I2); in-node edits (Redraw) in place; **agent** derivation = new node + edge | edge (agent), Reference handle | O · `tapnow/evidence/canvas.agent.generated.webp`, `canvas.node.text-selected.webp` |
| Flowith | answer node created with the prompt | Vary / Follow Up → **new child/sibling nodes**; Rerun on node (I2 new node) | dashed parent→child edge; lineage token "Follow-up with N nodes" | O · `flowith/evidence/canvas.welcome.follow-up.webp` |
| Lovart | `c-task` placeholder → swapped by `c-image` | quick edit / toolbar AI ops → new top-level shape (I2 from one observed run); no edge | `meta {threadId, actionId, …}` on the shape, invisible on canvas | O · `lovart/evidence/scratch.running.webp`, `scratch.done.webp`; raw `canvas.populated.shapes.json` |
| LibTV | result fills the same node | 生成数量 1/2/4 variants on the node (display U); results re-enter via 从生成历史选择 | edge 首帧 → 视频 as **input** reference | O · `libtv/evidence/libtv.canvas.template-shot-breakdown.webp` |
| fal | result card | Edit / Upscale / Make Video open **another model page** with `?fromOutput=<requestId>` | request id | O · `fal/evidence/model.schnell.share.webp` |

Source is never overwritten by a derivation: Seko, Flowith, TapNow-agent, Lovart, fal — **5 O**. Derivation is
*linked* to its source on the canvas: Seko, Flowith, TapNow — **3 O**.

### What edges mean

- **Provenance** (parent produced child): Seko (O), Flowith (O), TapNow agent edge (O).
- **Input / reference** (this node feeds that node): TapNow Reference handle + "Wire is the Logic" (O), LibTV 首帧 image →
  video node (O), Seko left/right `+` handles on nodes (O, not exercised).
- Both meanings coexist in TapNow and Seko. Lovart has no edges (O). Edge deletion exists via React Flow a11y in Seko,
  TapNow, Flowith (O text; not exercised).
- Edges can be hidden: TapNow "Hide node connections", LibTV edge hiding (O).

### Persistence boundary

| | Autosave | Reload restores | Indicator | Client-only | Tier · evidence |
|---|---|---|---|---|---|
| Seko | continuous server | nodes, edges, per-node config, images, in-flight job completed while away | none | – | O · `seko/evidence/canvas.reloaded.webp` |
| TapNow | continuous server | nodes incl. an image node's **Redraw sub-mode** | none | – | O · `tapnow/evidence/canvas.node.image.tool-redraw.webp` |
| Flowith | continuous server | nodes, edges, comments, share state, **viewport zoom**, a draft node, a failed node | none | last mode, preferred model, model cache | O · `flowith/evidence/canvas.welcome.reloaded.webp`, `canvas.new.reloaded.webp` |
| Lovart | continuous server | shapes, threads, title; **plus** camera, selection, sub-mode, open popovers, collapsed panel (client) | 更新于 bump | 画布历史 snapshots (I2 browser-local) | O · `lovart/evidence/scratch.reloaded.webp`, `canvas.canvas-history.webp` |
| LibTV | continuous server | nodes | explicit `待同步 / 同步中 / 已同步` | – | O · `libtv/evidence/libtv.canvas.new-project.webp` |

Continuous server autosave with no Save button: **5 O**. Explicit sync indicator: LibTV only (O). Client UI state
(camera/selection) restored: Lovart (O), Flowith zoom server-side (O).

### Views over one graph

- LibTV: 工作流 (node view) ↔ 故事板 (type-grouped columns with DnD) render the **same nodes**; toggle does not change
  the URL (O — `libtv/evidence/libtv.canvas.storyboard-mode.webp`, `libtv.canvas.workflow-mode.webp`).
- Seko: 画布 / 编辑器 tabs; 编辑器 inert on an image-only canvas (O — `seko/evidence/editor.initial.webp`); I2 that it is
  a timeline for compositions.
- TapNow: Timeline Editor (Beta) is a **node** that opens elsewhere (U). Flowith, Lovart: single view (O).

### Canvas furniture (all O)

| | Minimap | Auto-layout | Grid snap | Groups | Multi-select | Node context menu | Empty-state quick starts |
|---|---|---|---|---|---|---|---|
| Seko | ✓ | 自动布局 | ✓ | shortcut | marquee (shortcut) | U | 4 chips |
| TapNow | ✓ | – | snap | Group kind | U | Copy/Paste/Duplicate/Delete | palette |
| Flowith | – | Organize ⌘O | – | Group (agent) | U | none found (U) | – |
| Lovart | ✓ | 自动整理 ⇧A | – | ✓ | ✓ (arrange/group only) | 19 items | hint + skills |
| LibTV | ✓ | 优化工作流布局 | ✓ | ✓ | U | 6 items | 4 templates + 双击 |

## Pattern

- The **node is a job slot with a result**: it carries its own generator state, price, status and output. Two products
  split prompt from answer (Flowith) or generator from image (Lovart), but even they keep the generator on the canvas.
- **Derivation grows the graph rightwards/downwards**; nothing is destroyed. The graph itself is the history.
- **Edges are both provenance and wiring**; products do not distinguish them visually.
- **Persistence is silent and total** — including in-flight jobs (Seko) and failed nodes (Flowith). Nobody asks to save.
- **A second view over the same nodes** is proven once (LibTV storyboard) and hinted once (Seko 编辑器).

## PARA decision

| Element | Rule | Supporters | Decision |
|---|---|---|---|
| Node = generator state + result (one node type can be "empty/configured/running/done") | A | Seko, TapNow, LibTV (O); Lovart generator node (O) | **A — adopt.** M1 node schema should carry `generator?` (model, params, refs, price) alongside `asset?`, even though real generation is a non-goal. |
| Derivation never overwrites the source | A | Seko, Flowith, TapNow, Lovart, fal (O) | **A — adopt.** |
| Derivation = new node linked by an edge to its source | A | Seko, Flowith, TapNow (O) | **A — adopt** as the node-schema relation (`sourceNodeId` / edge). PRD lists "graph edges" as an M1 non-goal for *rendering*; the data relation should still exist so M2 does not migrate. |
| Edge doubles as input reference (wire) | A | TapNow, LibTV, Seko handles (O) | **A — adopt the meaning**; rendering deferred with edges. |
| Continuous server autosave, no Save button | A | Seko, TapNow, Flowith, Lovart, LibTV (O) | **A — adopt.** |
| Explicit sync indicator | — | LibTV only (O) | **EXPERIMENTAL** (cheap; PARA has no evidence either way). |
| Restore camera + selection on reopen | B | Lovart (O), Flowith zoom (O) | **B — adopt** (viewport restore); selection restore **EXPERIMENTAL**. |
| Regenerate in place (node holds N outputs) vs new node | — | TapNow in-place (O) vs Flowith new node (O); Seko I2 | **EXPERIMENTAL** — allow `outputs[]` on a node so either can be rendered later. |
| Two views over one graph (`?view=storyboard`) | B | LibTV (O); Seko 编辑器 (I2) — PARA's storyboard/timeline logic supports it | **B — adopt for storyboard** as a view over the same nodes, not a second document. `timeline`/`viewer`: **EXPERIMENTAL**. |
| Placeholder node appears at submit time (occupies the result slot) | A | Lovart `c-task` (O), Flowith empty answer node (O), TapNow agent "Generate Image" node (O), Seko blank→queued node (O) | **A — adopt**: a running job is a node on the canvas from the moment of submit (see `job-patterns.md`). |
| Minimap, auto-layout, groups | A | 4/5 each (O) | **A — adopt** post-M1 (PRD skeleton has pan/zoom/select/move/delete only). |
| Multi-select semantics | — | Lovart only (O: arrange/group/merge, no AI ops) | **EXPERIMENTAL**. |
