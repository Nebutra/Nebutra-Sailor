---
name: gitignore-generator
description: Merge language, framework, OS and editor templates into one sectioned .gitignore. Covers a curated 45-stack subset of github/gitignore, not the full upstream corpus
version: 1.0.0
allowed_tools: []
mcp_servers: []
---

## What this skill does

Merge language, framework, OS and editor templates into one sectioned .gitignore. Covers a curated 45-stack subset of github/gitignore, not the full upstream corpus

中文：按技术栈（语言 / 框架 / 系统 / 编辑器）合并生成 .gitignore，分节标注并去重；模板取自 github/gitignore 的 45 项精选子集，非全量

## When to use

- Human or agent needs **.gitignore Generator** (`template/gitignore-generator`).
- Tier: `core` · side-effect: `pure` · meter: `forge.template.gitignore_generator`.

## How to invoke

```http
POST /api/v1/tools/invoke/template/gitignore-generator
Content-Type: application/json

{"input":{}}
```

MCP name: `template__gitignore-generator`

## Engine

- **gitignore-corpus-merge** curated-2026-07
- Upstream: github/gitignore (CC0-1.0), curated subset

## Composition (next)

Chain these after a successful run when the job continues:

- (none seeded yet)

## Limits

- Prefer pure/deterministic path; do not invent model calls.
- Respect input schema validation errors from invoke.
