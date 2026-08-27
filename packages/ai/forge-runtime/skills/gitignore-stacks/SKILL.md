---
name: gitignore-stacks
description: Search the 45 available .gitignore template ids by name, alias, scope or kind
version: 1.0.0
allowed_tools: []
mcp_servers: []
---

## What this skill does

Search the 45 available .gitignore template ids by name, alias, scope or kind

中文：检索可用的 .gitignore 模板 id（语言 / 框架 / 系统 / 编辑器），共 45 项，供补全与 Agent 调用

## When to use

- Human or agent needs **.gitignore Stack List** (`template/gitignore-stacks`).
- Tier: `core` · side-effect: `pure` · meter: `forge.template.gitignore_stacks`.

## How to invoke

```http
POST /api/v1/tools/invoke/template/gitignore-stacks
Content-Type: application/json

{"input":{}}
```

MCP name: `template__gitignore-stacks`

## Engine

- **gitignore-corpus-index** curated-2026-07
- Upstream: github/gitignore (CC0-1.0), curated subset

## Composition (next)

Chain these after a successful run when the job continues:

- (none seeded yet)

## Limits

- Prefer pure/deterministic path; do not invent model calls.
- Respect input schema validation errors from invoke.
