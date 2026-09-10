# Canvas — PARA decision

Last synthesized: 2026-09-08 · Sources: research/synthesis/canvas-patterns.md,
research/synthesis/production-loop-comparison.md, research/synthesis/job-patterns.md,
research/synthesis/versioning-patterns.md, research/synthesis/pattern-matrix.md

Scope: what a node is, where a derivation lands, what edges mean, the minimal node schema PARA adopts next, the
persistence boundary, and views over one graph.

## Evidence

Paths relative to `research/competitors/`.

- Seko · node = generator config (mode tabs, model, params, `@`主体, count, ✦ price) **and** result; first generation
  types the blank node in place (空白节点 → 图片); derived ops (多角度, 图片超清, 画面切分, 合成视频) create a **new
  child node + edge to the right**, source untouched; node label = operation — O ·
  `seko/evidence/canvas.blank-node.webp`, `seko/evidence/canvas.node.image-completed.webp`,
  `seko/evidence/canvas.node.multiangle-submitted.webp`, `seko/evidence/canvas.node.action-multiangle.webp`
- Seko · continuous server autosave; reload restores nodes, edges, per-node config, and a job that completed while
  away — O · `seko/evidence/canvas.reloaded.webp`
- TapNow · node = prompt + model + params + 1×–4× + Generate + cost **and** output; manual regenerate renders in the
  **same node** (prior outputs in History — I2); agent derivation = new node + edge; Reference handle ("Wire is the
  Logic"); reload restores an in-node Redraw sub-mode; "Hide node connections" — O ·
  `tapnow/evidence/canvas.node.image.generated.webp`, `tapnow/evidence/canvas.node.image.tool-redraw.webp`,
  `tapnow/evidence/canvas.agent.generated.webp`
- Flowith · prompt node and answer node are **separate**; answer node = job container + result; Vary / Follow Up →
  new child/sibling nodes with dashed parent→child edges; reload restores viewport zoom, a draft node, a failed node — O ·
  `flowith/evidence/canvas.new.sent-t8.webp`, `flowith/evidence/canvas.welcome.follow-up.webp`,
  `flowith/evidence/canvas.new.reloaded.webp`
- Lovart · generator shape (`c-generator`) with its own composer; result is a separate `c-image` shape that **swaps a
  `c-task` placeholder**; no edges; provenance in shape `meta {threadId, actionId, …}`; camera, selection and sub-mode
  restored from client storage; 画布历史 snapshots browser-local (I2) — O ·
  `lovart/evidence/scratch.running.webp`, `lovart/evidence/scratch.done.webp`,
  `lovart/evidence/scratch.gen-node.done.webp`, `lovart/evidence/scratch.reloaded.webp`
- LibTV · node = prompt + model chip + mode chip + compact config chip + reference chips + 高级设置 **and** result;
  首帧 image → video edge is an **input** reference; 生成数量 1/2/4 on the node (display U); 工作流 ↔ 故事板 render the
  same nodes; explicit 待同步/同步中/已同步 indicator; template graphs (导演台, 逐帧拉片) cloned into the canvas — O ·
  `libtv/evidence/libtv.canvas.node-video-ref.webp`, `libtv/evidence/libtv.canvas.node-config-popover.webp`,
  `libtv/evidence/libtv.canvas.storyboard-mode.webp`, `libtv/evidence/libtv.canvas.template-shot-breakdown.webp`
- fal · no canvas; chaining by `?fromOutput=<requestId>`; queue states `IN_QUEUE(queue_position) → IN_PROGRESS →
  COMPLETED(metrics | error, error_type)` — O / O-doc · `fal/evidence/model.schnell.share.webp`, `fal/evidence/docs.queue.webp`
- Placeholder node on the canvas at submit: Lovart `c-task`, Flowith empty answer node, TapNow agent node, Seko
  blank → 排队中 — O · `lovart/evidence/scratch.running.webp`, `flowith/evidence/canvas.new.sent-t2.webp`,
  `seko/evidence/canvas.node.image-submitted.webp`
- Furniture (O): minimap Seko/TapNow/Lovart/LibTV; auto-layout Seko/Flowith/Lovart/LibTV; groups Lovart/LibTV/Seko;
  multi-select observed only in Lovart (structural ops) · `lovart/evidence/canvas.multi-selected.webp`

## Pattern

Converges: the node is a **job slot with a result** — it carries generator state, price, status and output (Seko,
TapNow, LibTV; Lovart keeps the generator on the canvas as its own node). Derivation **never overwrites** (5/5) and
usually **grows the graph** as a linked child (Seko, Flowith, TapNow). Edges mean **both** provenance and wiring and
are not visually distinguished (TapNow, Seko; LibTV wiring). Persistence is **silent and total** — no Save button
(5/5), including in-flight jobs (Seko) and failed nodes (Flowith). A placeholder occupies the result slot from submit
(4). Views over one graph are proven once (LibTV storyboard).

Diverges: regenerate in place (TapNow) vs new node (Flowith; Seko I2); generator+result in one node (3) vs split
(Flowith prompt/answer, Lovart generator/image); link on derivation (3) vs unlinked new shape (Lovart); sync
indicator (LibTV only); selection restore (Lovart only); how N variants display (U everywhere but Flowith siblings).

## PARA decision

1. **Node = generator state + result**; one node type moves through `empty → configured → queued → running →
   completed | failed` — **A** (Seko, TapNow, LibTV; Lovart generator node).
2. **A derivation never overwrites its source** — **A** (Seko, Flowith, TapNow, Lovart, fal).
3. **A derivation is a new child node linked by an edge** — **A** (Seko, Flowith, TapNow). Lovart's unlinked
   placeholder-swap is not adopted (one supporter, and it loses provenance on the canvas).
4. **First generation on a blank/configured node fills that node in place** — **A** (Seko, TapNow, LibTV).
5. **Placeholder node exists on the canvas from the moment of submit** and is the job (see jobs.md) — **A**
   (Lovart, Flowith, TapNow, Seko).
6. **Regenerate in place vs new node** — **EXPERIMENTAL**. Schema allows `outputs[]` on a node so either rendering is
   possible; M2 renders new node (the A-supported derivation shape) until the experiment closes.
7. **Edges carry two meanings — `derived` (provenance) and `reference` (input wiring)** — **A** for both meanings
   (provenance: Seko, Flowith, TapNow; wiring: TapNow, LibTV, Seko handles). Storing `kind` on the edge is **B**
   (nobody renders the distinction, but PARA storyboard/timeline logic needs to know which edges are inputs).
   Rendering edges stays an M1 non-goal; the **data relation lands now** so M2 does not migrate.
8. **Persistence boundary**: the workspace document (nodes, edges, viewport) is server-owned with continuous silent
   autosave; selection, open overlays and drawer state are client-only — **A** (Seko, TapNow, Flowith, Lovart,
   LibTV). Viewport restore on reopen — **B** (Lovart, Flowith zoom). Selection restore — **EXPERIMENTAL**. Sync
   indicator — **EXPERIMENTAL** (LibTV only).
9. **Running and failed nodes are part of the document** and survive reload — **A** (Seko in-flight, Flowith failed,
   TapNow/Lovart persisted results).
10. **Storyboard is a view over the same nodes, not a second document** — **B** (LibTV O; Seko 编辑器 I2).
    `timeline` / `viewer` — **EXPERIMENTAL** (no working timeline observed in six products).
11. **Professional tools enter as toolbar ops on the node (A: Seko, TapNow, Flowith, Lovart), fullscreen editor
    overlay (B: TapNow, Lovart), and template graphs / node types (B: LibTV, TapNow skills)** — never a separate mode
    or route.
12. **Minimap, auto-layout, groups** — **A**, post-M1. **Multi-select** — **EXPERIMENTAL** (structural-only per
    selection.md).

### Minimal node schema to adopt next (extends `apps/para/src/domain/types.ts`)

Field groups carry the tier of the evidence that justifies them. Keep everything optional except `status`.

```ts
type NodeStatus = "empty" | "configured" | "queued" | "running" | "completed" | "failed";   // A (5 O) + C (fal queue)

interface Provenance {                       // A — Seko edge, TapNow node params, Flowith lineage, Lovart meta, fal request id
  sourceNodeIds?: string[];                  // derived-from; mirrors `derived` edges
  jobId?: string;                            // the request that produced the current output
  threadId?: string;                         // agent thread, when created by the agent (Lovart meta, TapNow mention)
  createdBy: "user" | "agent" | "import" | "template";
}
interface TaskState {                        // A for node states; C for queue position + error taxonomy (fal)
  status: NodeStatus;
  queuePosition?: number;
  startedAt?: string; finishedAt?: string;
  error?: { type: string; message: string; retryable?: boolean };   // terminal payload, not a state
}
interface Cost {                             // A at trigger (Seko, TapNow, Lovart, fal); B actual (fal, Seko delta)
  estimated?: number; actual?: number; currency: "credits"; durationMs?: number;
}
interface GeneratorState {                   // A — params tiered at the node (6/6); refs A (5/5); count A (6/6)
  mode: "image" | "video" | "text" | "audio";
  model?: string; prompt?: string;
  params?: Record<string, unknown>;          // ratio, resolution, duration, seed… (tier 2/3 in the UI)
  references?: Array<{ kind: "asset" | "subject" | "node"; id: string }>;
  count?: 1 | 2 | 4;
}
interface Output { assetId: string; jobId: string; createdAt: string }   // EXPERIMENTAL — regen-in-place needs N outputs

interface BaseNode extends Provenance, TaskState { id; x; y; width; height; cost?: Cost; }
interface MediaNode extends BaseNode { type: "image" | "video" | "audio"; assetId?: string; generator?: GeneratorState; outputs?: Output[] }
interface TextNode  extends BaseNode { type: "text"; text: string; generator?: GeneratorState }

interface Edge { id: string; source: string; target: string; kind: "derived" | "reference" }   // A meanings, B `kind`
interface WorkspaceDocument { version: number; nodes: Record<string, WorkspaceNode>; edges: Record<string, Edge>; viewport: Viewport }
```

Not in the schema (no evidence): per-node version stack, approval flag, compare groups, node-level lock/permissions.

## What this changes in the current PRD/shell

- **Keep**: single-`div` transform canvas; pan/zoom/select/move/delete; "document is never swapped on view change";
  edges not rendered in M1; storyboard as a view.
- **Change**: `types.ts` gains `status`, provenance, `cost`, `generator`, `outputs`, and `edges` on the document
  (storage-neutral, allowed now by the phase ADR); `editor-store` mutations must create a placeholder child node with a
  `derived` edge on any generate action (mock); MediaNode renders `queued / running / failed` states; view selector
  hides `timeline` / `viewer` behind a labs flag.
- **Remove**: the assumption that a node is only a rendered asset (`assetId` becomes optional).
- **Defer**: minimap, auto-layout, groups, multi-select, edge rendering, sync indicator, selection restore.

## Open questions

- U · Regenerate in place vs new node. Closing: TapNow authenticated run — regenerate, then open History and the
  node; Seko re-send on a completed node; record whether the graph or the node grew.
- U · N-variant display (count 2/4). Closing: LibTV funded run with 生成数量 4; Seko 九宫格; observe the canvas.
- U · Timeline surface. Closing: Seko 合成视频 → 编辑器 with real video credits; TapNow Timeline Editor node.
- U · Is a sync indicator worth its chrome? Closing: PARA M2 with real autosave — count save-failure incidents.
- U · Multi-select generative ops. Closing: TapNow/Seko authenticated marquee select on two images.
- U · Do users need to see `derived` vs `reference` edges differently? Closing: storyboard prototype in M2.
