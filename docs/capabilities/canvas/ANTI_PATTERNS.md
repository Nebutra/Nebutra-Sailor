# Anti-patterns — `canvas` absorption

Concrete traps hit (or avoided) this round. Read before the next codename.

## 1. License / appearance-patent — clean-room only

The reference product is Apache-2.0 **plus** a corporate-commercial-use clause
**plus** an appearance patent on the free-form canvas interface. Mitigation,
non-negotiable for any `kind: product`:

- **Zero source copied.** `/tmp/imports/<codename>/staging` is read for
  understanding; every delivered line is re-expressed in Sailor idioms.
- **Form diverges by construction.** UI uses Sailor semantic tokens,
  `@nebutra/ui` primitives, `@nebutra/icons`, `AnimateIn` — so the visual
  identity is Sailor's, not the source's (sidesteps the appearance patent).
- If a future source is AGPL/SSPL/territorial → **stop and escalate**, do not
  proceed on a code-port basis.

## 2. SSoT — do not re-PORT what a prior codename already owns

The first matrix drafted `canvas-graph` as a fresh PORT. Investigation showed
`@nebutra/reel` already owned the node/edge/DAG model (~70 %). Re-porting it
would have duplicated a fact across two codenames. Fix: the model is **SKIP**;
only the missing interactive UI is PORT, consuming reel verbatim. Always
audit existing packages before declaring a PORT.

## 3. Concurrent-session reverts — commit scoped, immediately

Mid-refactor, another agent/session ran a tracked-file revert (`git checkout`/
`reset`) that wiped the in-progress edits; only the *untracked* new package
survived. Lesson (matches the multi-session-coordination rule):

- After each green block, **`git add <explicit paths>` + commit at once** —
  never leave finished work uncommitted next to a concurrent writer.
- Never bulk `git add .`; stage only the paths you own (other agents' modified
  files were deliberately left out of every commit here).

## 4. xyflow custom node is intentionally NOT `Card`-wrapped

`NodeGraphCanvas`'s node renderer is a plain token-styled `div`, not the
`Card` pattern. An xyflow node must own its own sizing and the two connection
`Handle`s; a `Card` wrapper would obscure both. This is a correctness
decision, not under-utilization — the rest of the chrome does use the shared
`Button` + `@nebutra/icons` + token theming.

## 5. Heavy DS barrel in unit tests — mock it, don't regress

`@lobehub/ui` exposes only its full barrel (no `./Button` subpath); it
transitively pulls `@emoji-mart` JSON that jsdom can't import. Do **not**
regress to a hand-rolled `<button>` to make tests pass. Production keeps the
real DS `Button`; the mount-only smoke test `vi.mock("@lobehub/ui", …)` with a
minimal stub. Behaviour is covered by the pure adapter suite, not the render test.

## 7. A generic library must not depend on a feature package

First cut put `NodeGraphCanvas` in `@nebutra/ui` importing `@nebutra/reel`
directly — a generic component library depending on a domain feature
(inverted dependency direction). Fix, same pattern as #6:

- Extract the neutral contract: `@nebutra/graph-model` (generic
  `GraphNode`/`GraphEdge`/`Graph` + `hasCycleFrom`/`wouldCreateCycle`).
- `@nebutra/ui` `NodeGraphCanvas` is generic over that contract; domain bits
  (`edgeIdentity`, `makeEdge`, `renderNode`) are **injected props**. ui
  depends on `graph-model`, never on `reel`.
- `@nebutra/reel` types now *extend* the generic ones; `inboundEdges`/
  `hasCycleFrom` delegate to graph-model with unchanged signatures
  (contract preserved).
- The reel binding lives in a new composition package
  `@nebutra/reel-canvas` → depends on `(@nebutra/ui, @nebutra/reel)`.
  Dependency direction is always specific → generic.

`peerDependency` was rejected as the fix: it only adjusts the install graph,
not the inverted *direction* — the generic lib would still "know about" reel.

## 6. Decouple via a neutral lower layer, not sibling imports

`reel` imported `withCanvasLock` from `@nebutra/atelier-canvas` purely for a
generic lock — an accidental cross-feature coupling. Fix: extract
`@nebutra/tenant-store` (neutral, depends on neither); both features depend on
it. Keep a deprecated alias so existing public callers do not break.
