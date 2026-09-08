# Versioning — PARA decision

Last synthesized: 2026-09-08 · Sources: research/synthesis/versioning-patterns.md,
research/synthesis/canvas-patterns.md, research/synthesis/production-loop-comparison.md,
research/synthesis/pattern-matrix.md

Scope: history of outputs vs whole-document snapshots vs per-object versions; undo/redo; compare and promote are
decided in generation.md and only referenced here.

## Evidence

Paths relative to `research/competitors/`.

- Seko · no per-object versions, no snapshots (O-negative); history = the graph (derived child + edge, node label =
  op) + 生成历史 that keeps assets after node deletion; undo/redo shortcuts; 发布作品 with 公开画布 is the only
  release step — O · `seko/evidence/canvas.shortcuts-dialog.webp`, `seko/evidence/canvas.share-popover.webp`,
  `seko/evidence/canvas.node.action-multiangle.webp`
- TapNow · no version stack found (U); in-node regenerate keeps prior outputs in the History drawer (I2); Undo / Redo
  shortcuts and pane menu; Fork conversation; Good / Bad on replies; Share-by-link = copyable template; node retains
  prompt/model/params — O · `tapnow/evidence/canvas.dock.history.with-item.webp`, `tapnow/evidence/canvas.context-menu.webp`,
  `tapnow/evidence/canvas.header.share.webp`
- Flowith · no versions (U); version strings only *inside* agent-authored documents; dashed parent→child edges and a
  lineage token ("Follow-up with N nodes"); siblings side by side; undo U — O · `flowith/evidence/canvas.welcome.follow-up.webp`,
  `flowith/evidence/canvas.welcome.fit.webp`
- Lovart · no per-object versions (O-negative); **画布历史** = whole-canvas snapshots (time · 保存/打开 · N 个元素 · KB ·
  恢复), **browser-local** (I2); 图层 drawer has a 历史记录 stub; undo/redo in the logo menu; shape meta carries thread/
  action ids but no prompt/model/seed — O · `lovart/evidence/canvas.canvas-history.webp`,
  `lovart/evidence/canvas.float-layer-button.webp`, `lovart/evidence/canvas.brand-menu.webp`
- LibTV · no versions (O-negative); published projects are **frozen read-only copies**, 复制项目 makes an independent
  project; 生成历史 rating filter; 从生成历史选择 re-imports; member attribution — O ·
  `libtv/evidence/libtv.canvas.dock-gen-history.webp`, `libtv/evidence/libtv.tvshow.detail.webp`
- fal · request-shaped: Requests tab + Recent History with 30-day payload retention; `request_id` is the provenance
  key (`?fromOutput=`, `?share=`); Favorite / Collections; Examples = curated prior requests — O / O-doc ·
  `fal/evidence/model.schnell.requests.webp`, `fal/evidence/dashboard.recent-history.webp`,
  `fal/evidence/model.schnell.share.webp`
- Counts: per-object version stack **0/6** (O-negative Seko, Lovart, LibTV; U TapNow, Flowith) · whole-document
  snapshot with restore **1** (Lovart, I2 local) · output history **6/6** · undo/redo **3** (Seko, TapNow, Lovart) ·
  provenance on the artefact **5** · share as copyable template / publish with process **4** (TapNow, LibTV, Seko,
  Flowith) · lightweight judgement **5**.

## Pattern

Converges (≥3): **history is the graph plus the output list** — derivations are new nodes beside their sources, and a
dated list of outputs survives node deletion; **undo/redo** is the only in-document time travel; provenance rides on
the object (edge, retained params, meta, request id), not in a lineage view; sharing is "publish a frozen copy or a
clonable template", which is the closest thing to a release.

Diverges: whole-canvas snapshots (Lovart only, local); rating as a history filter (LibTV) vs thumbs on replies vs
favourites; version strings exist only as content inside documents (Flowith). No competitor exposes a per-object
version stack, a diff, or a promote step.

## PARA decision

1. **No per-object version stack.** History = the graph (derived child nodes + edges) + the Library `Generated`
   list — **A** (negative: O-negative Seko, Lovart, LibTV; U TapNow, Flowith; fal request-shaped). PRD "version
   branches" stays a non-goal; there is no Versions tab anywhere (the Inspector that might have hosted it is removed —
   selection.md).
2. **Undo / redo on the document** (node move, add, delete, config edits) — **A** (Seko, TapNow, Lovart). Generation
   results are *not* undone: undo removes the node, the asset stays in `Generated` — **B** (Seko assets outlive nodes,
   TapNow History keeps prior outputs).
3. **Provenance on the node** (`sourceNodeIds`, `jobId`, `threadId`, retained `generator`) is the lineage record; no
   separate lineage view — **A** (Seko, TapNow, Flowith, Lovart, fal).
4. **Output history**: dated, type-filtered, outlives node deletion, re-importable — **A** (6/6; re-import B: LibTV,
   TapNow).
5. **Whole-document snapshots with restore** — **EXPERIMENTAL** (Lovart only, I2, browser-local). Deferred. If added,
   the evidenced shape is a full-screen list of timestamped canvas states with 恢复, not a branch tree. The server-side
   document revision counter (`WorkspaceDocument.version`) is an engineering safety net for autosave conflicts, not
   a user-facing feature, and is not decided here.
6. **Compare** — **EXPERIMENTAL**, **approve / promote** — **EXPERIMENTAL** (generation.md decisions 6–7). One-bit
   judgement — **A**, post-M1 (generation.md decision 8).
7. **Publish a frozen copy / share as a copyable template** — **A** (TapNow, LibTV, Seko, Flowith), post-M1 (P4
   surface). This — not versioning — is the evidenced "release" step.
8. **Branching a workspace** (fork the document) — **B** (LibTV 复制项目, TapNow Fork conversation + copyable project,
   Seko 公开画布 clone) as a *whole-document* copy, never a per-node branch; post-M1.
9. **What PARA defers until evidence**: per-node versions, diff view, named milestones, "final" flag, snapshot
   timeline. The closing evidence would be a competitor shipping any of them or a PARA design-partner loop that cannot
   be served by graph + history + star.

## What this changes in the current PRD/shell

- **Keep**: "version branches" as a non-goal; undo/redo (editor-store), currently unspecified in M1 → add as an M1.5
  item since it is A-supported and cheap on a zustand document store.
- **Change**: design.md states explicitly that there is no Versions tab, no snapshot UI and no diff; `editor-store`
  gains an undo/redo stack over document mutations (not over jobs); the Library `Generated` list is the history
  surface and must not delete an asset when its node is deleted.
- **Remove**: any planned "History" or "Versions" section for the removed Inspector.
- **Defer**: snapshots, fork/clone workspace, publish, judgement action.

## Open questions

- U · TapNow: does a regenerated node keep a per-node output stack (the only candidate for per-object versions)?
  Closing: TapNow authenticated run — regenerate twice, open History and the node.
- U · Lovart 画布历史 — server or browser-local, and does 恢复 replace or fork? Closing: Lovart authenticated run —
  save a snapshot, clear site data, reload; then 恢复 and inspect the project list.
- U · Flowith undo/redo. Closing: authenticated ⌘Z after moving a node.
- U · Whether PARA reviewers need a diff between two storyboard states. Closing: M2 storyboard prototype with design
  partners; count requests for "what changed".
