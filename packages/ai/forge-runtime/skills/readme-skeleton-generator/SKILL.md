---
name: readme-skeleton-generator
description: "Assemble a project README.md from the sections you tick: GitHub-accurate TOC anchors, shields.io badges, language-tagged code fences, and never an empty header for a section you left off"
version: 1.0.0
allowed_tools: []
mcp_servers: []
---

## What this skill does

Assemble a project README.md from the sections you tick: GitHub-accurate TOC anchors, shields.io badges, language-tagged code fences, and never an empty header for a section you left off

中文：按勾选的章节生成项目 README.md 骨架：GitHub 锚点目录、shields.io 徽章、带语言标记的代码块；未填写的章节不会留下空标题

## When to use

- Human or agent needs **README Skeleton Generator** (`dev/readme-skeleton-generator`).
- Tier: `core` · side-effect: `pure` · meter: `forge.dev.readme_skeleton_generator`.

## How to invoke

```http
POST /api/v1/tools/invoke/dev/readme-skeleton-generator
Content-Type: application/json

{"input":{"text":"example"}}
```

MCP name: `dev__readme-skeleton-generator`

## Engine

- **GitHub Flavored Markdown + shields.io badge grammar** gfm-0.29
- Upstream: GFM spec 0.29-gfm + GitHub alerts extension + shields.io URL grammar + SPDX ids

## Composition (next)

Chain these after a successful run when the job continues:

- (none seeded yet)

## Limits

- Prefer pure/deterministic path; do not invent model calls.
- Respect input schema validation errors from invoke.
