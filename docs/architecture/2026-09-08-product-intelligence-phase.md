# Product Intelligence Phase — Research Before Architecture

- **Date**: 2026-09-08
- **Status**: Accepted
- **Owner**: tseka_luk
- **Supersedes**: [Closure phase (2026-08-27)](./2026-08-27-closure-phase.md)
- **Related**:
  - [Competitive product cartography](./2026-09-08-competitive-product-cartography.md)
  - [docs/package-status.md](../package-status.md)
  - `research/README.md`

---

## Decision

The closure phase is **rescinded**. Its expansion ban — no new product nouns,
no new workspace packages, no new surfaces — no longer applies.

What replaces it is not a return to free expansion. The next phase has one
priority above product code:

> Build a verifiable, evidence-graded knowledge base of how state-of-the-art AI
> creative products actually work, and let that — not screenshots, taste, or
> guesswork — decide PARA's information architecture.

`apps/para` is the first product under this phase. Until the cartography
deliverable gate is met, the PARA shell is **Exploration**, not Architecture.

## What carries over from closure

These rules were about repo trust, not about expansion. They stay:

1. **Honesty layers** (Verified / Implemented / Experimental / Direction) and the
   `nebutra.graph` / `nebutra.status` machine contract.
2. **One canonical implementation per domain.** Billing, auth, webhooks, content,
   tenancy, permissions keep their canonical packages. New products consume
   them; they do not fork them.
3. **Security invariants** ship with a failing case and a regression case.
4. **Done means the full chain**: clean clone → frozen install → lint →
   typecheck → unit → integration → production build.
5. **No “unify the architecture” rewrite.** Growth is additive and consumes
   the existing package graph.
6. **Stable-set publishing** stays as it is; a new app does not change what
   the release pipeline publishes.

## What is now allowed

- New product apps under `apps/`, each with `graph: labs` and `status: wip`
  until proven, and each with a README stating its honesty layer.
- New packages **only** when a real consumer lands in the same PR and the
  capability does not already exist in the graph.
- The `research/` tree as a committed, evidence-graded knowledge base
  (see cartography ADR §35 and `research/README.md`).

## Agent infrastructure — deferred, with a constraint

The cartography ADR describes an agent topology (orchestrator, navigator,
cartographer, archivist, analysts, verifier). That topology is a **process
and a data contract**, executed today with Claude Code agents and workflows
persisting to `research/`. It is **not** to be built as product code in this
phase.

When Nebutra does build agent infrastructure, it is **backend-first and
state-independent**: the runtime owns plans, runs, evidence, and artifacts;
no frontend state is an input to it. `@nebutra/agent-runtime` is the home for
that work when it starts, and it starts from the research data contract, not
from the UI.

## Gates

| Gate | Blocks | Until |
| --- | --- | --- |
| Cartography v1 | Freezing PARA workspace layout, drawer topology, inspector contract, canvas node semantics, storyboard / timeline / library topology, job UI, generation lifecycle | `research/synthesis/` has ≥ 8 pattern reports and the pattern matrix is filled for all six targets |
| Storage-neutral work | Nothing | — PARA M2 items (upload, persist document, asset → canvas) proceed now; they do not depend on competitor conclusions |

## What this does not authorize

- Duplicating a canonical implementation because a new product wants a
  slightly different shape.
- Building an agent orchestration framework in the frontend.
- Treating any PARA UI decision as final before its intelligence file in
  `docs/product-intelligence/` exists and cites evidence.
