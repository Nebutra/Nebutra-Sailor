---
name: mermaid-render
description: Official mermaid 11 live preview + Agent SVG (Playwright); themes, samples, export — not a DBML ERD
version: 1.0.0
allowed_tools: []
mcp_servers: []
---

## What this skill does

Official mermaid 11 live preview + Agent SVG (Playwright); themes, samples, export — not a DBML ERD

中文：官方 mermaid 11 live 渲染 + Agent SVG（Playwright）；主题/样本/导出，非 DBML ERD

## When to use

- Human or agent needs **Mermaid Render** (`doc/mermaid-render`).
- Tier: `core` · side-effect: `pure` · meter: `forge.doc.mermaid_render`.

## How to invoke

```http
POST /api/v1/tools/invoke/doc/mermaid-render
Content-Type: application/json

{"input":{"text":"# Hello"}}
```

MCP name: `doc__mermaid-render`

## Engine

- **mermaid+playwright** 11.x
- Upstream: https://github.com/mermaid-js/mermaid

## Composition (next)

Chain these after a successful run when the job continues:

- (none seeded yet)

## Limits

- Prefer pure/deterministic path; do not invent model calls.
- Respect input schema validation errors from invoke.
