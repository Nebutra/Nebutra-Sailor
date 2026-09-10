# research/ — Product Intelligence Layer

Evidence-graded knowledge base of how state-of-the-art AI creative products
work. Governed by
[ADR 2026-09-08 competitive product cartography](../docs/architecture/2026-09-08-competitive-product-cartography.md).
Consumed through `docs/product-intelligence/`, never directly by implementation agents.

## Rules that every file here obeys

1. **Tier every statement**: `O` observed · `I2` strongly inferred · `I1` weakly inferred · `U` unknown.
   Only O and I2 may be cited as competitor facts downstream.
2. **Route ≠ Surface ≠ State ≠ Overlay.** A URL is not a page; a state is not a screenshot.
3. **Persist after every surface.** No finding lives only in an agent's context.
4. **Every state has a fingerprint** (`schema/state.schema.json` → `fingerprint`). Visited fingerprints are skipped.
5. **Evidence is committed small.** `evidence/` holds one webp ≤ 150 KB per fingerprinted state, named by state id.
   `raw/` (gitignored) holds full-size captures, DOM dumps, HAR. Regenerate raw with `scripts/research-screenshot.mjs`
   or the Chrome session.
6. **Access boundary**: public track is agent-driven; authenticated track is owner-assisted inside the owner's own
   session. No auth/paywall/CAPTCHA bypass, no hidden-API probing, no irreversible action without per-action consent.
   Credit budget per competitor lives in `manifest.yaml`.

## Layout

```
schema/            JSON Schemas for manifest, surface, state, transition
competitors/<slug>/
  manifest.yaml    targets, access track, budget, coverage score
  surfaces/<id>/   surface.json · summary.md · states/<state-id>.json · transitions.json
  topology/        routes.mmd · surfaces.mmd · states.mmd
  domain/          objects.yaml · lifecycles.yaml
  ux/              patterns.md · disclosure-matrix.md · selection-matrix.md · density.yaml
  business/        production-loop.md · persistence.md · jobs.md · generation.md · agent.md
  evidence/        committed captures
  raw/             local only
  synthesis.md     competitor summary (map-reduce parent reads this, not surfaces/)
synthesis/         cross-competitor pattern reports + pattern-matrix.md
```

## Traversal order

Priority BFS across surfaces, local DFS inside one surface.
P0 create/generate/edit/compare/approve/export → P1 project/canvas/asset/subject/shot/scene/workflow
→ P2 prompt/plan/execution/approval/retry → P3 director/reshoot/analyze/timeline/audio → P4 billing/profile/settings.
Stop a branch on: no new interactions · all lead to known states · permission/paywall · irreversible action ·
outside authorization · coverage threshold reached.

## Agent prompt contract

> You are a competitive product cartography agent. Your job is not to review or imitate the product.
> Recursively discover the product's reachable UI surfaces, states and interactions. Treat routes, surfaces,
> states, overlays and transitions as different concepts. For every meaningful state: capture evidence,
> enumerate visible controls, identify active tabs and overlays, inspect contextual interactions, record the
> transition that produced it. Never infer business architecture from visual appearance alone. Classify every
> conclusion as Observed, Strongly Inferred, Weakly Inferred, or Unknown. Persist findings after every surface;
> do not depend on conversational context. Explore core production loops before peripheral pages. Pay
> particular attention to: unit of work, persistence boundaries, selection semantics, generation lifecycle,
> artifact provenance, job lifecycle, agent planning and execution, professional tool access, progressive
> disclosure, versioning and comparison, reusable identities and libraries. Do not summarize until the local
> surface topology is exhausted.

## Slicing for context budget

competitor → surface → state cluster. A leaf agent owns one slice and writes `surfaces/<id>/`.
A surface agent writes `surfaces/<id>/summary.md`. A competitor agent reads only summaries + evidence refs
and writes `synthesis.md`. A synthesis agent reads six `synthesis.md` files and writes `synthesis/`.

## Coverage score (per manifest)

route · surface · interaction · state · core-loop coverage. Core ≥ 90 %, peripheral ≥ 60 %.

## Downstream

`docs/product-intelligence/<area>.md` — one file per PARA IA area (workspace, canvas, selection, agent, jobs,
library, generation, versioning). Each ≤ one agent context, three layers: **Evidence → Pattern → PARA decision**,
with links back to `research/`. Implementation agents read the PRD + the relevant intelligence file + the design
system, never this whole tree.
