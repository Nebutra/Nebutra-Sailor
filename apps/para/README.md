# @nebutra/para

PARA — a quiet, progressive-disclosure creative workspace. `para.nebutra.com`.

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

- One Primary Surface (canvas). Library / Agent / Jobs are contextual.
- At most one secondary surface open in M1 (EXPERIMENTAL). No inspector drawer: node config is anchored under the
  selected node, the floating toolbar sits above it, and the selection becomes a chip in the agent composer.
- Node = generator state + result. Any derivation creates a placeholder child node linked by a `derived` edge; the
  source is never overwritten. Job = node; the top-bar jobs indicator is a redundant mirror (EXPERIMENTAL).
- Every entry point is reachable through `Cmd/Ctrl+K`.

State ownership: URL → Next router · remote data → TanStack Query (mock adapters) ·
workspace document → `stores/editor-store` (zustand) · UI → `stores/ui-store` · jobs → `stores/jobs-store`.


## Gateway mode (M3)

Set `NEXT_PUBLIC_PARA_API_URL` (e.g. `http://localhost:3002`) to replace the mock adapters with
`backends/gateway` `/api/v1/para`: projects, workspaces, embedded document with `If-Match` autosave,
assets, and jobs through the origin task envelope (`/api/v1/tasks`) with SSE progress. The browser
needs a gateway session (same Better Auth cookie apps/web uses). Unset, the shell runs standalone on mock data.
Migration: `pnpm --filter @nebutra/db db:migrate` (adds `para_projects`, `para_workspaces`, `para_assets` with RLS).
