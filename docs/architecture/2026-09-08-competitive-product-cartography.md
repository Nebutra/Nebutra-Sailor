# Competitive Product Cartography — Recursive Topology Research Before PARA IA Freeze

- **Date**: 2026-09-08
- **Status**: Accepted
- **Owner**: tseka_luk (PARA / Nebutra)
- **Decision type**: Product intelligence / frontend architecture
- **Targets**: Seko, TapNow, Flowith, Lovart, LibLib / LibTV, fal.ai — **all six, full depth**
- **Related**:
  - [Product intelligence phase](./2026-09-08-product-intelligence-phase.md)
  - `research/README.md` (operating manual, schemas, evidence rules)
  - `docs/product-intelligence/` (decision pack consumed by implementation agents)
  - `apps/para` (Exploration until the gate below is met)

---

## Context

PARA's shell was designed from a PRD, a few screenshots, and taste. That is
enough to build a container; it is not enough to decide information
architecture. A panel that looks like an Inspector may be selection +
generation config + history + review + agent context. A route may hold
thirty product states. Visual appearance does not reveal business
architecture.

> Business logic must be reconstructed from surfaces, states, interactions,
> URLs, object relationships and job lifecycles — recursively, with evidence —
> not inferred from how a page looks.

## Decision

Run **recursive competitive product cartography** on all six targets and
persist the result as an evidence-graded **Product Graph** under `research/`.
PARA's workspace IA is frozen only from the synthesized decision pack that this
produces.

The method is:

```
Recursive discovery → State exploration → Evidence capture
→ Structured extraction → Map-reduce synthesis
```

It is executed as a **process with a data contract**, using Claude Code agents,
workflows and browser tooling that write to disk after every surface. It is
**not** built as product code (see the phase ADR: agent infrastructure is
deferred and, when built, backend-first and state-independent).

## Vocabulary — not interchangeable

| Term | Meaning |
| --- | --- |
| **Route** | Browser URL / router location |
| **Surface** | One primary working area the user perceives (Home, Canvas, Library, Timeline…) |
| **State** | A business state of one surface (Canvas/Empty, Canvas/Selected, Canvas/Generating…) |
| **Overlay** | UI that does not replace the surface (drawer, popover, modal, inspector, context menu, command palette) |
| **Transition** | `from state + action → to state`, with side effects |

The output is a Product Graph per competitor: route graph, surface graph,
state graph, interaction graph, domain-object graph, execution graph.

## Evidence contract (anti-hallucination)

Every statement carries one tier:

| Tier | Meaning | Example |
| --- | --- | --- |
| **O** Observed | Seen directly in the product | O: selecting an image reveals 8 quick actions |
| **I2** Strongly inferred | Multiple observations converge | I2: a generation creates a new artifact — the source remains and a linked node appears |
| **I1** Weakly inferred | Limited evidence | I1: canvas may be the persistence boundary |
| **U** Unknown | Cannot be determined from the UI | U: whether job state is server-persisted |

Only **O + I2** may be cited as competitor facts in PARA PRDs and decision
files. "They should have a shared library" is not a finding.

## Traversal

- **Priority BFS across surfaces, local DFS within a surface.**
- Frontier priority: P0 production (create/generate/edit/compare/approve/export)
  → P1 core objects → P2 agent → P3 professional tools → P4 peripheral
  (billing, profile, settings). Exhaust P0–P3 first.
- **State fingerprint** = route + main heading + active tab + visible overlay +
  selected entity type + major controls. A visited fingerprint is skipped.
- A branch stops on: no new interactions; all interactions lead to known
  states; permission or paywall; destructive or irreversible action; outside
  authorization; surface coverage threshold reached.

## Access — two tracks, one boundary

| Track | Who drives | Scope |
| --- | --- | --- |
| Public | Agent (Chrome extension / Playwright) | Marketing pages, docs, public demos, anything reachable without an account |
| Authenticated | **Owner-assisted**: the owner signs in and keeps the session; the agent explores page by page inside that session | Real workspaces, generation, jobs, libraries |

Boundary in both tracks: no bypassing auth, paywalls, CAPTCHAs or
anti-automation; no hidden-API probing; no access to other users' data; no
irreversible actions (delete, publish, purchase) without explicit per-action
consent. Generation credits spent during §23–25 experiments are a budget the
owner sets per competitor in its `manifest.yaml`.

## What every competitor must yield

Per surface: layout, navigation, tabs, primary/secondary actions, overlays,
control inventory, screenshots, observations. Per state: selected entity,
active tab, open overlay, job state, agent state, visible controls, evidence.
Per transition: action type + control, side effects, evidence.

Analyses that the graph must support (each becomes a file):

- Business objects, their **scope** (account / team / project / workspace /
  canvas / session) and **persistence** (refresh, navigate away, switch
  workspace, reopen, new session)
- **Job lifecycle**: submit → queued → running → streaming → completed /
  failed / cancelled / retry; what survives navigation and refresh; where
  results land; where failures show
- **Generation semantics**: overwrite or new artifact; node or not;
  auto-linked to source; provenance; autosave; compare; promote / approve
- **Selection semantics** per entity type → Selection Interaction Matrix
- **Agent UX**: entry, persistence, blocking, plan display, execution display,
  approval, concurrent editing, result integration, failure recovery
- **Progressive disclosure matrix**: always / hover / select / on demand /
  advanced only
- **Density**: persistent panels, visible primary buttons, tabs, toolbar
  controls, open secondary surfaces, approximate chrome and work-surface ratio
- **Production loop** discovered from transitions, not assumed

## Context budget

No agent holds a whole competitor. Slicing is competitor → surface → state
cluster; leaf agents study one slice and persist immediately; parents read
structured summaries plus evidence references, never raw pages. Synthesis is
map-reduce: leaf → surface summary → competitor summary → cross-competitor
pattern reports.

## Repository layout

```
research/
  README.md                       operating manual, prompt contract, evidence rules
  schema/                         surface / state / transition / manifest JSON Schemas
  competitors/<slug>/
    manifest.yaml                 targets, access track, credit budget, coverage
    surfaces/<surface>/           surface.json, summary.md, states/, transitions.json
    topology/                     routes.mmd, surfaces.mmd, states.mmd
    domain/                       objects.yaml, lifecycles.yaml
    ux/                           patterns.md, disclosure-matrix.md, selection-matrix.md
    business/                     production-loop.md, persistence.md, jobs.md
    evidence/                     committed webp captures ≤ 150 KB, one per fingerprinted state
    raw/                          gitignored full-size captures and DOM dumps
    synthesis.md
  synthesis/                      ≥ 8 cross-competitor pattern reports + pattern matrix
docs/product-intelligence/        PARA decision pack: one file per IA area, each ≤ one context, citing research/
```

Committed evidence is the fingerprinted-state capture, compressed. Raw
captures stay local (`research/**/raw/` is gitignored) and are regenerable.

## Decision rule for PARA

PARA adopts a pattern when at least one holds:

- **A** — three or more mature competitors independently converge on it;
- **B** — one or two use it and PARA's underlying business logic strongly
  supports it;
- **C** — open-source editors or infrastructure supply strong engineering
  evidence.

Otherwise it is marked **EXPERIMENTAL**. "TapNow has it" is not a reason.

## Deliverable gate

Before **Competitive Product Intelligence v1** is delivered, PARA does not
freeze: workspace layout, sidebar or drawer topology, agent panel placement,
inspector contract, canvas node semantics, storyboard / timeline / library
topology, job UI, generation-result lifecycle.

Storage-neutral PARA work (upload, document persistence with the minimal node
schema, asset → canvas) is not blocked.

Coverage targets: core production surfaces ≥ 90 % of reachable surfaces and
states; peripheral ≥ 60 %. "All pages" means all reachable surfaces and states
that touch the core production business.

## Acceptance criteria

1. Each competitor has a surface graph; each core surface has a state graph.
2. Every key transition has captured evidence.
3. Route / Surface / State / Overlay are distinguished throughout.
4. The core production loop, generation lifecycle, agent–workspace
   relationship, post-selection UI, reusable-object scope, and document-vs-
   execution state are each described with tiered evidence.
5. All findings are on disk; no conclusion depends on one agent's context.
6. `research/synthesis/` holds ≥ 8 pattern reports and a filled pattern
   matrix for all six targets.
7. PARA's page topology is rewritten from evidence, and each
   `docs/product-intelligence/*.md` cites the research files it rests on.

## Consequences

Research time increases before UI work resumes; capture volume and
orchestration complexity grow. In return, implementation agents stop inventing
product from a vague PRD, the know-how outlives any model or agent, and later
competitor changes can be diffed against an existing graph (new surface,
changed state, changed loop → PARA impact) instead of re-researched from zero.

The competitor research becomes a maintained **Product Intelligence Layer**,
not a one-off study.
