# Page topology comparison — route / surface / state shape

Synthesized 2026-09-08 from the six `research/competitors/<slug>/synthesis.md` files plus `topology/routes.mmd`,
`business/persistence.md`. Tiers: **O** observed · **I2** strongly inferred · **I1** weak · **U** unknown. Only O and
I2 are cited as facts. Evidence paths are `research/competitors/<slug>/evidence/<id>.webp`.

## Evidence

### Per-competitor shape

| | Container hierarchy (route) | Work surface route | What the URL carries | Secondary surfaces | Tier |
|---|---|---|---|---|---|
| **Seko** | account → 画布 \| 故事 \| 数字人 (flat lists in `/my-space?tab=`) | `/infinite-canvas?canvasId=…` | canvasId · **selected node** (`&nodeId=`) · list tab (`?tab=`) | 资产库 / 主体库 / 特效模版 = centred modals over canvas; agent = right aside; `/characters`, `/skill-community`, `/avatar-video` are pages | O — `seko/evidence/canvas.blank.webp`, `myspace.canvas-tab-populated.webp`, `canvas.subject-library-modal.webp` |
| **TapNow** | Team \| Private → Collection → **Project** → many Canvases | `/canvas/<project-uuid>` | project id only; canvas switcher in header (canvas id in URL: U) | Library / History = left drawers that replace the dock rail; agent = right panel; Settings = modal; Image Editor = fullscreen overlay | O — `tapnow/evidence/app.workspace.private.webp`, `canvas.default.webp`, `canvas.library.private.webp` |
| **Flowith** | account → **Flow** (`/flows`); "Project" sidebar group exists, relation U | `/conv/<uuid>` | flow id only; viewport zoom persisted server-side, not in URL | Knowledge Garden / Search Node / Settings / Upgrade = modals with no route; Media History = drawer; `/gallery`, `/community` are pages | O — `flowith/evidence/canvas.welcome.default.webp`, `library.default.webp`, `canvas.welcome.knowledge-dock.webp` |
| **Lovart** | account → **Project** (= one tldraw canvas + threads + files) | `/canvas?projectId=<id>` (locale-less; shell routes are `/zh/*`) | project id only; camera, selection, sub-mode restored from client storage | 图层 / 生成文件 = 280 px left drawers; 画布历史 = full-screen; agent = right panel; paywall = modal; project cards `window.open` a **new tab** | O — `lovart/evidence/scratch.new.webp`, `projects.list.webp`, `canvas.float-layer-button.webp` |
| **LibTV** | team space → **项目** → many 画布; liblib.art has no project object | `/canvas?spaceId=&projectId=` | space + project ids; template clone via `sourceSpaceId`+`sourceProjectUuid` (consumed once); **view mode 工作流↔故事板 not in URL** | 资产管理 = resizable side panel; 生成历史 / 角色库 / 素材库 / 工具箱 = dock panels; agent = right resizable drawer; `/skill` is a page | O — `libtv/evidence/libtv.canvas.canvas-switcher.webp`, `libtv.canvas.storyboard-mode.webp`, `libtv.canvas.template-virtual-studio.webp` |
| **fal** | account → Model page (one entity, 5 tabs) | `/models/:owner/:model[/:endpoint]` + `/api` `/requests` `/analytics` suffix routes | model id, endpoint variant, `?share=<requestId>`, `?fromOutput=<requestId>` chain | `/sandbox`, `/dashboard/*`, `/assets` are pages; no overlays beyond popovers/alertdialog | O — `fal/evidence/model.schnell.webp`, `model.schnell.share.webp`, `sandbox.webp` |

### Convergences (each names its supporters)

1. **The canvas route is the only production route** — every creation, generation, edit and export happens on one
   surface; other routes are lists, libraries or billing. Seko, TapNow, Flowith, Lovart, LibTV (O, all five).
2. **Zero-step creation**: visiting the route creates and persists the container. Seko (`/infinite-canvas` rewrites to
   `?canvasId=`), Lovart (`/canvas?newProject=true` → `?projectId=`), LibTV (`?newProject=true&createWorkspace=true`),
   Flowith (flow created on first Send from `/blank`), TapNow (skill card click creates "<name> (copy)" project).
   O in all five — `seko/evidence/canvas.blank.webp`, `lovart/evidence/scratch.new.webp`,
   `libtv/evidence/libtv.canvas.new-project.webp`, `flowith/evidence/canvas.new.sent-t8.webp`,
   `tapnow/evidence/app.skill-card.canvas.webp`.
3. **Prompt-first home** that reuses the canvas composer: TapNow `/home`, Lovart `/zh/home`, Flowith `/blank`, LibTV
   `/` (agent composer), Seko `/explore` hero (two modes). O in all five.
4. **Libraries are overlays, not routes**: modal (Seko, Flowith knowledge), drawer (TapNow, Lovart, Flowith media,
   LibTV dock panels). O in all five. Only fal gives the library a page (`/assets`).
5. **Two-level container (project → several canvases)** exists in TapNow and LibTV (O). Seko, Flowith and Lovart are
   one level (canvas *is* the document). Divergent.
6. **Selection or view in the URL**: only Seko puts the selected node in the URL (`&nodeId`, O). LibTV's two views of
   one graph are a toggle with no URL change (O). Nobody else encodes view or selection in the route.
7. **Agent panel is not a route** anywhere; it is a right aside/panel/drawer on the canvas route (Seko, TapNow,
   Lovart, LibTV — O) or the bottom composer of the flow (Flowith — O).

### Unknowns that matter

- TapNow: whether the active canvas inside a project is URL-addressable (U).
- Flowith: what "Project" and "Composer" are (U).
- LibTV / Seko: whether a timeline/editor surface exists as a route (LibTV: no NLE observed, U; Seko 编辑器 tab inert,
  I2 that it activates on composition).

## Pattern

- **Route ≠ surface**: five products expose one work route with 15–30 fingerprinted states each (Seko 30, TapNow 16,
  Lovart 21, LibTV 39 across canvas states). State lives in overlays and selection, not in URLs.
- **Depth**: list → document is the deepest navigation anyone asks the user to do. Two products add one more level
  (project → canvas) and hide it in a header switcher rather than a route segment.
- **Return path**: header back/logo menu to the list (all five); Lovart is the outlier that opens documents in new
  tabs.

## PARA decision

PARA's proposed route is `/p/:projectId/w/:workspaceId?view=canvas|storyboard|timeline|viewer`.

| Element | Rule applied | Supporters | Decision |
|---|---|---|---|
| One production route per workspace; everything else overlay or list | A | Seko, TapNow, Flowith, Lovart, LibTV (O) | **A — adopt.** Matches PRD "One Primary Surface". |
| Zero-step create on route visit | A | Seko, Lovart, LibTV, Flowith, TapNow (O) | **A — adopt**: `/p/:id/w/new` (or equivalent) should create and redirect, no dialog. |
| Project → several workspaces (two-level container in the route) | B | TapNow, LibTV (O) — plus PARA business logic (a project groups storyboard/timeline/canvas work) | **B — adopt**, but note both supporters hide the second level in a header switcher; PARA is the only one that puts it in the path. |
| `?view=` selector over one document | B | LibTV 工作流↔故事板 (O, not in URL); Seko 画布/编辑器 tabs (O, 编辑器 inert — I2) | **B — adopt with caveat**: only LibTV proves two views over one graph; none proves a `timeline` or `viewer` view. `storyboard` is evidenced; `timeline`/`viewer` are **EXPERIMENTAL**. |
| Selection in URL (`&nodeId`) | — | Seko only (O) | **EXPERIMENTAL** — one supporter; PARA has no business logic requiring it in M1. |
| Libraries as drawers/modals, never routes | A | all five (O) | **A — adopt**; PARA's Library drawer is consistent. |
| Prompt-first Home reusing the workspace composer | A | TapNow, Lovart, Flowith, LibTV, Seko (O) | **A — adopt**; PARA Home "prompt/drop zone" is consistent; the composer component should be shared with the workspace. |
| Open documents in a new tab | — | Lovart only (O) | **Not adopted** (one supporter, no PARA logic). |
| Agent as a route | — | none | **Not applicable** — agent is an overlay on the workspace route everywhere (A for overlay placement; see `agent-patterns.md`). |
