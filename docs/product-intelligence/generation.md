# Generation — PARA decision

Last synthesized: 2026-09-08 · Sources: research/synthesis/production-loop-comparison.md,
research/synthesis/canvas-patterns.md, research/synthesis/job-patterns.md,
research/synthesis/versioning-patterns.md, research/synthesis/progressive-disclosure.md

Scope: the request → artefact lifecycle, never-overwrite, provenance on the node, variants, the compare surface, and
approve/promote. Node schema fields are specified in canvas.md; job states in jobs.md.

## Evidence

Paths relative to `research/competitors/`. Funded runs exist only for Seko (2 images), TapNow (2), Lovart (2).

- Seko · configure in the node (mode tab · model · ratio/res · `@`主体 · count · ✦ price) → send, ✦ debited, no
  confirm → 排队中 → 生成中 → result **in the node** → derived op (多角度 ✦1) → **new child node + edge**, source
  untouched → 生成历史 keeps assets even if nodes are deleted; "1张" count; no compare, no approve (O-negative) — O ·
  `seko/evidence/canvas.blank-node.webp`, `seko/evidence/canvas.node.image-submitted.webp`,
  `seko/evidence/canvas.node.image-completed.webp`, `seko/evidence/canvas.node.multiangle-submitted.webp`
- TapNow · prompt + model + params (cost 5) → Generate, no confirm → ~39 s → output in the **same node**, bar stays →
  in-node tools (Change Angle / Relight / Redraw) → History entry; 1×–4× variations; node retains prompt/model/params;
  Good / Bad on agent replies; no compare — O · `tapnow/evidence/canvas.node.image.generated.webp`,
  `tapnow/evidence/canvas.node.image.tool-redraw.webp`, `tapnow/evidence/canvas.dock.history.with-item.webp`,
  `tapnow/evidence/canvas.agent.done.webp`
- Flowith · Send → prompt node + **empty answer node** → fills or fails; Vary (mini form: batch, ratio, shortlist,
  cost sentence) / Follow Up → new child/sibling nodes; **siblings side by side under one prompt** (8 image siblings
  in the tutorial flow) is the only spatial compare; Rerun only on successes — O ·
  `flowith/evidence/canvas.welcome.image-vary-menu.webp`, `flowith/evidence/canvas.welcome.fit.webp`,
  `flowith/evidence/canvas.welcome.follow-up.webp`, `flowith/evidence/canvas.new.failed-node.webp`
- Lovart · `c-task` placeholder → result **swaps** it (`c-image`), source of a quick edit preserved but the new shape
  is **unlinked**; shape `meta {threadId, actionId, groupId, toolCallId, rootTaskId}` — no prompt/model/seed on the
  shape; 数量 1–10; 点赞/点踩 on messages; no compare, no approve — O · `lovart/evidence/scratch.running.webp`,
  `lovart/evidence/scratch.done.webp`, `lovart/evidence/canvas.generator-image.size-popover.webp`
- LibTV · 生成数量 1/2/4 on the node (display U); result carries an AI生成 badge; 生成历史 with rating filter (per-result
  rating I2); 从生成历史选择 re-imports an output into a node; 发布 freezes a read-only copy — O ·
  `libtv/evidence/libtv.canvas.node-config-popover.webp`, `libtv/evidence/libtv.canvas.dock-gen-history.webp`,
  `libtv/evidence/libtv.tvshow.detail.webp`
- fal · required-first form, cost line → Run → (403 pre-queue: no history row) → result Preview/JSON → chain Edit /
  Upscale / Make Video via `?fromOutput=<requestId>` (new request, source kept); `num_images` 1–4; **Sandbox**: one
  prompt × N models × M repeats, Est. $ before run — compares *models*, not iterations; Favorite / Add to Collection /
  Link character; Examples = curated prior requests — O · `fal/evidence/model.schnell.share.webp`,
  `fal/evidence/sandbox.webp`, `fal/evidence/sandbox.models.webp`, `fal/evidence/model.schnell.after-run.webp`
- Counts (O): source never overwritten 5 (Seko, Flowith, TapNow-agent, Lovart, fal) · derivation linked on canvas 3
  (Seko, Flowith, TapNow) · variant count on the generator 6/6 · N-variant *display* observed 1 (Flowith siblings) ·
  compare surface 1 (fal, models) · approve/promote **0/6** · one-bit judgement 5 (TapNow, Lovart, fal, Flowith, LibTV I2)
  · provenance on the artefact 5 (Seko edge, TapNow params, Flowith lineage, Lovart meta, fal request id) · export/
  download 6/6.

## Pattern

Converges (≥3): the loop is *configure in the node → submit without a dialog → placeholder/status in that node →
result in that node → refine from selection → derivation as a new object beside its source → output history*.
Nothing is overwritten; provenance rides on the artefact (edge, retained params, meta, request id); a variant count
sits on the generator; judgement is one bit (thumb/star/rating); export is a direct action.

Diverges: **regenerate** in place (TapNow) vs new node (Flowith; Seko I2); **variants display** (only Flowith seen);
**compare** — spatial siblings (Flowith) vs a model-comparison surface (fal) vs absent (Seko, TapNow, Lovart, LibTV);
**approve / promote** — absent everywhere; rating as a filter (LibTV) vs a thumb on a reply (TapNow, Lovart) vs a
favourite (fal, Flowith).

## PARA decision

1. **Lifecycle of a node**: `empty → configured → queued → running → completed | failed`; the first generation fills
   the configured node in place, and the result stays in that node — **A** (Seko, TapNow, LibTV; Flowith answer node).
2. **Never overwrite**: any refine, vary, upscale, edit or agent action on a completed node creates a **new child node
   with a `derived` edge**; the source is untouched — **A** (Seko, Flowith, TapNow; Lovart/fal for "kept", not linked).
3. **Provenance on the node**: `sourceNodeIds`, `jobId`, `threadId`, `createdBy`, plus the retained `generator`
   (prompt · model · params · references) — **A** (Seko, TapNow, Flowith, Lovart, fal). Lovart's meta-without-params
   is the anti-pattern: PARA keeps the generator state on the artefact so a result is reproducible from the node.
4. **Variant count (1 · 2 · 4) on the generator** — **A** (6/6). **Display of N variants** — **EXPERIMENTAL** (U
   everywhere except Flowith siblings). M2 renders N variants as **N sibling child nodes** under the source (the only
   observed shape) until the experiment closes; `outputs[]` on a node stays available for in-place rendering.
5. **Regenerate**: new child node, not in place — **EXPERIMENTAL** choice; canvas.md decision 6 governs.
6. **Compare surface** — **EXPERIMENTAL**. The only evidenced shapes are Flowith's spatial siblings (iterations) and
   fal's Sandbox (models, with Est. $). Not in M1 or M2. If PARA needs it, prototype "N siblings under one prompt +
   a select-two → side-by-side overlay", not a modal diff.
7. **Approve / promote to final** — **EXPERIMENTAL** (0/6). PARA's review-loop business logic may want it; there is no
   evidence for a UI. Do not add an "Approved" state to the node schema until an experiment names the surface.
8. **One-bit judgement (star / thumbs) on a result** — **A** (TapNow, Lovart, fal, Flowith; LibTV I2) — post-M1 as a
   toolbar/context action; feeds the Library `Generated` filter (LibTV rating filter, fal Favorites) — **B**.
9. **Cost at the trigger, no confirm; fan-out estimate when count > 1** — **A** / **B** (jobs.md decisions 7–8).
10. **Pre-admission rejection creates no node; post-admission failure is terminal on the node** — **C** / **A**
    (jobs.md decision 5).
11. **Output history in the Library `Generated` tab, dated, filtered by type; assets outlive their nodes** — **A**
    (6/6; Seko O for outliving). Re-import from history into a node — **B** (LibTV 从生成历史选择, TapNow Apply to Canvas).
12. **Export / download is a direct toolbar action**; publish/share as a copyable template is post-M1 — **A** (6/6;
    TapNow, LibTV, Seko, Flowith for template share).
13. **Chaining to a different model/tool from a result (Edit ▾ / Upscale ▾ / To video ▾ with alternative models)** —
    **B** (fal chain links, Flowith Upscale▾/Vary▾) — the toolbar item may carry a model sub-menu.

## What this changes in the current PRD/shell

- **Keep**: "real generation API" as an M1 non-goal; the node as the only result surface; Library `Generated`.
- **Change**: the M1 mock "generate" path (agent run, context toolbar Generate) must produce a placeholder **child
  node with a `derived` edge**, then swap in an asset — never mutate the source node; `MediaNode` keeps `generator`
  after completion; the toolbar Vary/Generate slot reads `count` from the generator; design.md records that variants
  render as sibling nodes (experimental) and that no compare/approve UI exists.
- **Remove**: any implicit "regenerate replaces the image" behaviour in the mock.
- **Defer**: judgement action, chaining sub-menus, compare prototype, approve state, publish/share.

## Open questions

- U · N-variant display in Seko (九宫格), LibTV (生成数量 4), TapNow (4×), Lovart (数量 4). Closing: funded runs with
  count 4 in each; capture the canvas — grid in node, siblings, or carousel.
- U · Regenerate in place vs new node (TapNow History after regenerate; Seko re-send). Closing: as canvas.md.
- U · Whether spatial siblings suffice as compare for a review loop. Closing: PARA M2 storyboard prototype with a
  select-two overlay; measure whether reviewers ask for a diff.
- U · Does anyone need an "approved" bit beyond a star? Closing: interview three PARA design partners on their
  hand-off step; only then name the surface.
- U · fal Sandbox post-run grid (compare of outputs). Closing: fal top-up and one Sandbox run.
