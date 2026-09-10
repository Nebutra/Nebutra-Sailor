# Workspace — PARA decision

Last synthesized: 2026-09-08 · Sources: research/synthesis/page-topology-comparison.md,
research/synthesis/frontend-density.md, research/synthesis/progressive-disclosure.md,
research/synthesis/pattern-matrix.md (agent-panel cost from research/synthesis/agent-patterns.md)

Scope: the shell around the canvas — primary surface, drawers vs docked panels, chrome budget, top bar,
view selector, command menu, density at rest. Node/selection/agent/job internals live in their own files.

## Evidence

Evidence paths are relative to `research/competitors/`. Chrome ratios are viewport area at capture.

- Seko · one production route `/infinite-canvas?canvasId=`; lists at `/my-space?tab=`; 资产库/主体库/特效模版 are
  centred modals over the canvas; agent right aside ≈33 %; chrome **0.42** default, **0.12** with the aside closed;
  3 primary buttons at rest; 画布/编辑器 tabs (编辑器 inert) — O · `seko/evidence/canvas.blank.webp`,
  `seko/evidence/canvas.subject-library-modal.webp`, `seko/evidence/myspace.canvas-tab-populated.webp`
- TapNow · `/canvas/<project-uuid>`; Project → many canvases, canvas switcher in the **header**, not the route;
  Library / History are ~330 px left drawers that replace the 48 px dock rail; agent right panel ≈33 %; chrome
  0.42 / ≈0.10 closed (I2 ratios, 1040 px capture); **one** primary at rest (Send), +1 on select (Generate); 0 tabs —
  O · `tapnow/evidence/canvas.default.webp`, `tapnow/evidence/canvas.library.private.webp`,
  `tapnow/evidence/app.workspace.private.webp`
- Flowith · `/conv/<uuid>`; **no agent panel**; bottom composer 60 px collapsed (~180 px with tokens); left dock pill
  60 px; chrome **0.12**, **0.05** minimized; one primary (Send); 0 tabs — O ·
  `flowith/evidence/canvas.welcome.default.webp`, `flowith/evidence/canvas.welcome.minimized.webp`
- Lovart · `/canvas?projectId=`; 图层/生成文件 are 280 px left drawers; agent panel 400 px ≈38 %, collapsible to a
  button; bottom dock of 10 tools; promo banner 48 px + top bar 48 px; chrome **0.45** / **0.22** collapsed — O ·
  `lovart/evidence/canvas.reset.webp`, `lovart/evidence/canvas.agent-collapsed.webp`
- LibTV · `/canvas?spaceId=&projectId=`; 项目 → many 画布 via header switcher; 工作流 ↔ 故事板 toggle over the same
  nodes, **not in the URL**; dock panels + resizable 资产管理 side panel; agent drawer ~420 px optional; chrome
  **0.08** at rest, 0.35 with the agent drawer — O · `libtv/evidence/libtv.canvas.workflow-mode.webp`,
  `libtv/evidence/libtv.canvas.storyboard-mode.webp`, `libtv/evidence/libtv.canvas.canvas-switcher.webp`,
  `libtv/evidence/libtv.canvas.agent-drawer.webp`
- fal · model page with 5 page tabs, no canvas; contributes only "tabs are entity tabs, not a work surface" — O ·
  `fal/evidence/model.schnell.webp`
- Zero-step creation on route visit — O in Seko, Lovart, LibTV, Flowith, TapNow ·
  `seko/evidence/canvas.blank.webp`, `lovart/evidence/scratch.new.webp`, `libtv/evidence/libtv.canvas.new-project.webp`,
  `flowith/evidence/canvas.new.sent-t8.webp`, `tapnow/evidence/app.skill-card.canvas.webp`
- Prompt-first Home reusing the workspace composer — O in all five · `tapnow/evidence/app.home.webp`,
  `lovart/evidence/home.webp`, `flowith/evidence/home.default.webp`, `libtv/evidence/libtv.home.default.webp`,
  `seko/evidence/explore.hero-agent.webp`
- Header height 48–60 px in all five; share entry in the header: Seko, TapNow, Flowith, LibTV — O ·
  `seko/evidence/canvas.share-popover.webp`, `tapnow/evidence/canvas.header.share.webp`,
  `flowith/evidence/canvas.welcome.share-dialog.webp`, `libtv/evidence/libtv.canvas.publish-share.webp`
- Persistent commerce chrome (credits, upsell banner): Seko, LibTV, Lovart, Flowith — O (density.yaml per slug)
- Minimap always on: Seko, TapNow, Lovart, LibTV — O · `lovart/evidence/canvas.reset.webp`
- **Command palette (Cmd/Ctrl+K)**: not observed in any of the six (shortcut *lists* exist: Seko 快捷键, LibTV 快捷键,
  Flowith ⌘0/⌘1) — O-negative · `seko/evidence/canvas.shortcuts-dialog.webp`, `libtv/evidence/libtv.canvas.dock-shortcuts.webp`
- Search entry on the work surface: TapNow dock rail search, Flowith Search Node modal — O ·
  `flowith/evidence/canvas.welcome.search-node.webp`

## Pattern

Converges (≥3): one production route, everything else a list or an overlay (5/5); zero-step create (5/5); prompt-first
Home sharing the composer (5/5); libraries as drawers/modals, never permanent panels (5/5); icon-only rail 48–64 px
with drawers (4/5); left drawer 280–350 px (3); one primary button at rest, +1 on selection (4); zero tabs on the work
surface except views of one document (5); header 48–60 px with title/switcher + share (4); minimap (4).
Work surface ≥ 78 % **until the agent panel opens**, then 0.35–0.45 chrome (4/4 panel products).

Diverges: rail position (left: TapNow, Seko, Flowith · bottom: Lovart, LibTV); one- vs two-level container (project →
canvases only in TapNow, LibTV, and both hide it in a header switcher); drawer push vs overlay (LibTV resizable push;
TapNow replaces the rail; Lovart/Flowith overlay — I1); whether a left drawer and the agent are open together (Seko,
TapNow, Lovart, LibTV layouts allow both at once — I2, not a stated rule). No product has a command palette or a
global jobs indicator.

## PARA decision

1. **One primary surface: the canvas route `/p/:projectId/w/:workspaceId` is the only production route; Home,
   Projects, Library are lists or overlays.** — **A** (Seko, TapNow, Flowith, Lovart, LibTV).
2. **Project → workspaces as a route segment** — **B** (TapNow, LibTV + PARA project logic). Both supporters hide the
   second level in a header switcher, so PARA adds a **workspace switcher in the top bar** (A: TapNow, LibTV, Flowith
   title switcher) and keeps the path for deep links.
3. **Zero-step create**: `/p/:id/w/new` creates a workspace and redirects; no name dialog — **A** (all five).
4. **Drawers, not docked panels.** Library is a left drawer 280–320 px, closed by default — **A** (TapNow, Lovart,
   Flowith widths; all five for "never permanent"). Push vs overlay is **EXPERIMENTAL**; keep design.md's inline
   (push) form as the tie-breaker choice.
5. **Chrome budget ≤ 25 % at first paint** — **B** (Flowith 0.12, LibTV 0.08, TapNow ≈0.10, Seko 0.12 achieve it —
   *only with the agent closed*). What this means for defaults: no persistent right panel; agent = composer height at
   rest (AC-03); no minimap, no commerce chrome, no promo banner in the at-rest layer; Library and Jobs closed.
   When the agent expands it may take the same ~33 % area budget the field uses, so M2 measurements are comparable.
6. **Top bar 44–48 px, one visual level**: brand/back · project › workspace switcher · view selector · share · jobs
   indicator · profile — **A** for height, switcher and share (Seko, TapNow, Flowith, LibTV). The jobs indicator is
   **EXPERIMENTAL** (see jobs.md). Search: **B** (TapNow, Flowith) — satisfied by the command menu, no separate box.
7. **View selector**: `canvas | storyboard` as two views over the same document — **B** (LibTV 工作流↔故事板 O; Seko
   编辑器 I2). `timeline` and `viewer` — **EXPERIMENTAL** (no working timeline observed anywhere). Encoding the view in
   `?view=` has no supporter (LibTV toggles without URL change) but no contradiction; keep as a deep-link convenience,
   tagged **EXPERIMENTAL**.
8. **Command menu (Cmd/Ctrl+K)** — **EXPERIMENTAL** (0/6 observed). Keep AC-08 as a PARA navigation guarantee, not
   an evidence-backed pattern; it must never be the *only* path to any surface.
9. **Bottom dock (Assets · Ask PARA… · settings)**: icon-only rail + drawers — **A** in form (TapNow, Seko, Flowith,
   LibTV); bottom *position* — **EXPERIMENTAL** (Lovart, LibTV bottom vs three left). "Ask PARA…" send is the single
   primary at rest; top-bar `+` is secondary — **A** (TapNow, Flowith, Lovart, fal).
10. **Density at rest**: no node-specific UI without a selection — **A** (TapNow, Seko, Lovart, Flowith); empty
    workspace shows quick-start chips inside the composer/drop zone, never a panel — **A** (Seko, LibTV, Lovart,
    TapNow, fal).
11. **Prompt-first Home** shares the workspace composer component; a Home prompt creates a workspace and its first
    node — **A** (TapNow, Lovart, Flowith, LibTV, Seko).
12. **Persistent commerce chrome — deliberately not adopted** although A-supported (Seko, LibTV, Lovart, Flowith): it
    is the largest chrome contributor in three products. Credits live in the profile menu and on the cost line.
13. **"At most one secondary surface open"** — **EXPERIMENTAL**. No competitor enforces it; four lay out a left
    drawer beside an open agent (I2). Keep it for M1 (evidence allows it; tie-breaker favours it), but M2 must allow
    Library + Agent together because the drawer → canvas → composer-chip flow needs both.
14. **Minimap, auto-layout** — **A**, post-M1, toggleable (Seko, TapNow, Lovart, LibTV).

## What this changes in the current PRD/shell

- **Keep**: routes; top bar 44–48 px; Library drawer 280–320 px closed by default; bottom dock; composer as the
  single primary; AC-01, AC-03, AC-05, AC-06, AC-07; storyboard placeholder view.
- **Change**: add a project › workspace **switcher** to the top bar (decision 2); add `/p/:id/w/new` zero-step
  create and drop any "New workspace" dialog (3); `ActiveDrawer` loses `"inspector"` (see selection.md) and the
  one-open rule becomes a M1-only constraint (13); the jobs indicator is retained but labelled experimental in the
  design doc (6); view selector shows `canvas · storyboard` enabled, `timeline · viewer` hidden behind a labs flag (7).
- **Remove**: nothing from the shell; the Inspector drawer removal is recorded in selection.md.
- **Defer**: minimap and auto-layout (post-M1); timeline/viewer views; drawer push-vs-overlay choice.

## Open questions

- U · Does a command palette help a canvas product at all? Closing experiment: M2 telemetry on Cmd+K opens vs dock
  clicks over two weeks; if < 5 % of navigations, demote to shortcut list only.
- U · Left rail vs bottom dock. Closing: A/B in M2 with real users; measure time-to-first-generation.
- U · Drawer push vs overlay with a live agent. Closing: LibTV authenticated run with 资产管理 + agent drawer open,
  and Lovart 图层 + agent — record whether the canvas re-centres.
- U · Is the TapNow active canvas URL-addressable (affects whether PARA's path-based workspace is an outlier)? Closing:
  TapNow authenticated run, switch canvases, read the URL.
- U · Whether a `?view=` in the URL harms LibTV-style quick toggling. Closing: PARA storyboard prototype in M2.
