# Versioning patterns — history vs versions vs snapshots; compare; undo/redo

Sources: `research/competitors/<slug>/synthesis.md` §8, `business/production-loop.md`, `business/persistence.md`,
`ux/patterns.md`. Tiers per line; only O/I2 are facts.

## Evidence

| | Per-object versions | Whole-document snapshots | Output history | Undo / redo | Compare surface | Approve / promote | Provenance key | Tier · evidence |
|---|---|---|---|---|---|---|---|---|
| **Seko** | none (O-neg) | none (O-neg) | 生成历史 keeps assets even if nodes deleted (O) | shortcuts (O) | none (O-neg); "1张" count → multi-output display U | none; 发布作品 with 公开画布 is the only release step (O, not submitted) | edge source → derived; node label = op (O) | `seko/evidence/canvas.shortcuts-dialog.webp`, `canvas.share-popover.webp` |
| **TapNow** | none found (U); node regen keeps prior outputs in History (I2) | none (U) | History drawer (per project, dated) (O) | Undo / Redo shortcuts + pane menu (O) | none; 1×–4× in node (O) | Good / Bad on agent replies; Fork conversation; comment mode (O) | node retains prompt/model/params; edge from reference (O) | `tapnow/evidence/canvas.dock.history.with-item.webp`, `canvas.agent.done.webp` |
| **Flowith** | none (U); version strings only *inside* agent-authored docs (O) | none (U) | Media History (O) | U | **spatial**: siblings side by side under one prompt (8 image siblings in tutorial) (O); Search Node filters (O) | Rerun / Vary; comments (O) | dashed parent→child edge; lineage token (O) | `flowith/evidence/canvas.welcome.fit.webp`, `canvas.welcome.follow-up.webp` |
| **Lovart** | none (O-neg) | 画布历史: time · 保存/打开 · N 个元素 · KB · 恢复 — browser-local (I2) ; 图层 drawer has a 历史记录 stub (O) | 生成文件 (O) | undo/redo in logo menu (O) | none (O-neg) | 点赞/点踩 on messages (O) | shape `meta {threadId, actionId, groupId, toolCallId, rootTaskId}`; no prompt/model/seed on the shape (O) | `lovart/evidence/canvas.canvas-history.webp`, `canvas.float-layer-button.webp` |
| **LibTV** | none (O-neg) | none; published projects are frozen read-only copies, 复制项目 makes an independent project (O) | 生成历史 with **rating filter** 所有评级 (O; per-result rating I2) | U | none (O-neg); 生成数量 1/2/4 variants on node (display U) | rating (I2) | 从生成历史选择 re-import; member attribution (O) | `libtv/evidence/libtv.canvas.dock-gen-history.webp`, `libtv.tvshow.detail.webp` |
| **fal** | none (request-shaped) | – | Requests tab + Recent History, 30-day payloads (O / O-doc) | – | **Sandbox**: one prompt × N models × M repeats, Est. $ before run; Model Sets (O); post-run grid U | Favorite / Add to Collection / Link character; Examples = curated prior requests (O) | `request_id`: `?fromOutput=`, `?share=` (O) | `fal/evidence/sandbox.webp`, `sandbox.sets.webp`, `model.schnell.share.webp` |

### Counts

- Per-object version stack: **0 of 6**; O-negative in Seko, Lovart, LibTV; U in TapNow, Flowith.
- Whole-document snapshot with restore: Lovart only (I2 browser-local).
- Output history list: **6 of 6** (O).
- Undo/redo: Seko, TapNow, Lovart (O) — 3.
- Side-by-side compare surface: fal Sandbox (O) — 1; spatial siblings as implicit compare: Flowith (O) — 1.
- Batch/variant count on the generator: Seko, TapNow, Flowith, Lovart, LibTV, fal (O) — 6.
- Lightweight judgement (rating / thumbs / favourite / star): TapNow Good/Bad (O), Lovart 点赞/点踩 (O), LibTV rating filter
  (I2), fal Favorite (O), Flowith Starred in gallery (O), TapNow Library Favorite (O) — 5 O.
- Approval / promote-to-final step on an artefact: **0 of 6**.
- Provenance carried on the artefact (edge, meta or id): Seko, TapNow, Flowith, Lovart, fal (O) — 5.
- Share canvas as copyable template / public canvas: TapNow Share-by-link (O), LibTV 分享链接 + 发布 with process (O), Seko
  公开画布 switch (O), Flowith view link (O) — 4.

## Pattern

1. **History is the graph plus the output list.** No creative tool versions a node or a document; iteration is
   visible because derivations are new nodes that sit beside their sources.
2. **Compare is spatial or absent.** Only the infrastructure product builds a compare surface, and it compares
   *models*, not iterations of one artefact.
3. **Judgement is one bit**: thumbs / star / rating on a result or reply; nothing promotes an artefact to "final".
4. **Provenance rides on the object** (edge, meta, request id) rather than in a separate lineage view.
5. Whole-canvas snapshots appear once and are local to the browser.

## PARA decision

| Element | Rule | Supporters | Decision |
|---|---|---|---|
| No per-object version stack in M1; history = graph + generated list | A (negative) | O-negative Seko, Lovart, LibTV; U TapNow, Flowith; fal request-shaped | **A — adopt.** PRD "version branches" stays a non-goal; do not build a Versions tab in the inspector. |
| Undo / redo on the document | A | Seko, TapNow, Lovart (O) | **A — adopt** (editor-store level). |
| Provenance on the node (`sourceNodeId` / job id / thread id) | A | Seko, TapNow, Flowith, Lovart, fal (O) | **A — adopt** in the minimal node schema now (storage-neutral). |
| Output history list with dates, type filter | A | six of six (O) | **A — adopt** (Library drawer "Generated"). |
| One-bit judgement (star / thumbs) on results | A | TapNow, Lovart, fal, Flowith (O), LibTV (I2) | **A — adopt** later as a toolbar/context action; not M1. |
| Variant count on the generator (1–4) | A | six of six (O) | **A — adopt** in the generator schema; display of N outputs **EXPERIMENTAL** (U everywhere except Flowith siblings). |
| Side-by-side compare surface | — | fal Sandbox (O, models not iterations); Flowith spatial (O) | **EXPERIMENTAL.** If PARA needs it, the evidenced shape is "N sibling nodes under one prompt" (Flowith), not a modal diff. |
| Approve / promote to final | — | none | **EXPERIMENTAL** — PARA logic (review loop) may want it; no competitor evidence. |
| Whole-canvas snapshots with restore | — | Lovart (I2, local) | **EXPERIMENTAL.** |
| Share workspace as copyable template / publish with process | A | TapNow, LibTV, Seko, Flowith (O) | **A — adopt post-M1** (P4 surface). |
