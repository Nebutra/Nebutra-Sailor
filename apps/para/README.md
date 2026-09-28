# @nebutra/para

PARA — a quiet, progressive-disclosure creative workspace.

**Status: labs / wip / experimental — Exploration, not Architecture.** Per the
[product intelligence phase](../../docs/architecture/2026-09-08-product-intelligence-phase.md), no
layout, drawer, inspector, or node-semantics decision here is frozen until its file in
`docs/product-intelligence/` exists and cites `research/` evidence. Milestone 1 is a product shell on mock data:
Home, Projects, and a Workspace with a canvas skeleton, contextual drawers, and a command menu.
No backend, no auth, no real generation.

```bash
pnpm --filter @nebutra/para dev      # http://localhost:3110
pnpm --filter @nebutra/para typecheck
pnpm --filter @nebutra/para build
```

Thesis: **Build the shell first. Hide complexity until the user asks for it.**

- One Primary Surface (canvas). 资产管理 / Agent / 生成历史 are contextual and can be open together.
- No inspector drawer: node config is anchored under the selected node, and the selection becomes a chip in the
  Agent composer.
- Node = generator state + result. Job = node; the top-bar jobs indicator is a redundant mirror (EXPERIMENTAL).
- Every entry point is reachable through `Cmd/Ctrl+K`.

Canvas (owner decision 2026-09-28, 守正再创新 — reproduce LibTV's canvas first, Chinese UI): a floating top bar
(PARA menu · 工作区 · 画布 switcher · 工作流/故事板 · sync pill · 分享 · 开通会员 · credits · Agent), a floating dock
(添加节点 · 选择/抓手 · 生成历史 · 快捷键 · 帮助) and 资产管理 + zoom bottom-left. Nodes carry a type label above the
frame and `+` ports; the right port adds or wires a downstream node, and a wired image reaches a video job as
`references: [{ kind: "node", id, url }]` (its first frame). Templates: `?template=story-script | character-sheet |
frame-to-video | text-to-video` builds the graph once into an empty canvas (`domain/templates.ts`). Models come from
`modelsFor(mode)` in `domain/models.ts` — the one seam the live registry replaces. Golden screens:
`docs/golden-screens/canvas-*.png` (mock mode, 1440×900).

App shell (LibTV's information architecture): `src/app/(shell)/` wraps Home, Projects, Assets, a
project's overview and Plans in a left rail (New project, Agent, Home / Projects / Assets, PARA Pro,
version) and an account bar. Home: New canvas hero → Image / Script tool tiles (`?seed=image|text`
opens the canvas with one empty generator node, prompt focused) → Recent projects → Your work. The
workspace canvas route stays full-screen.

State ownership: URL → Next router · remote data → TanStack Query (mock adapters) ·
workspace document → `stores/editor-store` (zustand) · UI → `stores/ui-store` · jobs → `stores/jobs-store`.


## Gateway mode (M3)

Set `NEXT_PUBLIC_PARA_API_URL` (e.g. `http://localhost:3002`) to replace the mock adapters with
`backends/gateway` `/api/v1/para`: projects, workspaces, embedded document with `If-Match` autosave,
assets, and jobs through the origin task envelope (`/api/v1/tasks`) with SSE progress. The browser
needs a gateway session (same Better Auth cookie apps/web uses). Unset, the shell runs standalone on mock data.
Migration: `pnpm --filter @nebutra/db db:migrate` (adds `para_projects`, `para_workspaces`, `para_assets` with RLS).
