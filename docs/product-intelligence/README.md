# PARA UI Decision Pack

One file per information-architecture area. Each is the only research an implementation agent
reads for that area, stays within one agent context, and has three layers:
**Evidence** (links into `research/`, O/I2 only) → **Pattern** → **PARA decision** (A/B/C/EXPERIMENTAL).

Decision rule and evidence tiers: [ADR 2026-09-08 competitive product cartography](../architecture/2026-09-08-competitive-product-cartography.md).
Gates: [ADR 2026-09-08 product intelligence phase](../architecture/2026-09-08-product-intelligence-phase.md).
Source corpus: `research/synthesis/` (12 reports, all six targets, synthesized 2026-09-08) and
`research/visual/` (six visual-language reports + `synthesis.md`, 2026-09-09).

| File | Area | Status |
| --- | --- | --- |
| workspace.md | Shell, surfaces, drawers, density | written 2026-09-08 |
| canvas.md | Node semantics, viewport, edges, persistence boundary | written 2026-09-08 |
| selection.md | Post-selection UI, toolbar vs inspector vs context menu | written 2026-09-08 |
| agent.md | Entry, plan/execution display, approval, concurrency | written 2026-09-08 |
| jobs.md | Lifecycle, persistence across navigation, job center | written 2026-09-08 |
| library.md | Assets, subjects, scope, reuse across workspaces | written 2026-09-08 |
| generation.md | Request → artifact, provenance, variants, compare, approve | written 2026-09-08 |
| versioning.md | History, branches, promote, diff | written 2026-09-08 |
| visual-language.md | Ground, chrome shape, accent, node/selection rendering, overlays, type, theme, tokens | written 2026-09-09 |

Precondition for any large PARA UI task: read `apps/para` PRD → the relevant file here → design system →
existing component patterns. Never the whole `research/` tree.

**Reading order for an implementation task:** `.trellis/tasks/09-08-para-frontend-shell/prd.md` → `workspace.md`
(always) → the one area file the task touches (`canvas.md` for schema/store work, `selection.md` for anything shown on
select, `agent.md` for the composer/panel, `jobs.md` for status, `library.md` for the drawer, `generation.md` for the
generate path, `versioning.md` before adding any history UI; `visual-language.md` for anything that sets a colour, a
surface, a radius, a type size or a control height) → its "What this changes in the current PRD/shell"
section → `apps/para/src/domain/types.ts`. Read a `research/competitors/<slug>/` file only to check one cited claim.

**Gate status (cartography v1, 2026-09-08):** decidable now — workspace layout (A, with B for project → workspace and
the ≤ 25 % chrome budget), drawer topology (A in form; rail position EXPERIMENTAL), agent panel placement (B: bottom
composer, recorded departure from the A right dock), inspector contract (A: node-anchored config; the right Inspector
drawer is **removed**), canvas node semantics and minimal schema (A, with C for queue/error shape), library topology
(A: drawer with `Generated | Assets`; Subject at account + platform scope), job UI (A: job = node, no job center; C
states; top-bar indicator EXPERIMENTAL), generation lifecycle (A: never overwrite, linked child node, provenance on
the node), versioning (A-negative: no per-object versions; undo/redo A). Still EXPERIMENTAL — do not freeze:
storyboard is B but `timeline` / `viewer` views, regenerate-in-place vs new node, N-variant display, compare surface,
approve/promote, snapshots, agent failure/retry, plan-as-nodes, budget threshold, command palette, multi-select,
brand kit / knowledge / skills shape. Each file's "Open questions" names the experiment or authenticated run that
closes its items.
