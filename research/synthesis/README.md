# Cross-competitor synthesis

Written only from the six `research/competitors/<slug>/synthesis.md` files plus their `business/`, `ux/`, `domain/`
extracts and evidence references, per
[ADR 2026-09-08 competitive product cartography](../../docs/architecture/2026-09-08-competitive-product-cartography.md).
Each report is **Evidence → Pattern → PARA decision**; only O and I2 are cited as facts; every PARA decision names the
rule (A / B / C / EXPERIMENTAL) and the competitors that support it.

**Last synthesized: 2026-09-08** (Seko, TapNow, Flowith, Lovart, LibLib/LibTV, fal.ai — all explored the same day).

## Reports

| Report | Question it answers |
|---|---|
| [page-topology-comparison.md](page-topology-comparison.md) | Route / surface / state shape per competitor; where `/p/:projectId/w/:workspaceId?view=` sits |
| [production-loop-comparison.md](production-loop-comparison.md) | The loops actually walked (transitions), not assumed |
| [agent-patterns.md](agent-patterns.md) | Entry, placement, persistence, blocking, plan display, approval, autonomy, tool log, context binding, failure |
| [canvas-patterns.md](canvas-patterns.md) | Node as unit of work; where derivations land; edge meaning; persistence boundary; views over one graph |
| [selection-patterns.md](selection-patterns.md) | Selection Interaction Matrix; toolbar vs inspector vs node card; selection → agent context |
| [job-patterns.md](job-patterns.md) | Job = node vs job center; states; survival; cost before/after; gateway rejection vs failed job; cancel/retry |
| [library-patterns.md](library-patterns.md) | Assets, subjects, brand kit, knowledge, skills; scope; how they enter the canvas |
| [versioning-patterns.md](versioning-patterns.md) | History vs versions vs snapshots; compare surfaces; undo/redo |
| [progressive-disclosure.md](progressive-disclosure.md) | Always / hover / select / on-demand / advanced-only; where model params live |
| [frontend-density.md](frontend-density.md) | Persistent panels, primary buttons, tabs, chrome % vs PARA's ≤ 25 % |
| [pattern-matrix.md](pattern-matrix.md) | Capability × competitor × PARA decision, every cell tiered |

## Coverage caveats

- **Zero-credit accounts**: Flowith (0 cr.), LibTV (0 积分), fal ($0.00). Their generation lifecycle was observed
  only up to the credit gate (Flowith: full *failed*-node lifecycle; fal: 403 rejection pre-queue; LibTV: nothing
  submitted). Funded runs were observed only on Seko (2 images), TapNow (2 images) and Lovart (2 images). No video,
  audio or 3D generation was run anywhere.
- **Unknown across the board (U in all six)**: failure / retry / cancel UI on a running job (only Lovart's stop button
  and fal's documented cancel semantics exist); multi-select semantics (only Lovart observed); a multi-step agent plan
  with approval (only TapNow's single-action approval card; Flowith's plan seen post-hoc); in-flight job survival
  across navigation (only Seko verified); any working **timeline / NLE** surface (Seko 编辑器 inert, TapNow Timeline
  Editor did not open, LibTV has none); how N variants from a batch count are displayed (only Flowith siblings).
- **Method caveats**: TapNow and Lovart captured at 1040×797 (density ratios I2); several TapNow canvas states are
  evidenced by DOM dumps rather than pixels; LibTV `window.open` launches were trapped; liblib.art generators sit
  behind a CAPTCHA and were enumerated only.
- **Not a creative OS**: fal contributes job-model, cost and disclosure evidence (tier C for engineering), not
  workspace patterns.

## Top 10 cross-competitor findings (ranked)

1. **The canvas of nodes is the production surface, and the node is both generator and result** — Seko, TapNow,
   LibTV (O) hold config and output in one node; Flowith and Lovart keep the generator on the canvas as a separate
   node. One production route; everything else is a list or an overlay (5/5). → A.
2. **No product has a right-side inspector drawer.** Configuration is anchored to the node (under it, inside it, or
   always-on) and actions are a floating toolbar above the selection (Seko, TapNow, Flowith, Lovart — O; LibTV
   always-on; O-negative for a side inspector in all five). PARA's PRD inspector contract is EXPERIMENTAL.
3. **The job is the node; there is no job center anywhere.** Status renders in the node from submit (5/5 O); the only
   global surface is a history of *outputs* (6/6 O). Queue-vs-running is distinguished only by Seko and fal.
4. **Selection is the agent's context**: selecting a node auto-inserts a removable chip/token into the composer (Seko,
   TapNow, Flowith, Lovart — O). One gesture serves manual tools and the agent.
5. **The agent is a docked right panel (4/5), open by default (3/5), scoped to the document/project (5/5).** Every open
   panel costs 33–45 % of the viewport; ≤ 25 % chrome is achieved only with it closed. Flowith alone has no panel and
   projects the plan as nodes.
6. **Derivation never overwrites; it grows the graph** — new child node linked by an edge (Seko, Flowith, TapNow-agent
   — O); Lovart swaps a placeholder without a link; fal chains by request id. Edges mean both provenance and wiring.
7. **Cost sits at the trigger and no dialog interrupts manual generation** (Seko, TapNow, Lovart, Flowith — O); the
   only approval gate is for **agent** spend (TapNow card, LibTV switch) — B for PARA.
8. **Nobody versions or compares.** No per-object version stack (O-negative ×3, U ×2), no approve/promote step (0/6);
   history = graph + output list; undo/redo only. fal's Sandbox compares models, not iterations.
9. **Reusable identity = a subject/character object at account + platform scope, entered with `@`** (Seko, TapNow,
   LibTV, fal — O). Brand kit (Lovart) and knowledge base (Flowith) are single-product substitutes.
10. **Params are tiered at the node — prompt · model · summary chip → popover → advanced — never in a side panel**
    (6/6 O); libraries are drawers or modals, never permanent panels (5/5 O); one primary button at rest, one more on
    selection (4 O).

## Where evidence was too thin to decide

Regenerate-in-place vs new node · N-variant display · multi-select · agent failure/retry · plan editing before
execution · timeline / viewer views · project-vs-account scope of generated history · agent credit pool · sync
indicator · brand kit / knowledge / memory · compare surface. All marked EXPERIMENTAL in `pattern-matrix.md`.

## Downstream

`docs/product-intelligence/<area>.md` (workspace, canvas, selection, agent, jobs, library, generation, versioning)
consumes these reports; implementation agents read the PRD + the relevant intelligence file, never this tree.
